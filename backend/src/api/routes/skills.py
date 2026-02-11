"""
技能管理 API 端点
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from loguru import logger

router = APIRouter(prefix="/skills", tags=["Skills 技能管理"])


@router.get("/", response_model=List[Dict[str, Any]])
async def list_skills():
    """获取所有已加载的技能列表"""
    from src.services.skill_service import skill_service
    try:
        skills = skill_service.get_all_skills_info()
        return skills
    except Exception as e:
        logger.error(f"获取技能列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/match")
async def match_skills(query: str):
    """根据查询文本匹配相关技能（GET 方式，query 参数传入查询文本）"""
    from src.services.skill_service import skill_service
    try:
        matched = skill_service.match_skills(query)
        return {
            "query": query,
            "matched_count": len(matched),
            "skills": [s.to_dict() for s in matched],
        }
    except Exception as e:
        logger.error(f"技能匹配失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{skill_name}")
async def get_skill(skill_name: str):
    """获取单个技能的完整内容"""
    from src.services.skill_service import skill_service
    skill = skill_service.get_skill_by_name(skill_name)
    if not skill:
        raise HTTPException(status_code=404, detail=f"技能 '{skill_name}' 不存在")
    return {
        "name": skill.name,
        "description": skill.description,
        "version": skill.version,
        "triggers": skill.triggers,
        "content": skill.content,
        "path": skill.path,
    }


@router.post("/reload")
async def reload_skills():
    """重新加载技能库（从磁盘重新读取）"""
    from src.services.skill_service import skill_service
    try:
        skill_service._loaded = False
        skill_service.skills = []
        skill_service.load_skills()
        return {
            "message": f"已重新加载 {len(skill_service.skills)} 个技能",
            "count": len(skill_service.skills),
            "skills": [s.name for s in skill_service.skills],
        }
    except Exception as e:
        logger.error(f"重载技能失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
