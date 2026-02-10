"""认证路由"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from src.core.database import get_db
from src.core.deps import get_current_user_required, rate_limit, rate_limit_auth
from src.core.security import (
    refresh_access_token,
    revoke_token,
    get_token_blacklist,
    TokenPair,
)
from src.services.user_service import UserService
from src.services.audit_service import AuditService
from src.models.audit import AuditAction, ResourceType
from src.models.user import User

router = APIRouter()

# 用于获取Bearer Token
security = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """注册请求"""
    email: EmailStr
    password: str
    name: str


class RefreshTokenRequest(BaseModel):
    """Token刷新请求"""
    refresh_token: str


class TokenResponse(BaseModel):
    """Token响应"""
    access_token: str
    refresh_token: str
    token_type: str
    user: dict


class TokenPairResponse(BaseModel):
    """Token对响应"""
    access_token: str
    refresh_token: str
    access_expires_in: int
    refresh_expires_in: int
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """用户信息响应"""
    id: str
    email: str
    name: str
    role: str
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    """用户更新请求"""
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class LogoutRequest(BaseModel):
    """登出请求（可选）"""
    all_devices: bool = False  # 是否登出所有设备


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_request: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit_auth),
):
    """
    用户登录
    
    限流：10次/分钟
    """
    service = UserService(db)
    result = await service.login(login_request.email, login_request.password)
    
    # 记录审计日志
    audit_service = AuditService(db)
    
    if not result:
        # 记录登录失败
        await audit_service.log_from_request(
            request=request,
            action=AuditAction.USER_LOGIN.value,
            resource_type=ResourceType.USER.value,
            status="failed",
            error_message="邮箱或密码错误",
            extra_data={"email": login_request.email},
        )
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 记录登录成功
    await audit_service.log_from_request(
        request=request,
        action=AuditAction.USER_LOGIN.value,
        resource_type=ResourceType.USER.value,
        resource_id=result["user"]["id"],
        extra_data={"email": login_request.email},
    )
    await db.commit()
    
    return result


@router.post("/register", response_model=UserResponse)
async def register(
    request: Request,
    register_request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(limit=5, window=300, endpoint="auth_register")),
):
    """
    用户注册
    
    限流：5次/5分钟
    """
    service = UserService(db)
    audit_service = AuditService(db)
    
    try:
        user = await service.create_user(
            email=register_request.email,
            password=register_request.password,
            name=register_request.name,
        )
        
        # 记录注册成功
        await audit_service.log_from_request(
            request=request,
            action=AuditAction.USER_REGISTER.value,
            resource_type=ResourceType.USER.value,
            resource_id=user.id,
            extra_data={"email": register_request.email, "name": register_request.name},
        )
        await db.commit()
        
        return UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
        )
    except ValueError as e:
        # 记录注册失败
        await audit_service.log_from_request(
            request=request,
            action=AuditAction.USER_REGISTER.value,
            resource_type=ResourceType.USER.value,
            status="failed",
            error_message=str(e),
            extra_data={"email": register_request.email},
        )
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user: User = Depends(get_current_user_required)):
    """获取当前用户信息"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        avatar_url=user.avatar_url,
    )


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_required),
):
    """更新当前用户信息"""
    service = UserService(db)
    updated_user = await service.update_user(
        user_id=user.id,
        name=update.name,
        avatar_url=update.avatar_url
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
        
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        name=updated_user.name,
        role=updated_user.role,
        avatar_url=updated_user.avatar_url,
    )


@router.post("/logout")
async def logout(
    request: Request,
    logout_request: Optional[LogoutRequest] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_required),
):
    """
    用户登出
    
    将当前Token加入黑名单，使其立即失效
    
    可选参数：
    - all_devices: 是否登出所有设备（撤销所有Token）
    """
    if credentials:
        token = credentials.credentials
        
        if logout_request and logout_request.all_devices and user:
            # 撤销用户所有Token
            blacklist = get_token_blacklist()
            await blacklist.revoke_all_user_tokens(user.id)
            message = "已登出所有设备"
        else:
            # 只撤销当前Token
            await revoke_token(token, reason="logout")
            message = "登出成功"
        
        # 记录审计日志
        audit_service = AuditService(db)
        await audit_service.log_from_request(
            request=request,
            action=AuditAction.USER_LOGOUT.value,
            resource_type=ResourceType.USER.value,
            resource_id=user.id if user else None,
            user=user,
            extra_data={
                "all_devices": logout_request.all_devices if logout_request else False,
            }
        )
        await db.commit()
        
        return {"message": message}
    
    return {"message": "登出成功"}


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh_token_endpoint(
    request: Request,
    refresh_request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(limit=30, window=60, endpoint="auth_refresh")),
):
    """
    刷新访问Token
    
    使用refresh_token获取新的access_token和refresh_token对。
    旧的refresh_token会被加入黑名单，只能使用一次。
    
    限流：30次/分钟
    """
    token_pair = await refresh_access_token(refresh_request.refresh_token)
    
    if not token_pair:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="刷新Token无效或已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 记录审计日志
    audit_service = AuditService(db)
    await audit_service.log_from_request(
        request=request,
        action=AuditAction.TOKEN_REFRESH.value,
        resource_type=ResourceType.TOKEN.value,
    )
    await db.commit()
    
    logger.info("Token刷新成功")
    
    return TokenPairResponse(
        access_token=token_pair.access_token,
        refresh_token=token_pair.refresh_token,
        access_expires_in=token_pair.access_expires_in,
        refresh_expires_in=token_pair.refresh_expires_in,
    )


@router.post("/revoke")
async def revoke_token_endpoint(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user_required),
):
    """
    撤销Token
    
    主动撤销当前Token，使其立即失效
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未提供Token"
        )
    
    token = credentials.credentials
    success = await revoke_token(token, reason="user_revoke")
    
    if success:
        # 记录审计日志
        audit_service = AuditService(db)
        await audit_service.log_from_request(
            request=request,
            action=AuditAction.TOKEN_REVOKE.value,
            resource_type=ResourceType.TOKEN.value,
            user=user,
        )
        await db.commit()
        
        return {"message": "Token已撤销"}
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Token撤销失败"
    )
