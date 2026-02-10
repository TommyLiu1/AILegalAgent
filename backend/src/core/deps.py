"""
FastAPI依赖注入
包含认证、授权、权限控制、频率限制等
"""

from enum import Enum
from typing import Optional, List, Callable, Set
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger

from src.core.database import get_db
from src.core.security import (
    verify_token,
    verify_token_with_blacklist,
    get_rate_limiter,
    RateLimitConfig,
)
from src.models.user import User


# HTTP Bearer认证
security = HTTPBearer(auto_error=False)


# ========== 角色枚举 ==========


class UserRole(str, Enum):
    """用户角色"""
    ADMIN = "admin"          # 管理员：完全权限
    LAWYER = "lawyer"        # 律师：案件管理、合同审查等专业权限
    PARALEGAL = "paralegal"  # 律师助理：辅助权限
    CLIENT = "client"        # 客户：基本查看权限
    MEMBER = "member"        # 普通成员（兼容现有角色）
    VIEWER = "viewer"        # 访客：只读权限


# ========== 权限枚举 ==========


class Permission(str, Enum):
    """权限定义"""
    # 案件权限
    READ_CASES = "read:cases"
    WRITE_CASES = "write:cases"
    DELETE_CASES = "delete:cases"
    ASSIGN_CASES = "assign:cases"
    
    # 文档权限
    READ_DOCUMENTS = "read:documents"
    WRITE_DOCUMENTS = "write:documents"
    DELETE_DOCUMENTS = "delete:documents"
    DOWNLOAD_DOCUMENTS = "download:documents"
    
    # 合同权限
    READ_CONTRACTS = "read:contracts"
    WRITE_CONTRACTS = "write:contracts"
    DELETE_CONTRACTS = "delete:contracts"
    REVIEW_CONTRACTS = "review:contracts"
    SIGN_CONTRACTS = "sign:contracts"
    
    # 用户权限
    READ_USERS = "read:users"
    WRITE_USERS = "write:users"
    DELETE_USERS = "delete:users"
    MANAGE_ROLES = "manage:roles"
    
    # 组织权限
    READ_ORGANIZATION = "read:organization"
    WRITE_ORGANIZATION = "write:organization"
    MANAGE_ORGANIZATION = "manage:organization"
    
    # 知识库权限
    READ_KNOWLEDGE = "read:knowledge"
    WRITE_KNOWLEDGE = "write:knowledge"
    DELETE_KNOWLEDGE = "delete:knowledge"
    
    # 对话权限
    USE_CHAT = "use:chat"
    VIEW_ALL_CHATS = "view:all_chats"
    
    # 系统权限
    VIEW_AUDIT_LOGS = "view:audit_logs"
    MANAGE_SYSTEM = "manage:system"
    MANAGE_LLM_CONFIG = "manage:llm_config"
    EXPORT_DATA = "export:data"


# ========== 角色权限映射 ==========


ROLE_PERMISSIONS: dict[str, Set[Permission]] = {
    UserRole.ADMIN.value: {p for p in Permission},  # 管理员拥有所有权限
    
    UserRole.LAWYER.value: {
        # 案件完整权限
        Permission.READ_CASES,
        Permission.WRITE_CASES,
        Permission.DELETE_CASES,
        Permission.ASSIGN_CASES,
        # 文档完整权限
        Permission.READ_DOCUMENTS,
        Permission.WRITE_DOCUMENTS,
        Permission.DELETE_DOCUMENTS,
        Permission.DOWNLOAD_DOCUMENTS,
        # 合同完整权限
        Permission.READ_CONTRACTS,
        Permission.WRITE_CONTRACTS,
        Permission.DELETE_CONTRACTS,
        Permission.REVIEW_CONTRACTS,
        Permission.SIGN_CONTRACTS,
        # 知识库权限
        Permission.READ_KNOWLEDGE,
        Permission.WRITE_KNOWLEDGE,
        # 用户只读
        Permission.READ_USERS,
        Permission.READ_ORGANIZATION,
        # 对话权限
        Permission.USE_CHAT,
        Permission.VIEW_ALL_CHATS,
        # 导出权限
        Permission.EXPORT_DATA,
    },
    
    UserRole.PARALEGAL.value: {
        # 案件读写权限
        Permission.READ_CASES,
        Permission.WRITE_CASES,
        # 文档读写权限
        Permission.READ_DOCUMENTS,
        Permission.WRITE_DOCUMENTS,
        Permission.DOWNLOAD_DOCUMENTS,
        # 合同读取和审查权限
        Permission.READ_CONTRACTS,
        Permission.REVIEW_CONTRACTS,
        # 知识库只读
        Permission.READ_KNOWLEDGE,
        # 用户只读
        Permission.READ_USERS,
        Permission.READ_ORGANIZATION,
        # 对话权限
        Permission.USE_CHAT,
    },
    
    UserRole.CLIENT.value: {
        # 只能查看自己相关的案件和文档
        Permission.READ_CASES,
        Permission.READ_DOCUMENTS,
        Permission.READ_CONTRACTS,
        Permission.DOWNLOAD_DOCUMENTS,
        # 对话权限
        Permission.USE_CHAT,
    },
    
    UserRole.MEMBER.value: {
        # 与律师助理类似
        Permission.READ_CASES,
        Permission.WRITE_CASES,
        Permission.READ_DOCUMENTS,
        Permission.WRITE_DOCUMENTS,
        Permission.DOWNLOAD_DOCUMENTS,
        Permission.READ_CONTRACTS,
        Permission.READ_KNOWLEDGE,
        Permission.USE_CHAT,
    },
    
    UserRole.VIEWER.value: {
        # 只读权限
        Permission.READ_CASES,
        Permission.READ_DOCUMENTS,
        Permission.READ_CONTRACTS,
        Permission.READ_KNOWLEDGE,
    },
}


def get_user_permissions(role: str) -> Set[Permission]:
    """获取角色对应的权限集合"""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: str, permission: Permission) -> bool:
    """检查角色是否拥有指定权限"""
    permissions = get_user_permissions(role)
    return permission in permissions


# ========== 认证依赖 ==========


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    获取当前用户（可选认证）
    """
    # 开发模式下的 Mock 逻辑
    from src.core.config import settings
    if settings.DEV_MODE:
        # 开发模式下，无论是否提供 Token，都尝试返回管理员用户
        result = await db.execute(
            select(User).where(User.email == "admin@example.com")
        )
        dev_user = result.scalar_one_or_none()
        if dev_user:
            return dev_user

    if not credentials:
        return None
    
    token = credentials.credentials
    
    # 使用带黑名单检查的验证（Redis 不可用时降级为无黑名单验证）
    try:
        user_id = await verify_token_with_blacklist(token)
    except Exception:
        logger.warning("Redis不可用，降级为无黑名单Token验证")
        user_id = verify_token(token)
    
    if not user_id:
        return None
    
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    return user


async def get_current_user_required(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    获取当前用户（必须认证）
    """
    # 开发模式下的 Mock 逻辑
    from src.core.config import settings
    if settings.DEV_MODE:
        # 开发模式下，无论是否提供 Token 或 Token 是否有效，都尝试返回管理员用户
        result = await db.execute(
            select(User).where(User.email == "admin@example.com")
        )
        user = result.scalar_one_or_none()
        if user:
            return user

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证信息",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    # 使用带黑名单检查的验证（Redis 不可用时降级）
    try:
        user_id = await verify_token_with_blacklist(token)
    except Exception:
        logger.warning("Redis不可用，降级为无黑名单Token验证")
        user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证Token或Token已失效",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_admin_user(
    user: User = Depends(get_current_user_required),
) -> User:
    """
    获取管理员用户
    """
    if user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return user


# ========== 权限依赖工厂 ==========


def require_permission(*permissions: Permission):
    """
    创建权限检查依赖
    
    可以检查单个或多个权限，用户需要拥有所有指定权限
    
    Example:
        @router.get("/cases")
        async def list_cases(
            user: User = Depends(require_permission(Permission.READ_CASES))
        ):
            ...
            
        @router.delete("/cases/{case_id}")
        async def delete_case(
            case_id: str,
            user: User = Depends(require_permission(
                Permission.READ_CASES, 
                Permission.DELETE_CASES
            ))
        ):
            ...
    """
    async def dependency(
        user: User = Depends(get_current_user_required),
    ) -> User:
        user_permissions = get_user_permissions(user.role)
        
        missing_permissions = []
        for permission in permissions:
            if permission not in user_permissions:
                missing_permissions.append(permission.value)
        
        if missing_permissions:
            logger.warning(
                f"权限不足: user={user.email}, role={user.role}, "
                f"missing={missing_permissions}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足，缺少以下权限: {', '.join(missing_permissions)}",
            )
        
        return user
    
    return dependency


def require_any_permission(*permissions: Permission):
    """
    创建权限检查依赖（满足任一权限即可）
    
    Example:
        @router.get("/cases/{case_id}")
        async def get_case(
            user: User = Depends(require_any_permission(
                Permission.READ_CASES, 
                Permission.WRITE_CASES
            ))
        ):
            ...
    """
    async def dependency(
        user: User = Depends(get_current_user_required),
    ) -> User:
        user_permissions = get_user_permissions(user.role)
        
        for permission in permissions:
            if permission in user_permissions:
                return user
        
        permission_names = [p.value for p in permissions]
        logger.warning(
            f"权限不足: user={user.email}, role={user.role}, "
            f"required_any={permission_names}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"权限不足，需要以下权限之一: {', '.join(permission_names)}",
        )
    
    return dependency


def require_role(*roles: UserRole):
    """
    创建角色检查依赖
    
    Example:
        @router.post("/admin/users")
        async def create_user(
            user: User = Depends(require_role(UserRole.ADMIN))
        ):
            ...
    """
    async def dependency(
        user: User = Depends(get_current_user_required),
    ) -> User:
        role_values = [r.value for r in roles]
        
        if user.role not in role_values:
            logger.warning(
                f"角色不匹配: user={user.email}, current_role={user.role}, "
                f"required_roles={role_values}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要以下角色之一: {', '.join(role_values)}",
            )
        
        return user
    
    return dependency


# ========== 频率限制依赖 ==========


def rate_limit(
    limit: int = RateLimitConfig.API_DEFAULT["limit"],
    window: int = RateLimitConfig.API_DEFAULT["window"],
    endpoint: Optional[str] = None,
    by_user: bool = True,
):
    """
    创建频率限制依赖
    
    Args:
        limit: 限制次数
        window: 时间窗口（秒）
        endpoint: 端点标识（默认使用路由路径）
        by_user: 是否按用户限制（否则按IP）
        
    Example:
        @router.post("/chat")
        async def chat(
            request: Request,
            _: None = Depends(rate_limit(limit=30, window=60, endpoint="chat"))
        ):
            ...
    """
    async def dependency(
        request: Request,
        user: Optional[User] = Depends(get_current_user),
    ) -> None:
        rate_limiter = get_rate_limiter()
        
        # 确定标识符
        if by_user and user:
            identifier = user.id
        else:
            # 使用IP地址
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                identifier = forwarded.split(",")[0].strip()
            else:
                identifier = request.client.host if request.client else "unknown"
        
        # 确定端点
        ep = endpoint or request.url.path
        
        # 检查频率限制
        allowed, current, remaining = await rate_limiter.check_rate_limit(
            identifier=identifier,
            endpoint=ep,
            limit=limit,
            window=window,
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"请求过于频繁，请在{window}秒后重试",
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(window),
                },
            )
        
        # 可以在响应头中添加限流信息（需要在路由中处理）
        request.state.rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": window,
        }
    
    return dependency


# 预定义的限流依赖
rate_limit_default = rate_limit()
rate_limit_auth = rate_limit(
    limit=RateLimitConfig.AUTH_LOGIN["limit"],
    window=RateLimitConfig.AUTH_LOGIN["window"],
    endpoint="auth",
)
rate_limit_chat = rate_limit(
    limit=RateLimitConfig.CHAT["limit"],
    window=RateLimitConfig.CHAT["window"],
    endpoint="chat",
)
rate_limit_search = rate_limit(
    limit=RateLimitConfig.SEARCH["limit"],
    window=RateLimitConfig.SEARCH["window"],
    endpoint="search",
)
rate_limit_upload = rate_limit(
    limit=RateLimitConfig.UPLOAD["limit"],
    window=RateLimitConfig.UPLOAD["window"],
    endpoint="upload",
)


# ========== 组合依赖 ==========


def authenticated_with_permission(*permissions: Permission):
    """
    组合认证和权限检查
    
    Example:
        @router.delete("/cases/{case_id}")
        async def delete_case(
            case_id: str,
            user: User = Depends(authenticated_with_permission(Permission.DELETE_CASES))
        ):
            ...
    """
    return require_permission(*permissions)


def rate_limited_user(
    limit: int = 60,
    window: int = 60,
):
    """
    组合认证和频率限制
    
    返回已认证的用户，同时应用频率限制
    """
    async def dependency(
        request: Request,
        user: User = Depends(get_current_user_required),
    ) -> User:
        rate_limiter = get_rate_limiter()
        
        allowed, _, _ = await rate_limiter.check_rate_limit(
            identifier=user.id,
            endpoint=request.url.path,
            limit=limit,
            window=window,
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"请求过于频繁，请在{window}秒后重试",
            )
        
        return user
    
    return dependency
