"""
尽职调查服务

提供企业信息聚合、风险评估、诉讼查询等功能
"""

import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from loguru import logger

from src.core.config import settings


class DueDiligenceService:
    """尽职调查服务"""
    
    def __init__(self):
        self._workforce = None
    
    @property
    def workforce(self):
        """延迟导入 workforce，避免循环依赖"""
        if self._workforce is None:
            from src.agents.workforce import get_workforce
            self._workforce = get_workforce()
        return self._workforce
    
    async def investigate_company(
        self,
        company_name: str,
        investigation_type: str = "comprehensive",
    ) -> Dict[str, Any]:
        """
        企业综合调查
        
        Args:
            company_name: 企业名称
            investigation_type: 调查类型 (comprehensive/litigation/credit/basic)
        """
        logger.info(f"开始企业调查: {company_name}, 类型: {investigation_type}")
        
        # 根据调查类型确定需要执行的任务
        tasks = []
        
        if investigation_type in ["comprehensive", "basic"]:
            tasks.append(("basic_info", self._get_basic_info(company_name)))
        
        if investigation_type in ["comprehensive", "litigation"]:
            tasks.append(("litigation", self._get_litigation_info(company_name)))
        
        if investigation_type in ["comprehensive", "credit"]:
            tasks.append(("credit", self._get_credit_info(company_name)))
        
        if investigation_type == "comprehensive":
            tasks.append(("risk", self._assess_risks(company_name)))
            tasks.append(("relations", self._get_company_relations(company_name)))
        
        # 并行执行所有任务
        results = {}
        if tasks:
            task_results = await asyncio.gather(
                *[task[1] for task in tasks],
                return_exceptions=True
            )
            
            for (name, _), result in zip(tasks, task_results):
                if isinstance(result, Exception):
                    logger.error(f"任务 {name} 失败: {result}")
                    results[name] = {"error": str(result)}
                else:
                    results[name] = result
        
        # 生成综合报告
        report = await self._generate_report(company_name, results, investigation_type)
        
        return {
            "company_name": company_name,
            "investigation_type": investigation_type,
            "timestamp": datetime.now().isoformat(),
            "results": results,
            "report": report,
        }
    
    async def _get_basic_info(self, company_name: str) -> Dict[str, Any]:
        """获取企业基本信息"""
        # 调用智能体获取信息
        result = await self.workforce.process_task(
            task_description=f"""请查询企业"{company_name}"的基本工商信息，包括：
1. 企业全称和曾用名
2. 统一社会信用代码
3. 法定代表人
4. 注册资本
5. 成立日期
6. 经营范围
7. 注册地址
8. 企业类型
9. 经营状态

请以JSON格式返回结果。""",
            task_type="due_diligence",
            context={"company_name": company_name, "task": "basic_info"}
        )
        
        return self._parse_agent_result(result, {
            "name": company_name,
            "legal_representative": "",
            "registered_capital": "",
            "established_date": "",
            "business_scope": "",
            "address": "",
            "company_type": "",
            "status": "正常",
        })
    
    async def _get_litigation_info(self, company_name: str) -> Dict[str, Any]:
        """获取诉讼信息"""
        result = await self.workforce.process_task(
            task_description=f"""请查询企业"{company_name}"的诉讼和法律纠纷信息，包括：
1. 作为原告的案件数量和类型
2. 作为被告的案件数量和类型
3. 重大诉讼案件摘要
4. 执行案件信息
5. 失信被执行人记录

请以JSON格式返回，包含 plaintiff_cases, defendant_cases, major_cases, execution_cases, dishonest_records 字段。""",
            task_type="due_diligence",
            context={"company_name": company_name, "task": "litigation"}
        )
        
        return self._parse_agent_result(result, {
            "plaintiff_cases": 0,
            "defendant_cases": 0,
            "major_cases": [],
            "execution_cases": 0,
            "dishonest_records": 0,
            "risk_level": "low",
        })
    
    async def _get_credit_info(self, company_name: str) -> Dict[str, Any]:
        """获取信用信息"""
        result = await self.workforce.process_task(
            task_description=f"""请评估企业"{company_name}"的信用状况，包括：
1. 行政处罚记录
2. 税务违规记录
3. 环保处罚记录
4. 经营异常信息
5. 严重违法信息
6. 信用评级建议 (A/B/C/D)

请以JSON格式返回结果。""",
            task_type="due_diligence",
            context={"company_name": company_name, "task": "credit"}
        )
        
        return self._parse_agent_result(result, {
            "administrative_penalties": 0,
            "tax_violations": 0,
            "environmental_penalties": 0,
            "abnormal_operations": 0,
            "serious_violations": 0,
            "credit_rating": "B",
        })
    
    async def _assess_risks(self, company_name: str) -> Dict[str, Any]:
        """风险评估"""
        result = await self.workforce.process_task(
            task_description=f"""请对企业"{company_name}"进行综合法律风险评估：
1. 经营风险 (0-100分)
2. 诉讼风险 (0-100分)
3. 信用风险 (0-100分)
4. 合规风险 (0-100分)
5. 关联风险 (0-100分)
6. 总体风险评级 (low/medium/high/critical)
7. 主要风险点描述
8. 风险防范建议

请以JSON格式返回，包含各项评分和建议。""",
            task_type="risk_assessment",
            context={"company_name": company_name}
        )
        
        return self._parse_agent_result(result, {
            "operation_risk": 30,
            "litigation_risk": 20,
            "credit_risk": 25,
            "compliance_risk": 20,
            "relation_risk": 15,
            "overall_rating": "low",
            "risk_points": [],
            "recommendations": [],
        })
    
    async def _get_company_relations(self, company_name: str) -> Dict[str, Any]:
        """获取企业关联关系"""
        result = await self.workforce.process_task(
            task_description=f"""请分析企业"{company_name}"的关联关系：
1. 股东信息（名称、持股比例、类型）
2. 对外投资（被投资企业、持股比例）
3. 分支机构
4. 主要人员（高管、董事）
5. 实际控制人

请以JSON格式返回，用于构建企业关系图谱。""",
            task_type="due_diligence",
            context={"company_name": company_name, "task": "relations"}
        )
        
        return self._parse_agent_result(result, {
            "shareholders": [],
            "investments": [],
            "branches": [],
            "key_persons": [],
            "actual_controller": None,
        })
    
    async def _generate_report(
        self,
        company_name: str,
        results: Dict[str, Any],
        investigation_type: str,
    ) -> Dict[str, Any]:
        """生成调查报告"""
        # 汇总信息生成报告
        summary_prompt = f"""
基于以下调查结果，为企业"{company_name}"生成尽职调查报告摘要：

调查类型: {investigation_type}
调查结果: {results}

请生成：
1. 企业概况（100字以内）
2. 主要发现（3-5条要点）
3. 风险提示（如有）
4. 建议措施
5. 总体评价

以JSON格式返回。
"""
        
        result = await self.workforce.process_task(
            task_description=summary_prompt,
            task_type="due_diligence",
        )
        
        return self._parse_agent_result(result, {
            "overview": f"关于{company_name}的尽职调查报告",
            "findings": [],
            "risk_alerts": [],
            "recommendations": [],
            "conclusion": "",
        })
    
    def _parse_agent_result(
        self,
        result: Dict,
        default: Dict[str, Any],
    ) -> Dict[str, Any]:
        """解析智能体返回结果"""
        import json
        import re
        
        try:
            final_result = result.get("final_result", {})
            
            if isinstance(final_result, dict):
                return {**default, **final_result}
            
            if isinstance(final_result, str):
                # 尝试提取 JSON
                json_match = re.search(r'\{[\s\S]*\}', final_result)
                if json_match:
                    parsed = json.loads(json_match.group())
                    return {**default, **parsed}
            
            return default
            
        except Exception as e:
            logger.warning(f"解析结果失败: {e}")
            return default
    
    def build_company_graph(
        self,
        company_name: str,
        relations: Dict[str, Any],
    ) -> Dict[str, Any]:
        """构建企业关系图谱"""
        nodes = []
        edges = []
        
        # 中心节点（目标企业）
        nodes.append({
            "id": "center",
            "name": company_name,
            "type": "target",
            "level": 0,
        })
        
        # 股东节点
        for i, shareholder in enumerate(relations.get("shareholders", [])):
            node_id = f"shareholder_{i}"
            nodes.append({
                "id": node_id,
                "name": shareholder.get("name", f"股东{i+1}"),
                "type": "shareholder",
                "level": 1,
            })
            edges.append({
                "source": node_id,
                "target": "center",
                "relation": "股东",
                "label": shareholder.get("ratio", ""),
            })
        
        # 投资节点
        for i, investment in enumerate(relations.get("investments", [])):
            node_id = f"investment_{i}"
            nodes.append({
                "id": node_id,
                "name": investment.get("name", f"被投资企业{i+1}"),
                "type": "investment",
                "level": 1,
            })
            edges.append({
                "source": "center",
                "target": node_id,
                "relation": "投资",
                "label": investment.get("ratio", ""),
            })
        
        # 关键人员节点
        for i, person in enumerate(relations.get("key_persons", [])):
            node_id = f"person_{i}"
            nodes.append({
                "id": node_id,
                "name": person.get("name", f"高管{i+1}"),
                "type": "person",
                "level": 1,
            })
            edges.append({
                "source": node_id,
                "target": "center",
                "relation": person.get("position", "高管"),
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "center": company_name,
        }


# 模拟企业数据（用于演示）
MOCK_COMPANY_DATA = {
    "阿里巴巴": {
        "basic_info": {
            "name": "阿里巴巴集团控股有限公司",
            "legal_representative": "蔡崇信",
            "registered_capital": "约7500亿美元市值",
            "established_date": "1999-09-09",
            "business_scope": "电子商务、云计算、数字媒体、创新业务",
            "address": "中国杭州",
            "company_type": "外商投资企业",
            "status": "正常",
        },
        "risk": {
            "operation_risk": 25,
            "litigation_risk": 35,
            "credit_risk": 20,
            "compliance_risk": 30,
            "relation_risk": 25,
            "overall_rating": "medium",
            "risk_points": ["反垄断合规风险", "跨境监管风险"],
        }
    },
    "腾讯": {
        "basic_info": {
            "name": "腾讯控股有限公司",
            "legal_representative": "马化腾",
            "registered_capital": "约4万亿港元市值",
            "established_date": "1998-11-11",
            "business_scope": "社交网络、数字内容、金融科技、企业服务",
            "address": "中国深圳",
            "company_type": "外商投资企业",
            "status": "正常",
        },
        "risk": {
            "operation_risk": 20,
            "litigation_risk": 30,
            "credit_risk": 15,
            "compliance_risk": 35,
            "relation_risk": 20,
            "overall_rating": "low",
        }
    }
}


async def get_mock_company_info(company_name: str) -> Dict[str, Any]:
    """获取模拟企业信息（用于演示）"""
    if company_name in MOCK_COMPANY_DATA:
        return MOCK_COMPANY_DATA[company_name]
    
    # 生成随机模拟数据
    import random
    return {
        "basic_info": {
            "name": company_name,
            "legal_representative": "张三",
            "registered_capital": f"{random.randint(100, 10000)}万元",
            "established_date": f"{random.randint(2000, 2023)}-01-01",
            "business_scope": "技术服务、软件开发",
            "address": "北京市朝阳区",
            "company_type": "有限责任公司",
            "status": "正常",
        },
        "litigation": {
            "plaintiff_cases": random.randint(0, 10),
            "defendant_cases": random.randint(0, 15),
            "execution_cases": random.randint(0, 5),
        },
        "risk": {
            "operation_risk": random.randint(10, 50),
            "litigation_risk": random.randint(10, 60),
            "credit_risk": random.randint(10, 40),
            "compliance_risk": random.randint(10, 50),
            "overall_rating": random.choice(["low", "medium", "high"]),
        }
    }


# 创建全局实例
due_diligence_service = DueDiligenceService()
