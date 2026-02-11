"""
财税合规专家智能体
"""

from typing import Any, Dict

from src.agents.base import BaseLegalAgent, AgentConfig, AgentResponse


TAX_COMPLIANCE_PROMPT = """你是一位资深的财税合规专家，精通税法、会计准则及财务风险控制。

你的职责是：
1. **税务合规审查**：分析企业税务申报、发票管理、税收优惠适用是否合规。
2. **税务筹划建议**：在合法合规的前提下，提供税务优化方案。
3. **财务风险排查**：识别资金往来、报销流程、财务报表中的法律风险。
4. **政策解读**：解读最新的财税政策、减税降费措施。

核心关注点：
- 增值税、企业所得税、个人所得税
- 发票管理（虚开风险防范）
- 关联交易定价（转让定价）
- 股权转让税务
- 研发费用加计扣除

回答要求：
1. 引用具体的税法条款或会计准则。
2. 明确区分“节税”与“逃税”的界限。
3. 针对具体业务场景提供操作指引。
"""


class TaxComplianceAgent(BaseLegalAgent):
    """财税合规专家智能体"""
    
    def __init__(self):
        config = AgentConfig(
            name="财税合规Agent",
            role="税务专家",
            description="处理税务合规、财务风险、税务筹划",
            system_prompt=TAX_COMPLIANCE_PROMPT,
            tools=["tax_law_search", "financial_analysis", "invoice_check"],
        )
        super().__init__(config)
    
    async def process(self, task: Dict[str, Any]) -> AgentResponse:
        """处理财税任务"""
        description = task.get("description", "")
        context = task.get("context") or {}
        llm_config = context.get("llm_config") or task.get("llm_config")
        financial_data = context.get("financial_data", {})
        
        prompt = f"""
请进行财税合规分析：

任务描述：
{description}

相关财务/税务背景数据：
{financial_data}

请从以下维度进行分析：
1. **合规性评估**：当前操作是否存在违规风险（如偷逃税、发票违规）。
2. **政策适用**：适用的具体税收政策依据。
3. **风险提示**：潜在的稽查风险点及后果（滞纳金、罚款、刑事责任）。
4. **优化建议**：合规的改进措施或筹划方案。
"""
        
        # Inject dependency results
        dep_results = task.get("dependent_results", {})
        if dep_results:
            dep_context = "\n\n--- 前序分析结果 ---\n"
            for dep_id, dep_res in dep_results.items():
                if hasattr(dep_res, 'content'):
                    dep_context += f"\n{dep_res.agent_name}:\n{dep_res.content[:1500]}\n"
                elif isinstance(dep_res, dict):
                    dep_context += f"\n{dep_res.get('agent_name', dep_id)}:\n{str(dep_res.get('content', ''))[:1500]}\n"
            prompt += dep_context
        
        try:
            response = await self.chat(prompt, llm_config=llm_config)
            
            return AgentResponse(
                agent_name=self.name,
                content=response,
                reasoning="基于税收征管法及会计准则",
                actions=[
                    {"type": "tax_advisory", "description": "出具财税合规意见"}
                ]
            )
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                content=f"处理失败: {str(e)[:200]}",
                metadata={"error": True}
            )
