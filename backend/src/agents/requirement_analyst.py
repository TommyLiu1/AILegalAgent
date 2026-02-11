"""
需求分析引导智能体 (Requirement Analyst Agent)

职责：
1. 分析用户输入的完整度（主体、诉求、背景、文件是否齐全）
2. 输出结构化需求摘要
3. 当关键要素缺失时生成引导问题
4. 在 Coordinator 之前运行，确保任务描述充分
"""

from typing import Any, Dict, Optional
from loguru import logger
import json
import re

from src.agents.base import BaseLegalAgent, AgentConfig, AgentResponse


REQUIREMENT_ANALYST_PROMPT = """你是一位专业的法务需求分析师。你的任务是快速分析用户的法律需求输入，
判断需求是否完整，并输出结构化的需求摘要。

### 分析维度
1. **核心诉求**：用户想要解决什么问题？
2. **涉及主体**：谁是当事人？对方是谁？
3. **关键事实**：发生了什么事？时间、地点、金额等关键信息
4. **法律领域**：属于合同法、劳动法、知识产权、公司法、诉讼等哪个领域
5. **期望结果**：用户希望得到什么（咨询意见/文书起草/风险评估/诉讼策略）
6. **附件材料**：是否提供了合同文本、证据材料等

### 输出要求

请严格输出以下 JSON 格式：
{
  "is_complete": true/false,
  "completeness_score": 0.0-1.0,
  "summary": "一句话需求摘要",
  "elements": {
    "core_demand": "核心诉求描述",
    "parties": "涉及主体",
    "key_facts": "关键事实",
    "legal_area": "法律领域",
    "expected_outcome": "期望结果",
    "has_attachments": false
  },
  "missing_elements": ["缺失要素1", "缺失要素2"],
  "guidance_questions": [
    {
      "question": "引导问题",
      "options": ["选项A", "选项B", "选项C"],
      "purpose": "补充什么信息"
    }
  ],
  "suggested_agents": ["legal_advisor", "contract_reviewer"],
  "complexity": "simple" | "moderate" | "complex"
}

注意：
- 如果 completeness_score >= 0.7，设置 is_complete = true，不生成 guidance_questions
- 如果 completeness_score < 0.7，生成 2-3 个引导问题帮助用户补充信息
- guidance_questions 的 options 应该是具体可选的答案，不是开放式问题
- 简单问答（如"什么是不可抗力"）直接标记为 complete，不需要追问
"""


class RequirementAnalystAgent(BaseLegalAgent):
    """需求分析引导智能体"""
    
    def __init__(self):
        config = AgentConfig(
            name="需求分析Agent",
            role="需求分析师",
            description="分析用户输入的完整度，引导用户补充关键信息",
            system_prompt=REQUIREMENT_ANALYST_PROMPT,
            temperature=0.2,
        )
        super().__init__(config)
    
    async def process(self, task: Dict[str, Any]) -> AgentResponse:
        """处理需求分析任务"""
        description = task.get("description", "")
        context = task.get("context", {})
        
        prompt = f"用户输入：{description}"
        
        if context.get("has_attachments"):
            prompt += "\n\n[注意：用户已上传附件文件]"
        
        llm_config = context.get("llm_config") or task.get("llm_config")
        response = await self.chat(prompt, llm_config=llm_config)
        
        parsed = self._parse_json(response)
        
        return AgentResponse(
            agent_name=self.name,
            content=parsed.get("summary", response),
            metadata=parsed,
        )
    
    async def analyze_requirement(
        self,
        user_input: str,
        has_attachments: bool = False,
        llm_config: Any = None,
    ) -> Dict[str, Any]:
        """
        快速分析需求完整度
        
        Returns:
            结构化需求分析结果，包含 is_complete、summary、guidance_questions 等
        """
        prompt = f"用户输入：{user_input}"
        if has_attachments:
            prompt += "\n\n[注意：用户已上传附件文件]"
        
        try:
            response = await self.chat(prompt, llm_config=llm_config)
            result = self._parse_json(response)
            
            # 确保必需字段存在
            if not result:
                return self._fallback_analysis(user_input)
            
            result.setdefault("is_complete", True)
            result.setdefault("completeness_score", 0.8)
            result.setdefault("summary", user_input[:100])
            result.setdefault("missing_elements", [])
            result.setdefault("guidance_questions", [])
            result.setdefault("complexity", "simple")
            result.setdefault("suggested_agents", ["legal_advisor"])
            
            return result
            
        except Exception as e:
            logger.warning(f"需求分析失败: {e}")
            return self._fallback_analysis(user_input)
    
    def _fallback_analysis(self, user_input: str) -> Dict[str, Any]:
        """兜底分析（规则引擎）— 当 LLM 不可用或返回无效结果时使用"""
        # 关键词判断复杂度和推荐 Agent
        complex_keywords = ["起诉", "仲裁", "尽职调查", "并购", "股权"]
        moderate_keywords = ["合同", "审查", "起草", "风险", "协议", "文书"]
        
        complexity = "simple"
        suggested_agents = ["legal_advisor"]
        legal_area = "通用"
        
        if any(kw in user_input for kw in complex_keywords):
            complexity = "complex"
        elif any(kw in user_input for kw in moderate_keywords):
            complexity = "moderate"
        
        # 按关键词推荐具体 Agent
        if any(kw in user_input for kw in ["审查合同", "合同审查", "审核合同", "审查协议"]):
            suggested_agents = ["contract_reviewer", "risk_assessor"]
            legal_area = "合同法"
        elif any(kw in user_input for kw in ["起草", "草拟", "写一份", "拟一份", "文书", "律师函", "方案", "法律意见书"]):
            suggested_agents = ["document_drafter"]
            legal_area = "文书起草"
        elif any(kw in user_input for kw in ["合同", "协议", "条款"]):
            suggested_agents = ["contract_reviewer", "risk_assessor"]
            legal_area = "合同法"
        elif any(kw in user_input for kw in ["起诉", "诉讼", "仲裁", "胜诉", "败诉", "庭审"]):
            suggested_agents = ["litigation_strategist"]
            legal_area = "诉讼"
        elif any(kw in user_input for kw in ["劳动", "员工", "辞退", "入职", "赔偿", "社保", "工伤", "劳动人事", "人事"]):
            suggested_agents = ["labor_compliance"]
            legal_area = "劳动法"
        elif any(kw in user_input for kw in ["尽职调查", "尽调", "背景调查", "查公司", "企业调查"]):
            suggested_agents = ["due_diligence"]
            legal_area = "尽职调查"
        elif any(kw in user_input for kw in ["专利", "商标", "知识产权", "版权", "侵权", "著作权"]):
            suggested_agents = ["ip_specialist"]
            legal_area = "知识产权"
        elif any(kw in user_input for kw in ["税", "发票", "报销", "财务", "股权转让"]):
            suggested_agents = ["tax_compliance"]
            legal_area = "财税"
        elif any(kw in user_input for kw in ["监管", "新规", "政策", "法规解读"]):
            suggested_agents = ["regulatory_monitor"]
            legal_area = "监管合规"
        elif any(kw in user_input for kw in ["证据", "录音", "鉴定", "证据链"]):
            suggested_agents = ["evidence_analyst"]
            legal_area = "证据处理"
        elif any(kw in user_input for kw in ["签约", "签字", "盖章", "电子签"]):
            suggested_agents = ["contract_steward"]
            legal_area = "电子签约"
        elif any(kw in user_input for kw in ["归档", "合同管理", "到期", "履约"]):
            suggested_agents = ["contract_steward"]
            legal_area = "合同管理"
        elif any(kw in user_input for kw in ["风险", "合规", "审查"]):
            suggested_agents = ["risk_assessor", "compliance_officer"]
            legal_area = "合规"
        
        # 兜底模式下，始终标记 is_complete=True 以避免死循环
        # 即使信息不完整，也让 Agent 直接处理并在回复中自然追问
        return {
            "is_complete": True,
            "completeness_score": 0.6,
            "summary": user_input[:100],
            "elements": {
                "core_demand": user_input[:200],
                "parties": "",
                "key_facts": "",
                "legal_area": legal_area,
                "expected_outcome": "",
                "has_attachments": False,
            },
            "missing_elements": [],
            "guidance_questions": [],
            "suggested_agents": suggested_agents,
            "complexity": complexity,
            "natural_followup": (
                "请在回复中自然地向用户询问缺失的关键信息（如合同文本、具体事实等），"
                "同时先基于已知信息给出初步分析和指导。"
            ),
        }
    
    def _parse_json(self, text: str) -> Dict[str, Any]:
        """解析 JSON"""
        if not text:
            return {}
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except (json.JSONDecodeError, TypeError):
                    pass
        return {}
