# -*- coding: utf-8 -*-
"""
全面系统验证脚本 — 检查所有模块导入、业务逻辑、API路由完整性
"""
import sys
import os
import asyncio
import traceback

try:
    sys.stdin.reconfigure(encoding='utf-8')
except AttributeError:
    pass
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# 确保项目根在 path 中
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PASS = 0
FAIL = 0
ERRORS = []

def check(label, func):
    """运行检查并记录结果"""
    global PASS, FAIL, ERRORS
    try:
        result = func()
        if result is True or result is None:
            PASS += 1
            print(f"  ✓ {label}")
        else:
            FAIL += 1
            ERRORS.append(f"{label}: returned {result}")
            print(f"  ✗ {label} => {result}")
    except Exception as e:
        FAIL += 1
        err_msg = f"{label}: {type(e).__name__}: {str(e)[:200]}"
        ERRORS.append(err_msg)
        print(f"  ✗ {label} => {type(e).__name__}: {str(e)[:120]}")

async def async_check(label, coro):
    """运行异步检查"""
    global PASS, FAIL, ERRORS
    try:
        result = await coro
        if result is True or result is None:
            PASS += 1
            print(f"  ✓ {label}")
        else:
            FAIL += 1
            ERRORS.append(f"{label}: returned {result}")
            print(f"  ✗ {label} => {result}")
    except Exception as e:
        FAIL += 1
        err_msg = f"{label}: {type(e).__name__}: {str(e)[:200]}"
        ERRORS.append(err_msg)
        print(f"  ✗ {label} => {type(e).__name__}: {str(e)[:120]}")

# ================================================================
# 1. 模块导入验证
# ================================================================
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("1. 后端模块导入验证")
    print("=" * 60)

    # 1.1 核心 Agents
    print("\n--- 1.1 Agents ---")
    check("BaseLegalAgent", lambda: __import__("src.agents.base", fromlist=["BaseLegalAgent"]) and True)
    check("CoordinatorAgent", lambda: __import__("src.agents.coordinator", fromlist=["CoordinatorAgent"]) and True)
    check("LegalAdvisorAgent", lambda: __import__("src.agents.legal_advisor", fromlist=["LegalAdvisorAgent"]) and True)
    check("ContractReviewAgent", lambda: __import__("src.agents.contract_reviewer", fromlist=["ContractReviewAgent"]) and True)
    check("DocumentDraftAgent", lambda: __import__("src.agents.document_drafter", fromlist=["DocumentDraftAgent"]) and True)
    check("LitigationStrategistAgent", lambda: __import__("src.agents.litigation_strategist", fromlist=["LitigationStrategistAgent"]) and True)
    check("IPSpecialistAgent", lambda: __import__("src.agents.ip_specialist", fromlist=["IPSpecialistAgent"]) and True)
    check("LaborComplianceAgent", lambda: __import__("src.agents.labor_compliance", fromlist=["LaborComplianceAgent"]) and True)
    check("TaxComplianceAgent", lambda: __import__("src.agents.tax_compliance", fromlist=["TaxComplianceAgent"]) and True)
    check("RegulatoryMonitorAgent", lambda: __import__("src.agents.regulatory_monitor", fromlist=["RegulatoryMonitorAgent"]) and True)
    check("DueDiligenceAgent", lambda: __import__("src.agents.due_diligence", fromlist=["DueDiligenceAgent"]) and True)
    check("EvidenceAnalystAgent", lambda: __import__("src.agents.evidence_analyst", fromlist=["EvidenceAnalystAgent"]) and True)
    check("ContractStewardAgent", lambda: __import__("src.agents.contract_steward", fromlist=["ContractStewardAgent"]) and True)
    check("RiskAssessmentAgent", lambda: __import__("src.agents.risk_assessor", fromlist=["RiskAssessmentAgent"]) and True)
    check("ComplianceAgent", lambda: __import__("src.agents.compliance_officer", fromlist=["ComplianceAgent"]) and True)
    check("ConsensusAgent", lambda: __import__("src.agents.consensus_agent", fromlist=["ConsensusAgent"]) and True)
    check("LegalResearchAgent", lambda: __import__("src.agents.legal_researcher", fromlist=["LegalResearchAgent"]) and True)
    check("SentimentAnalysisAgent", lambda: __import__("src.agents.sentiment_agent", fromlist=["SentimentAnalysisAgent"]) and True)
    check("RequirementAnalystAgent", lambda: __import__("src.agents.requirement_analyst", fromlist=["RequirementAnalystAgent"]) and True)
    check("LegalWorkforce", lambda: __import__("src.agents.workforce", fromlist=["LegalWorkforce"]) and True)
    
    # 1.2 核心 Services
    print("\n--- 1.2 Services ---")
    check("skill_service", lambda: __import__("src.services.skill_service", fromlist=["skill_service"]) and True)
    check("mcp_client_service", lambda: __import__("src.services.mcp_client_service", fromlist=["mcp_client_service"]) and True)
    check("event_bus", lambda: __import__("src.services.event_bus", fromlist=["event_bus"]) and True)
    check("rag_service", lambda: __import__("src.services.rag_service", fromlist=["rag_service"]) and True)
    check("vector_store", lambda: __import__("src.services.vector_store", fromlist=["vector_store"]) and True)
    check("graph_service", lambda: __import__("src.services.graph_service", fromlist=["graph_service"]) and True)
    check("pii_service", lambda: __import__("src.services.pii_service", fromlist=["pii_service"]) and True)
    check("episodic_memory_service", lambda: __import__("src.services.episodic_memory_service", fromlist=["episodic_memory"]) and True)
    check("signature_service", lambda: __import__("src.services.signature_service", fromlist=["signature_service"]) and True)
    check("multimodal_service", lambda: __import__("src.services.multimodal_service", fromlist=["multimodal_service"]) and True)
    
    # 1.3 API Routes
    print("\n--- 1.3 API Routes ---")
    check("chat routes", lambda: __import__("src.api.routes.chat", fromlist=["router"]) and True)
    check("skills routes", lambda: __import__("src.api.routes.skills", fromlist=["router"]) and True)
    check("mcp routes", lambda: __import__("src.api.routes.mcp_routes", fromlist=["router"]) and True)
    check("llm routes", lambda: __import__("src.api.routes.llm", fromlist=["router"]) and True)
    check("auth routes", lambda: __import__("src.api.routes.auth", fromlist=["router"]) and True)
    check("cases routes", lambda: __import__("src.api.routes.cases", fromlist=["router"]) and True)
    check("contracts routes", lambda: __import__("src.api.routes.contracts", fromlist=["router"]) and True)
    check("documents routes", lambda: __import__("src.api.routes.documents", fromlist=["router"]) and True)
    check("knowledge routes", lambda: __import__("src.api.routes.knowledge", fromlist=["router"]) and True)
    check("notifications routes", lambda: __import__("src.api.routes.notifications", fromlist=["router"]) and True)
    check("api_router (all)", lambda: __import__("src.api.routes", fromlist=["api_router"]) and True)
    
    # 1.4 Models
    print("\n--- 1.4 Models ---")
    check("mcp_config model", lambda: __import__("src.models.mcp_config", fromlist=["McpServerConfig"]) and True)
    
    # 1.5 Main App
    print("\n--- 1.5 App Entry ---")
    check("main.py app", lambda: __import__("src.api.main", fromlist=["app"]) and True)
    
    # ================================================================
    # 2. 业务逻辑验证
    # ================================================================
    print("\n" + "=" * 60)
    print("2. 业务逻辑验证")
    print("=" * 60)
    
    # 2.1 Coordinator 意图识别
    print("\n--- 2.1 意图识别 (Coordinator) ---")
    from src.agents.coordinator import CoordinatorAgent
    coord = CoordinatorAgent()
    
    intent_tests = {
        "请帮我审查这份合同": "CONTRACT_REVIEW",
        "起草一份劳动合同": "DOCUMENT_DRAFTING",
        "诉讼策略分析": "LITIGATION_STRATEGY",
        "尽职调查": "DUE_DILIGENCE",
        "专利侵权分析": "IP_PROTECTION",
        "员工辞退合规": "LABOR_HR",
        "税务筹划建议": "TAX_FINANCE",
        "监管政策解读": "REGULATORY_MONITORING",
        "证据链分析": "EVIDENCE_PROCESSING",
        "电子签约": "E_SIGNATURE",
        "合同归档": "CONTRACT_MANAGEMENT",
        "法规查询": "REGULATORY_MONITORING",
    }
    
    for query, expected in intent_tests.items():
        result = coord._fast_keyword_intent(query)
        matched = result and result.get("intent") == expected and result.get("confidence", 0) >= 0.8
        check(f"意图[{query[:12]:12s}] -> {expected}", lambda m=matched: m)
    
    # 2.2 FAST_PATH_ROUTES 完整性
    print("\n--- 2.2 FAST_PATH_ROUTES ---")
    from src.agents.coordinator import FAST_PATH_ROUTES
    expected_intents = [
        "QA_CONSULTATION", "CONTRACT_REVIEW", "DUE_DILIGENCE", "DOCUMENT_DRAFTING",
        "LITIGATION_STRATEGY", "IP_PROTECTION", "REGULATORY_MONITORING", "TAX_FINANCE",
        "LABOR_HR", "EVIDENCE_PROCESSING", "E_SIGNATURE", "CONTRACT_MANAGEMENT",
        "POLICY_DISTRIBUTION",
    ]
    for intent in expected_intents:
        check(f"FAST_PATH[{intent}]", lambda i=intent: i in FAST_PATH_ROUTES and len(FAST_PATH_ROUTES[i]) > 0)
    
    # 2.3 Skills 加载验证
    print("\n--- 2.3 Skills 技能库 ---")
    from src.services.skill_service import skill_service
    skill_service._loaded = False
    skill_service.skills = []
    skill_service.load_skills()
    check(f"Skills 加载: {len(skill_service.skills)} 个", lambda: len(skill_service.skills) >= 6)
    
    # 技能匹配验证
    skill_match_tests = [
        ("合同审查", "contract-review"),
        ("尽职调查", "due-diligence"),
        ("劳动争议", "labor-law-compliance"),
        ("税务合规", "tax-compliance"),
    ]
    for query, expected_skill in skill_match_tests:
        matched = skill_service.match_skills(query)
        names = [s.name for s in matched]
        check(f"技能匹配[{query}] -> {expected_skill}", lambda n=names, e=expected_skill: e in n)
    
    # 2.4 Agent process 方法签名验证
    print("\n--- 2.4 Agent process 方法 ---")
    import inspect
    from src.agents.workforce import LegalWorkforce
    
    wf = LegalWorkforce()
    for agent_key, agent_obj in wf.agents.items():
        sig = inspect.signature(agent_obj.process)
        has_task = "task" in sig.parameters
        check(f"Agent[{agent_key}].process(task)", lambda h=has_task: h)
    
    # 2.5 Agent process 返回 AgentResponse 验证（通过代码检查）
    print("\n--- 2.5 Agent chat 方法签名 ---")
    from src.agents.base import BaseLegalAgent
    sig = inspect.signature(BaseLegalAgent.chat)
    params = list(sig.parameters.keys())
    check("chat() 有 llm_config 参数", lambda: "llm_config" in params)
    check("chat() 有 system_prompt_override 参数", lambda: "system_prompt_override" in params)
    check("chat() 有 enable_reflection 参数", lambda: "enable_reflection" in params)
    
    # 2.6 Workforce agents 注册验证
    print("\n--- 2.6 Workforce 注册 ---")
    expected_agents = [
        "legal_advisor", "contract_reviewer", "document_drafter",
        "litigation_strategist", "ip_specialist", "labor_compliance",
        "tax_compliance", "regulatory_monitor", "due_diligence",
        "evidence_analyst", "contract_steward", "risk_assessor",
        "compliance_officer", "legal_researcher", "consensus_manager",
    ]
    for agent_name in expected_agents:
        check(f"Workforce[{agent_name}]", lambda n=agent_name: n in wf.agents)
    
    # 2.7 API 路由完整性
    print("\n--- 2.7 API 路由 ---")
    from src.api.routes import api_router
    all_paths = [r.path for r in api_router.routes]
    expected_paths = ["/chat", "/skills", "/mcp", "/llm", "/auth", "/cases", "/contracts", "/documents", "/knowledge"]
    for path in expected_paths:
        check(f"API路由 {path}", lambda p=path: any(p in rp for rp in all_paths))
    
    # 2.8 _rule_based_intent 兜底
    print("\n--- 2.8 规则引擎兜底 ---")
    fallback_tests = [
        ("审查合同", "CONTRACT_REVIEW"),
        ("起草文件", "DOCUMENT_DRAFTING"),
        ("诉讼问题", "LITIGATION_STRATEGY"),
        ("劳动纠纷", "LABOR_HR"),
        ("随便聊聊", "QA_CONSULTATION"),
    ]
    for query, expected in fallback_tests:
        result = coord._rule_based_intent(query)
        check(f"兜底[{query}] -> {expected}", lambda r=result, e=expected: r.get("intent") == e)
    
    # ================================================================
    # 3. 异步逻辑验证
    # ================================================================
    print("\n" + "=" * 60)
    print("3. 异步逻辑验证")
    print("=" * 60)
    
    async def run_async_tests():
        # 3.1 Coordinator analyze_task
        print("\n--- 3.1 Coordinator.analyze_task ---")
        task = {"description": "请帮我审查一份劳动合同", "context": {}}
        try:
            result = await coord.analyze_task(task)
            plan = result.get("plan", [])
            intent = result.get("intent", "")
            check("analyze_task 返回有效计划", lambda: len(plan) > 0)
            check(f"analyze_task 意图={intent}", lambda i=intent: i == "CONTRACT_REVIEW")
            check("analyze_task 计划有 agent", lambda: plan[0].get("agent") is not None)
        except Exception as e:
            check(f"analyze_task 异常", lambda: False)
            print(f"    Exception: {e}")
        
        # 3.2 RequirementAnalyst fallback
        print("\n--- 3.2 RequirementAnalyst 兜底 ---")
        from src.agents.requirement_analyst import RequirementAnalystAgent
        ra = RequirementAnalystAgent()
        fb = ra._fallback_analysis("我想起草一份劳动合同")
        check("fallback is_complete=True", lambda: fb.get("is_complete") is True)
        check("fallback suggested_agents 非空", lambda: len(fb.get("suggested_agents", [])) > 0)
        check("fallback suggested_agents 包含 document_drafter", lambda: "document_drafter" in fb.get("suggested_agents", []))
        
        # 3.3 Coordinator _fallback_analysis (DAG 兜底)
        print("\n--- 3.3 Coordinator DAG 兜底 ---")
        fb2 = await coord._fallback_analysis("帮我做尽职调查")
        check("DAG兜底 有plan", lambda: len(fb2.get("plan", [])) > 0)
        check("DAG兜底 agent=due_diligence", lambda: fb2["plan"][0]["agent"] == "due_diligence")
        check("DAG兜底 intent=DUE_DILIGENCE", lambda: fb2.get("intent") == "DUE_DILIGENCE")
    
    asyncio.run(run_async_tests())
    
    # ================================================================
    # 最终报告
    # ================================================================
    print("\n" + "=" * 60)
    print(f"验证完成: {PASS} 通过 / {FAIL} 失败 / 共 {PASS + FAIL} 项")
    print("=" * 60)
    
    if ERRORS:
        print("\n失败项详情:")
        for i, err in enumerate(ERRORS, 1):
            print(f"  {i}. {err}")
        sys.exit(1)
    else:
        print("\n所有检查通过！")
        sys.exit(0)
