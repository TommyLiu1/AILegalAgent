"""
A2UI 卡片自动生成器 (Card Generator)

在 Workforce 结果汇总阶段，根据意图类型和 Agent 文本回复，
自动生成结构化 A2UI 卡片组件，打通流式卡片管线的"最后一公里"。

原理：
    1. Coordinator 识别意图 → scene_a2ui_config 推荐卡片类型
    2. Agent 处理任务 → 返回 Markdown 文本回复
    3. **本模块**：解析文本 → 提取关键信息 → 构建 A2UI 组件 JSON
    4. chat.py 流式推送 → 前端 StreamingA2UIRenderer 渲染
"""

import re
from typing import List, Dict, Any, Optional
from loguru import logger

from src.services.a2ui_protocol import (
    risk_indicator,
    detail_list,
    status_card,
    info_banner,
    recommendation_card,
    text_block,
    action_bar,
    progress_steps,
)


# ============================================================
# 通用文本解析辅助
# ============================================================

def _extract_sections(text: str) -> List[Dict[str, str]]:
    """从 Markdown 标题结构中提取章节列表"""
    sections = []
    # 匹配 ## 或 ### 或 **粗体标题** 开头的段落
    pattern = re.compile(r'(?:^#{2,4}\s+(.+)|^\*\*(.+?)\*\*)', re.MULTILINE)
    matches = list(pattern.finditer(text))
    for i, m in enumerate(matches):
        title = m.group(1) or m.group(2)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        # 清理 Markdown 格式
        body = re.sub(r'\*\*(.+?)\*\*', r'\1', body)
        body = body[:300]  # 限制长度
        sections.append({"title": title.strip(), "body": body})
    return sections


def _extract_risk_keywords(text: str) -> Dict[str, Any]:
    """从文本中提取风险相关关键词和评级"""
    text_lower = text.lower()

    # 风险等级推断
    if any(kw in text for kw in ["重大风险", "严重风险", "高风险", "critical"]):
        level, score = "high", 75
    elif any(kw in text for kw in ["中等风险", "一般风险", "medium", "需注意"]):
        level, score = "medium", 50
    elif any(kw in text for kw in ["低风险", "风险较小", "low", "风险可控"]):
        level, score = "low", 25
    else:
        # 默认根据"风险"关键词出现频率
        risk_count = text.count("风险")
        if risk_count >= 5:
            level, score = "high", 70
        elif risk_count >= 2:
            level, score = "medium", 45
        else:
            level, score = "low", 20

    # 提取风险因素
    factors = []
    risk_patterns = [
        (r'(?:风险[点项因素]|注意事项|隐患)[：:]\s*(.+?)(?:\n|$)', "风险因素"),
        (r'(?:\d+[\.、）\)]\s*)(.{4,60}(?:风险|隐患|问题|缺陷|不足|瑕疵|违规).{0,40})', "具体风险"),
    ]
    for pattern, factor_type in risk_patterns:
        for m in re.finditer(pattern, text):
            factors.append({
                "label": m.group(1).strip()[:60],
                "value": factor_type,
            })
            if len(factors) >= 5:
                break
        if len(factors) >= 5:
            break

    return {"level": level, "score": score, "factors": factors}


def _extract_key_points(text: str, max_items: int = 6) -> List[Dict[str, str]]:
    """从文本中提取关键要点列表"""
    items = []

    # 方式 1：匹配编号列表 (1. xxx / 1、xxx / - xxx)
    list_pattern = re.compile(
        r'(?:^|\n)\s*(?:\d+[\.、）\)]\s*|[-•]\s*)(.{5,120})',
        re.MULTILINE,
    )
    for m in list_pattern.finditer(text):
        line = m.group(1).strip()
        # 过滤掉太短或纯格式的行
        if len(line) < 5 or line.startswith("```"):
            continue
        # 清理 Markdown
        line = re.sub(r'\*\*(.+?)\*\*', r'\1', line)
        line = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', line)

        # 尝试拆分为 label: value
        kv_match = re.match(r'^(.{2,20})[：:]\s*(.+)', line)
        if kv_match:
            items.append({"label": kv_match.group(1), "value": kv_match.group(2)[:100]})
        else:
            items.append({"label": line[:60], "value": ""})

        if len(items) >= max_items:
            break

    return items


def _extract_summary(text: str, max_len: int = 150) -> str:
    """提取文本摘要（第一段有效内容）"""
    lines = text.strip().split("\n")
    for line in lines:
        clean = line.strip()
        # 跳过标题行和空行
        if not clean or clean.startswith("#") or clean.startswith("```"):
            continue
        # 跳过纯粗体标题
        if re.match(r'^\*\*[^*]+\*\*$', clean):
            continue
        # 清理 Markdown
        clean = re.sub(r'\*\*(.+?)\*\*', r'\1', clean)
        clean = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', clean)
        return clean[:max_len]
    return text[:max_len]


# ============================================================
# 按意图生成 A2UI 卡片
# ============================================================

def generate_contract_review_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """合同审查 → 风险指标 + 要点列表 + 操作栏"""
    components = []
    risk = _extract_risk_keywords(response_text)

    # 1. 风险指标卡
    components.append(risk_indicator(
        title="合同风险评估",
        score=risk["score"],
        level=risk["level"],
        description=_extract_summary(response_text),
        factors=risk["factors"][:4] if risk["factors"] else [
            {"label": "条款完整性", "value": "已分析"},
            {"label": "权利义务对等性", "value": "已分析"},
            {"label": "违约责任", "value": "已分析"},
        ],
        action={"actionId": "view_full_review", "label": "查看完整审查报告"},
    ))

    # 2. 关键条款列表
    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="关键审查要点",
        ))

    # 3. 操作栏
    components.append(action_bar([
        {"id": "modify", "label": "查看修改建议", "actionId": "show_suggestions",
         "variant": "primary"},
        {"id": "export", "label": "导出审查报告", "actionId": "export_review",
         "variant": "outline"},
    ]))

    return components


def generate_qa_consultation_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """法律咨询 → 要点卡 + 推荐操作"""
    components = []
    points = _extract_key_points(response_text)

    if points:
        components.append(detail_list(
            items=points,
            title="法律分析要点",
        ))

    # 推荐下一步操作
    summary = _extract_summary(response_text)
    components.append(recommendation_card(
        title="下一步建议",
        description=summary,
        tags=[
            {"label": "法律咨询", "color": "blue"},
        ],
        action={"actionId": "deep_analysis", "label": "深入分析"},
        secondary_action={"actionId": "find_lawyer", "label": "推荐律师"},
    ))

    return components


def generate_labor_hr_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """劳动人事 → 风险指标 + 要点列表"""
    components = []
    risk = _extract_risk_keywords(response_text)

    components.append(risk_indicator(
        title="劳动用工风险评估",
        score=risk["score"],
        level=risk["level"],
        description=_extract_summary(response_text),
        factors=risk["factors"][:4] if risk["factors"] else [
            {"label": "合规性", "value": "已分析"},
            {"label": "赔偿风险", "value": "已分析"},
        ],
    ))

    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="劳动法律分析",
        ))

    components.append(action_bar([
        {"id": "template", "label": "相关文书模板", "actionId": "labor_templates",
         "variant": "outline"},
        {"id": "consult", "label": "专业律师咨询", "actionId": "find_lawyer",
         "variant": "primary"},
    ]))

    return components


def generate_litigation_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """诉讼策略 → 进度步骤 + 风险指标"""
    components = []
    risk = _extract_risk_keywords(response_text)

    # 诉讼流程进度
    components.append(progress_steps(
        steps=[
            {"title": "案件评估", "description": "分析胜诉可能性", "status": "completed"},
            {"title": "证据准备", "description": "收集整理关键证据", "status": "current"},
            {"title": "文书起草", "description": "准备起诉状/答辩状", "status": "pending"},
            {"title": "庭审策略", "description": "制定庭审应对方案", "status": "pending"},
        ],
        current_step=1,
        title="诉讼进度规划",
    ))

    components.append(risk_indicator(
        title="诉讼风险评估",
        score=risk["score"],
        level=risk["level"],
        description=_extract_summary(response_text),
        factors=risk["factors"][:4] if risk["factors"] else [
            {"label": "证据充分性", "value": "待评估"},
            {"label": "法律依据", "value": "已分析"},
            {"label": "对方抗辩可能", "value": "待评估"},
        ],
    ))

    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="策略分析要点",
        ))

    return components


def generate_due_diligence_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """尽职调查 → 风险指标 + 调查要点"""
    components = []
    risk = _extract_risk_keywords(response_text)

    components.append(risk_indicator(
        title="尽职调查风险评估",
        score=risk["score"],
        level=risk["level"],
        description=_extract_summary(response_text),
        factors=risk["factors"][:5] if risk["factors"] else [
            {"label": "企业资质", "value": "待核实"},
            {"label": "财务状况", "value": "待核实"},
            {"label": "诉讼记录", "value": "待查询"},
        ],
    ))

    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="调查发现",
        ))

    components.append(action_bar([
        {"id": "full_report", "label": "生成完整报告", "actionId": "generate_dd_report",
         "variant": "primary"},
        {"id": "deep_check", "label": "深度核查", "actionId": "deep_due_diligence",
         "variant": "outline"},
    ]))

    return components


def generate_document_drafting_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """文书起草 → 进度状态 + 操作栏"""
    components = []

    components.append(status_card(
        status="success",
        title="文书起草完成",
        description=_extract_summary(response_text),
        action={"actionId": "open_canvas", "label": "打开编辑器"},
        secondary_action={"actionId": "export_document", "label": "导出文档"},
    ))

    return components


def generate_regulatory_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """监管合规 → 信息横幅 + 要点列表"""
    components = []
    risk = _extract_risk_keywords(response_text)

    variant = "warning" if risk["level"] in ("high", "medium") else "info"
    components.append(info_banner(
        content=_extract_summary(response_text),
        variant=variant,
        action={"actionId": "view_regulation", "label": "查看法规原文"},
    ))

    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="合规要点分析",
        ))

    return components


def generate_ip_protection_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """知识产权 → 风险指标 + 要点列表"""
    components = []
    risk = _extract_risk_keywords(response_text)

    components.append(risk_indicator(
        title="知识产权风险评估",
        score=risk["score"],
        level=risk["level"],
        description=_extract_summary(response_text),
        factors=risk["factors"][:4] if risk["factors"] else [
            {"label": "侵权可能性", "value": "已分析"},
            {"label": "保护措施", "value": "已分析"},
        ],
    ))

    points = _extract_key_points(response_text)
    if points:
        components.append(detail_list(
            items=points,
            title="知识产权分析",
        ))

    return components


def generate_tax_finance_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """税务财务 → 要点列表"""
    components = []
    points = _extract_key_points(response_text, max_items=8)

    if points:
        components.append(detail_list(
            items=points,
            title="税务/财务分析要点",
        ))

    components.append(action_bar([
        {"id": "calc", "label": "税费计算", "actionId": "tax_calculator",
         "variant": "primary"},
        {"id": "consult", "label": "税务专家咨询", "actionId": "find_tax_expert",
         "variant": "outline"},
    ]))

    return components


def generate_evidence_cards(
    response_text: str,
    task_description: str,
) -> List[dict]:
    """证据分析 → 要点列表 + 操作"""
    components = []
    points = _extract_key_points(response_text)

    if points:
        components.append(detail_list(
            items=points,
            title="证据分析结果",
        ))

    return components


# ============================================================
# 统一入口
# ============================================================

# 意图 → 卡片生成函数映射
_INTENT_GENERATORS = {
    "CONTRACT_REVIEW": generate_contract_review_cards,
    "QA_CONSULTATION": generate_qa_consultation_cards,
    "LABOR_HR": generate_labor_hr_cards,
    "LITIGATION_STRATEGY": generate_litigation_cards,
    "DUE_DILIGENCE": generate_due_diligence_cards,
    "DOCUMENT_DRAFTING": generate_document_drafting_cards,
    "REGULATORY_MONITORING": generate_regulatory_cards,
    "IP_PROTECTION": generate_ip_protection_cards,
    "TAX_FINANCE": generate_tax_finance_cards,
    "EVIDENCE_PROCESSING": generate_evidence_cards,
}


def generate_a2ui_components(
    intent: str,
    response_text: str,
    task_description: str,
    response_strategy: str = "chat_only",
) -> List[dict]:
    """
    根据意图和 Agent 回复文本，自动生成 A2UI 卡片组件列表。

    Args:
        intent: Coordinator 识别的意图（如 CONTRACT_REVIEW）
        response_text: Agent 聚合后的文本回复
        task_description: 原始任务描述
        response_strategy: Coordinator 决定的响应策略

    Returns:
        A2UI 组件 dict 列表，可直接用于流式推送
    """
    # 文本太短（回复不充分）不生成卡片
    if not response_text or len(response_text) < 80:
        return []

    # 错误回复不生成卡片
    if response_text.startswith("处理失败") or response_text.startswith("很抱歉"):
        return []

    generator = _INTENT_GENERATORS.get(intent)
    if not generator:
        # 未知意图 → 生成通用要点卡片
        points = _extract_key_points(response_text)
        if points:
            return [detail_list(items=points, title="分析要点")]
        return []

    try:
        components = generator(response_text, task_description)
        if components:
            logger.info(
                f"[A2UI CardGen] 为意图 {intent} 生成了 {len(components)} 个卡片组件"
            )
        return components
    except Exception as e:
        logger.warning(f"[A2UI CardGen] 卡片生成失败 ({intent}): {e}")
        return []
