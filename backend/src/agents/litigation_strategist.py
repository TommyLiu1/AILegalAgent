"""
诉讼策略专家智能体
"""

from typing import Any, Dict

from src.agents.base import BaseLegalAgent, AgentConfig, AgentResponse


LITIGATION_STRATEGIST_PROMPT = """你是一位资深的诉讼策略专家，擅长处理复杂的民商事诉讼和仲裁案件。

你的职责是：
1. 分析案件的事实和证据，评估诉讼风险和胜诉概率。
2. 制定整体的诉讼或仲裁策略（如：进攻性策略、防御性策略、和解策略）。
3. 协助进行证据梳理，指出证据链的强弱项。
4. 预判对方可能采取的抗辩策略，并制定反制措施。
5. 提供庭审准备建议，包括质证要点和发问提纲。

专业领域：
- 民事诉讼程序
- 商事仲裁
- 证据法
- 庭审技巧
- 谈判策略

回答要求：
1. 基于事实和证据进行逻辑严密的推演。
2. 区分事实问题和法律问题。
3. 明确提示诉讼风险点。
4. 策略建议要具有可操作性。
"""


class LitigationStrategistAgent(BaseLegalAgent):
    """诉讼策略专家智能体"""
    
    def __init__(self):
        config = AgentConfig(
            name="诉讼策略Agent",
            role="资深诉讼律师",
            description="制定诉讼策略，评估案件风险，指导证据准备",
            system_prompt=LITIGATION_STRATEGIST_PROMPT,
            tools=["case_search", "law_search", "evidence_analysis"],
        )
        super().__init__(config)
    
    async def process(self, task: Dict[str, Any]) -> AgentResponse:
        """处理诉讼策略任务"""
        description = task.get("description", "")
        context = task.get("context", {})
        llm_config = context.get("llm_config") or task.get("llm_config")
        
        # 兼容：如果有结构化字段则使用，否则用 description
        case_info = task.get("case_info") or context.get("case_info") or ""
        evidence_list = task.get("evidence") or context.get("evidence") or []
        opponent_info = task.get("opponent") or context.get("opponent") or ""
        
        # 注入前序 Agent 的结果
        dep_results = task.get("dependent_results", {})
        dep_context = ""
        if dep_results:
            dep_context = "\n\n--- 前序分析结果 ---\n"
            for dep_id, dep_res in dep_results.items():
                if hasattr(dep_res, 'content'):
                    dep_context += f"\n{dep_res.agent_name}:\n{dep_res.content[:1500]}\n"
                elif isinstance(dep_res, dict):
                    dep_context += f"\n{dep_res.get('agent_name', dep_id)}:\n{str(dep_res.get('content', ''))[:1500]}\n"
        
        prompt = f"""请为以下案件制定诉讼策略：

案件描述：
{description}

{f'案件详情：{case_info}' if case_info else ''}
{f'现有证据：{evidence_list}' if evidence_list else ''}
{f'对方信息：{opponent_info}' if opponent_info else ''}
{dep_context}

请提供以下分析：
1. **案件评估**：核心争议焦点、胜诉概率预估。
2. **证据分析**：现有证据的证明力，还需补充哪些关键证据。
3. **策略建议**：建议采取的整体策略（诉讼、仲裁、调解等）及理由。
4. **风险提示**：最大的败诉风险点及应对预案。
5. **行动计划**：下一阶段的具体行动步骤。
"""
        
        try:
            response = await self.chat(prompt, llm_config=llm_config)
            return AgentResponse(
                agent_name=self.name,
                content=response,
                reasoning="基于案件分析方法论和诉讼实务经验",
                actions=[
                    {"type": "strategy_report", "description": "生成诉讼策略分析报告"}
                ]
            )
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                content=f"诉讼策略分析失败: {str(e)[:200]}",
                metadata={"error": True}
            )
