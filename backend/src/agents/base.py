"""
基础智能体类 (v3 - 弹性并行版)

优化点：
1. 共享 httpx 连接池，消除每次请求重建客户端的开销
2. chat() 支持 system_prompt_override，避免重建 Agent 来切换 Prompt
3. 反思机制改为条件触发（通过 enable_reflection 参数控制）
4. 增加 LLM 调用重试机制（指数退避）
5. Tool Calling 支持并行执行
6. LLM 信号量和连接池参数从 config.py 统一读取，支持弹性扩展
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from loguru import logger
import asyncio
import os
import json
import hashlib
import time

import contextvars

import httpx

from camel.agents import ChatAgent
from camel.messages import BaseMessage
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType

from src.core.config import settings, get_settings
from src.core.llm_helper import get_llm_config_sync

# 任务级 LLM 配置上下文变量（线程安全，用于 DAG 执行时自动传递配置）
_task_llm_config_var: contextvars.ContextVar = contextvars.ContextVar('task_llm_config', default=None)


class AgentConfig(BaseModel):
    """智能体配置"""
    name: str
    role: str
    description: str
    system_prompt: str
    temperature: float = 0.7
    max_tokens: int = 4096
    tools: List[str] = []


class AgentResponse(BaseModel):
    """智能体响应"""
    agent_name: str
    content: str
    reasoning: Optional[str] = None
    citations: List[Dict] = []
    actions: List[Dict] = []
    metadata: Dict = {}


class BaseLegalAgent(ABC):
    """
    法务智能体基类 (v2 性能优化版)
    
    所有法务智能体都继承此类，提供统一的接口和基础功能。
    
    v2 优化：
    - 类级别共享 httpx 连接池，避免每次 chat() 重建连接
    - chat() 新增 system_prompt_override / enable_reflection 参数
    - LLM 调用增加指数退避重试
    - Tool Calling 支持并行执行
    """
    
    # ========== 类级别共享资源 ==========
    _shared_http_client: Optional[httpx.AsyncClient] = None
    _client_lock: asyncio.Lock = asyncio.Lock()
    
    # LLM 调用重试配置
    MAX_RETRIES = 3
    RETRY_BASE_DELAY = 2.0  # 秒（增加基础延迟，给 API 更多恢复时间）
    RETRY_MAX_DELAY = 15.0  # 秒
    
    # DAG 并行执行信号量（限制并发 LLM 请求数，从配置读取）
    _llm_semaphore: asyncio.Semaphore = asyncio.Semaphore(settings.AGENT_LLM_CONCURRENCY)
    
    @classmethod
    async def get_http_client(cls) -> httpx.AsyncClient:
        """获取类级别共享的 httpx 客户端（带连接池）"""
        if cls._shared_http_client is None or cls._shared_http_client.is_closed:
            async with cls._client_lock:
                # 双重检查锁
                if cls._shared_http_client is None or cls._shared_http_client.is_closed:
                    _max_conn = settings.AGENT_HTTP_MAX_CONNECTIONS
                    _keepalive_conn = settings.AGENT_HTTP_KEEPALIVE_CONNECTIONS
                    cls._shared_http_client = httpx.AsyncClient(
                        timeout=httpx.Timeout(
                            120.0,    # 总超时 120s（复杂文档生成需要更长时间）
                            connect=10.0,  # 连接超时 10s
                            read=90.0,     # 读取超时 90s（流式输出需要持续读取）
                            write=30.0,    # 写入超时 30s
                        ),
                        limits=httpx.Limits(
                            max_connections=_max_conn,
                            max_keepalive_connections=_keepalive_conn,
                            keepalive_expiry=60.0,  # 保活 60s
                        ),
                    )
                    logger.info(
                        f"已创建共享 httpx 连接池 "
                        f"(max_conn={_max_conn}, keepalive={_keepalive_conn}, "
                        f"llm_concurrency={settings.AGENT_LLM_CONCURRENCY})"
                    )
        return cls._shared_http_client
    
    @classmethod
    async def close_http_client(cls):
        """关闭共享 httpx 客户端（应用关闭时调用）"""
        if cls._shared_http_client and not cls._shared_http_client.is_closed:
            await cls._shared_http_client.aclose()
            cls._shared_http_client = None
            logger.info("共享 httpx 连接池已关闭")
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.name = config.name
        self.role = config.role
        self.system_prompt = config.system_prompt
        self.client = None
        self.agent = None  # Deprecated camel agent
        self._init_agent()
    
    def _init_agent(self):
        """初始化 LLM 配置（仅获取配置，不创建 httpx 客户端）"""
        try:
            llm_config = get_llm_config_sync("llm")
            self.llm_config = llm_config
            self.model_name = llm_config.model_name
            
            logger.info(
                f"智能体 {self.name} 初始化成功 "
                f"(provider: {llm_config.provider}, model: {llm_config.model_name})"
            )
            
        except Exception as e:
            logger.error(f"智能体 {self.name} 初始化失败: {e}")
            import traceback
            logger.error(traceback.format_exc())
            self.llm_config = None
            self.model_name = None
    
    def _get_platform_type(self, provider: str) -> ModelPlatformType:
        """根据提供商获取CAMEL平台类型 (Unused, 保留兼容)"""
        platform_map = {
            "openai": ModelPlatformType.OPENAI,
            "anthropic": ModelPlatformType.ANTHROPIC,
        }
        return platform_map.get(provider, ModelPlatformType.OPENAI)
    
    def _get_model_type(self, provider: str, model_name: str) -> ModelType:
        """根据提供商和模型名称获取CAMEL模型类型 (Unused, 保留兼容)"""
        return ModelType.GPT_4O
    
    @abstractmethod
    async def process(self, task: Dict[str, Any]) -> AgentResponse:
        """
        处理任务
        
        Args:
            task: 任务信息，可包含 llm_config 用于动态配置
            
        Returns:
            AgentResponse: 处理结果
        """
        pass
    
    def _prepare_llm_request(self, active_config: Any) -> tuple:
        """
        准备 LLM 请求参数（提取公共逻辑）
        
        Returns:
            (url, headers, model_name) 元组
        """
        api_key = getattr(active_config, "api_key", "")
        api_base_url = getattr(active_config, "api_base_url", "")
        model_name = getattr(active_config, "model_name", self.model_name)
        
        # 解密 API Key (如果需要)
        if api_key and not api_key.startswith("sk-") and len(api_key) > 20:
            try:
                from src.services.llm_service import LLMService
                api_key = LLMService.decrypt_api_key(api_key)
            except Exception:
                pass
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        base_url = api_base_url.rstrip("/")
        if not base_url.endswith("/chat/completions") and not base_url.endswith("/v1"):
            url = f"{base_url}/chat/completions"
        elif base_url.endswith("/v1"):
            url = f"{base_url}/chat/completions"
        else:
            url = base_url
        
        return url, headers, model_name
    
    async def _call_llm_with_retry(
        self,
        url: str,
        headers: dict,
        payload: dict,
        stream: bool = False,
    ) -> dict:
        """
        带指数退避重试的 LLM 调用
        
        Args:
            url: API 端点
            headers: 请求头
            payload: 请求体
            stream: 是否使用流式模式
            
        Returns:
            API 响应 JSON
            
        Raises:
            Exception: 所有重试失败后抛出
        """
        import time as _time
        client = await self.get_http_client()
        last_error = None
        _req_start = _time.monotonic()
        _model_name = payload.get("model", "unknown")
        
        for attempt in range(1, self.MAX_RETRIES + 1):
            _attempt_start = _time.monotonic()
            try:
                async with self._llm_semaphore:
                    resp = await client.post(url, headers=headers, json=payload)
                
                _elapsed = _time.monotonic() - _attempt_start
                
                if resp.status_code == 200:
                    logger.debug(f"LLM 调用成功 [model={_model_name}, attempt={attempt}, elapsed={_elapsed:.1f}s]")
                    return resp.json()
                elif resp.status_code == 401:
                    raise Exception(f"API认证失败 (401): 请检查 API Key 是否有效。详情: {resp.text[:200]}")
                elif resp.status_code == 429:
                    # 速率限制，从 Retry-After header 或使用退避
                    retry_after = resp.headers.get("Retry-After")
                    delay = float(retry_after) if retry_after else min(self.RETRY_BASE_DELAY * (2 ** attempt), self.RETRY_MAX_DELAY)
                    logger.warning(f"API速率限制 (429)，等待 {delay:.1f}s 后重试 (尝试 {attempt}/{self.MAX_RETRIES}) [model={_model_name}]")
                    await asyncio.sleep(delay)
                    continue
                elif resp.status_code >= 500:
                    # 服务端错误，可重试
                    delay = min(self.RETRY_BASE_DELAY * (2 ** attempt), self.RETRY_MAX_DELAY)
                    logger.warning(f"API服务端错误 ({resp.status_code})，等待 {delay:.1f}s 后重试 (尝试 {attempt}/{self.MAX_RETRIES}) [model={_model_name}]")
                    last_error = Exception(f"API返回 {resp.status_code}: {resp.text[:200]}")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise Exception(f"API返回 {resp.status_code}: {resp.text[:200]}")
                    
            except httpx.TimeoutException as e:
                last_error = e
                _elapsed = _time.monotonic() - _attempt_start
                delay = min(self.RETRY_BASE_DELAY * (2 ** attempt), self.RETRY_MAX_DELAY)
                logger.warning(f"API超时 ({_elapsed:.1f}s)，等待 {delay:.1f}s 后重试 (尝试 {attempt}/{self.MAX_RETRIES}) [model={_model_name}]")
                await asyncio.sleep(delay)
            except httpx.ConnectError as e:
                last_error = e
                delay = min(self.RETRY_BASE_DELAY * (2 ** attempt), self.RETRY_MAX_DELAY)
                logger.warning(f"API连接失败: {e}，等待 {delay:.1f}s 后重试 (尝试 {attempt}/{self.MAX_RETRIES}) [model={_model_name}]")
                await asyncio.sleep(delay)
            except Exception as e:
                if "401" in str(e) or "认证" in str(e):
                    raise  # 认证错误不重试
                last_error = e
                if attempt < self.MAX_RETRIES:
                    delay = min(self.RETRY_BASE_DELAY * (2 ** attempt), self.RETRY_MAX_DELAY)
                    logger.warning(f"API调用异常: {e}，等待 {delay:.1f}s 后重试 (尝试 {attempt}/{self.MAX_RETRIES}) [model={_model_name}]")
                    await asyncio.sleep(delay)
        
        _total_elapsed = _time.monotonic() - _req_start
        error_detail = str(last_error)[:300] if last_error else "未知错误"
        raise Exception(
            f"LLM调用在 {self.MAX_RETRIES} 次重试后失败 (总耗时 {_total_elapsed:.1f}s, model={_model_name}): {error_detail}"
        )
    
    async def chat(
        self,
        message: str,
        user_id: Optional[str] = None,
        llm_config: Optional[Any] = None,
        system_prompt_override: Optional[str] = None,
        enable_reflection: bool = False,
    ) -> str:
        """
        对话接口 (v2 优化版)
        
        优化点：
        1. 新增 system_prompt_override 参数，避免重建客户端切换 Prompt
        2. 新增 enable_reflection 参数，默认关闭反思（仅复杂任务开启）
        3. 使用共享连接池，不再每次创建新 httpx.AsyncClient
        4. Tool Calling 支持并行执行
        5. 增加指数退避重试
        
        Args:
            message: 用户消息
            user_id: 用户ID（可选，用于加载偏好）
            llm_config: 动态 LLM 配置（可选）
            system_prompt_override: 临时覆盖 system prompt（不修改实例状态）
            enable_reflection: 是否启用反思机制（默认关闭）
        """
        try:
            # 广播思考状态
            await self.broadcast_status("thinking", f"{self.name} 正在思考...", {"message_preview": message[:50]})
            
            # 确定 system prompt（优先使用 override，不修改实例状态）
            system_prompt = system_prompt_override or self.system_prompt
            
            # 动态注入用户偏好 (Long-term Memory)
            if user_id:
                try:
                    from src.services.preference_service import preference_service
                    suffix = await preference_service.get_agent_system_prompt_suffix(user_id)
                    system_prompt += suffix
                except Exception as e:
                    logger.warning(f"无法获取用户偏好: {e}")
            
            # 防护：确保 user 消息不为空（API 会拒绝空消息）
            if not message or not message.strip():
                logger.warning(f"Agent {self.name}: 收到空的用户消息，使用默认提示")
                message = "请根据上下文提供分析和建议。"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            
            # 导入 MCP 服务
            from src.services.mcp_client_service import mcp_client_service
            
            # 使用传入的配置 > contextvars 任务配置 > 默认配置
            active_config = llm_config or _task_llm_config_var.get(None) or self.llm_config
            
            # Debug logging
            provider = getattr(active_config, 'provider', 'N/A')
            base_url_str = getattr(active_config, 'api_base_url', 'N/A')
            key_preview = getattr(active_config, 'api_key', '')[:5] + '...' if getattr(active_config, 'api_key', '') else 'None'
            logger.info(f"Agent {self.name} using config: Provider={provider}, API Base={base_url_str}, Key={key_preview}")
            
            # 检查配置有效性：如果没有有效的 API Key，直接返回提示而非 mock
            _check_key = getattr(active_config, 'api_key', '') if active_config else ''
            if not _check_key or _check_key == 'sk-dummy-key' or 'dummy' in _check_key:
                logger.warning(f"Agent {self.name}: 没有有效的 API Key，请在设置页面配置 LLM 模型")
                return ("尚未配置有效的大语言模型 API Key。\n\n"
                        "请按以下步骤操作：\n"
                        "1. 点击左侧菜单 **设置**\n"
                        "2. 进入 **模型配置 (LLM)** 标签\n"
                        "3. 编辑您的模型配置，输入有效的 API Key\n"
                        "4. 保存后重新发送消息即可")
            
            # 准备请求参数
            url, headers, model_name = self._prepare_llm_request(active_config)
            
            # --- MCP Tools Integration ---
            try:
                available_tools = await mcp_client_service.get_all_tools()
            except Exception as e:
                logger.warning(f"获取 MCP 工具失败: {e}")
                available_tools = []
                
            max_turns = 5  # Prevent infinite loops
            current_turn = 0
            reflection_done = False  # 标记是否已完成反思
            
            while current_turn < max_turns:
                current_turn += 1
                
                # 某些模型对 temperature 有严格限制（如 kimi-k2.5 只允许 temperature=1）
                temperature = getattr(active_config, 'temperature', None) or self.config.temperature or 0.7
                if model_name and ("k2" in model_name or "thinking" in model_name or "o1" in model_name or "o3" in model_name):
                    temperature = 1.0  # 推理型模型强制 temperature=1
                
                payload = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                }
                
                if available_tools:
                    payload["tools"] = available_tools
                    payload["tool_choice"] = "auto"
                
                logger.info(f"API Call to {url} (Turn {current_turn})")
                
                # 使用带重试的 LLM 调用
                data = await self._call_llm_with_retry(url, headers, payload)
                
                choice = data["choices"][0]
                resp_msg = choice["message"]
                content = resp_msg.get("content")
                tool_calls = resp_msg.get("tool_calls")
                
                # Update messages with assistant response
                messages.append(resp_msg)
                
                if tool_calls:
                    logger.info(f"Executing {len(tool_calls)} tool calls...")
                    await self.broadcast_status("tool_use", f"{self.name} 正在使用工具...", {"tool_count": len(tool_calls)})
                    
                    # 并行执行所有 Tool Calls
                    async def _execute_tool(tc):
                        call_id = tc["id"]
                        fn = tc["function"]
                        fn_name = fn["name"]
                        fn_args_str = fn["arguments"]
                        try:
                            fn_args = json.loads(fn_args_str)
                            result = await mcp_client_service.call_tool(fn_name, fn_args)
                            tool_output = str(result)
                            logger.info(f"Tool {fn_name} executed successfully")
                        except Exception as e:
                            logger.error(f"Tool execution failed for {fn_name}: {e}")
                            tool_output = f"Error executing tool: {str(e)}"
                        return {
                            "role": "tool",
                            "tool_call_id": call_id,
                            "content": tool_output
                        }
                    
                    tool_results = await asyncio.gather(
                        *[_execute_tool(tc) for tc in tool_calls],
                        return_exceptions=True
                    )
                    
                    for tr in tool_results:
                        if isinstance(tr, Exception):
                            messages.append({
                                "role": "tool",
                                "tool_call_id": "error",
                                "content": f"Tool execution error: {str(tr)}"
                            })
                        else:
                            messages.append(tr)
                    
                    # Loop back to send tool outputs to LLM
                    continue
                else:
                    # 条件触发反思机制（仅在 enable_reflection=True 且尚未反思时）
                    if (enable_reflection
                            and not reflection_done
                            and current_turn == 1
                            and len(str(content)) > 200):
                        reflection_done = True
                        reflection_prompt = (
                            f"请检查上述回答。如果你是{self.role}，你认为这个回答在法律专业性、"
                            f"风险提示或完整性上有什么遗漏吗？如果没有，请直接复述原回答；如果有，请修正。"
                        )
                        messages.append({"role": "user", "content": reflection_prompt})
                        await self.broadcast_status("reflection", f"{self.name} 正在反思...", {"reason": "Self-Correction"})
                        continue
                    
                    # Final response
                    await self.broadcast_status("finished", f"{self.name} 回复完成", {"response_preview": str(content)[:50]})
                    return content
            
            return "Task limit reached without final answer."
            
        except Exception as e:
            error_str = str(e)
            
            # 获取当前 LLM 配置信息
            active_config = llm_config or _task_llm_config_var.get(None) or self.llm_config
            api_key = getattr(active_config, "api_key", "") if active_config else ""
            api_base_url = getattr(active_config, "api_base_url", "") if active_config else ""
            
            # 严格判断：只在 API Key 明确为 dummy/测试/空值 时才使用 Mock 模式
            # 绝不在真实 API Key 失败时返回 Mock（那样会让用户误以为得到了真实回答）
            is_explicitly_dummy = (
                not api_key
                or api_key.startswith("dummy")
                or api_key.startswith("sk-test")
                or api_key == "your-api-key-here"
                or len(api_key) < 10
            )
            
            if is_explicitly_dummy:
                logger.warning(f"未配置有效的 API Key，使用模拟响应 (Mock Mode) - Agent: {self.name}")
                mock_resp = self._get_mock_response(message)
                # 在 Mock 响应中明确标注这是模拟数据
                return (
                    f"⚠️ **当前为演示模式** — 未检测到有效的 LLM API Key，以下为模拟响应：\n\n"
                    f"{mock_resp}\n\n"
                    f"---\n*如需真实 AI 分析，请在「设置 → LLM 配置」中配置有效的 API Key。*"
                )
            
            # 真实 API Key 但调用失败 — 返回明确的错误信息而非 Mock
            logger.error(f"Agent [{self.name}] 调用失败: {e}")
            await self.broadcast_status("error", f"{self.name} 发生错误: {str(e)[:100]}")
            
            # 构建包含诊断信息的错误响应
            if "401" in error_str or "Incorrect API key" in error_str:
                return f"处理失败: API Key 认证错误。请检查您的 LLM 配置是否正确（设置 → LLM 配置）。"
            elif "429" in error_str or "rate limit" in error_str.lower():
                return f"处理失败: API 请求频率超限，请稍后重试。"
            elif "timeout" in error_str.lower() or "超时" in error_str:
                return f"处理失败: 请求超时（{error_str[:100]}）。建议稍后重试或简化您的问题。"
            else:
                return f"处理失败: {error_str[:200]}"

    async def stream_chat(
        self,
        message: str,
        llm_config: Optional[Any] = None,
        system_prompt_override: Optional[str] = None,
    ) -> asyncio.Queue:
        """
        流式对话接口 — 真正的 token-by-token 流式输出
        
        返回一个 asyncio.Queue，调用方可以从中逐步读取 token。
        队列中的特殊值 None 表示流结束。
        
        Args:
            message: 用户消息
            llm_config: 动态 LLM 配置
            system_prompt_override: 临时覆盖 system prompt
            
        Returns:
            asyncio.Queue: token 队列
        """
        queue: asyncio.Queue = asyncio.Queue()
        
        async def _stream_worker():
            _msg = message
            try:
                system_prompt = system_prompt_override or self.system_prompt
                active_config = llm_config or _task_llm_config_var.get(None) or self.llm_config
                url, headers, model_name = self._prepare_llm_request(active_config)
                
                # 推理型模型强制 temperature=1
                temperature = getattr(active_config, 'temperature', None) or self.config.temperature or 0.7
                if model_name and ("k2" in model_name or "thinking" in model_name or "o1" in model_name or "o3" in model_name):
                    temperature = 1.0
                
                # 防护：确保 user 消息不为空
                if not _msg or not _msg.strip():
                    logger.warning(f"Agent {self.name}: stream_chat 收到空的用户消息，使用默认提示")
                    _msg = "请根据上下文提供分析和建议。"
                
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": _msg}
                    ],
                    "temperature": temperature,
                    "stream": True,
                }
                
                client = await self.get_http_client()
                
                # 流式请求带重试（最多 2 次重试）
                _max_stream_retries = 2
                for _stream_attempt in range(1, _max_stream_retries + 1):
                    try:
                        async with client.stream("POST", url, headers=headers, json=payload, timeout=httpx.Timeout(180.0, connect=10.0)) as resp:
                            if resp.status_code == 429:
                                # 速率限制，短暂等待后重试
                                delay = min(2.0 * (2 ** _stream_attempt), 15.0)
                                logger.warning(f"流式API速率限制 (429)，等待 {delay:.1f}s 后重试 [{_stream_attempt}/{_max_stream_retries}]")
                                await asyncio.sleep(delay)
                                continue
                            elif resp.status_code != 200:
                                error_body = await resp.aread()
                                error_text = error_body.decode("utf-8", errors="replace")[:200]
                                if resp.status_code >= 500 and _stream_attempt < _max_stream_retries:
                                    delay = 2.0 * _stream_attempt
                                    logger.warning(f"流式API服务端错误 ({resp.status_code})，{delay}s 后重试 [{_stream_attempt}/{_max_stream_retries}]")
                                    await asyncio.sleep(delay)
                                    continue
                                await queue.put(f"[Error] API返回 {resp.status_code}: {error_text}")
                                await queue.put(None)
                                return
                            
                            async for line in resp.aiter_lines():
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str.strip() == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_str)
                                        delta = data["choices"][0].get("delta", {})
                                        token = delta.get("content", "")
                                        if token:
                                            await queue.put(token)
                                    except (json.JSONDecodeError, KeyError, IndexError):
                                        continue
                        
                        # 成功完成，退出重试循环
                        break
                    except (httpx.TimeoutException, httpx.ConnectError) as stream_retry_err:
                        if _stream_attempt < _max_stream_retries:
                            delay = 2.0 * _stream_attempt
                            logger.warning(f"流式请求超时/连接失败: {stream_retry_err}，{delay}s 后重试 [{_stream_attempt}/{_max_stream_retries}]")
                            await asyncio.sleep(delay)
                        else:
                            raise
                
                await queue.put(None)  # 流结束信号
                
            except Exception as e:
                logger.error(f"流式对话失败 (Agent={self.name}): {e}")
                # 降级：尝试使用同步 chat 获取完整响应
                try:
                    logger.info(f"流式失败，降级到同步 chat (Agent={self.name})")
                    sync_response = await self.chat(_msg, llm_config=llm_config, system_prompt_override=system_prompt_override)
                    # 将同步结果分块推入队列模拟流式输出
                    _chunk_size = 4
                    for i in range(0, len(sync_response), _chunk_size):
                        await queue.put(sync_response[i:i + _chunk_size])
                        await asyncio.sleep(0.01)
                except Exception as fallback_err:
                    logger.error(f"同步降级也失败 (Agent={self.name}): {fallback_err}")
                    await queue.put(f"[Error] {str(e)}")
                await queue.put(None)
        
        # 在后台启动流式 worker
        asyncio.create_task(_stream_worker())
        return queue

    def _get_mock_response(self, message: str) -> str:
        """生成模拟响应"""
        msg_lower = message.lower()
        
        # 1. 劳动法相关
        if "辞退" in msg_lower or "试用期" in msg_lower:
            return """根据《劳动合同法》第39条规定，劳动者在试用期间被证明不符合录用条件的，用人单位可以解除劳动合同，且无需支付经济补偿金。
            
            建议：
            1. 确保已有明确的录用条件确认书。
            2. 收集员工不符合录用条件的具体证据。
            3. 书面通知员工解除劳动合同。
            """
            
        # 2. 知识产权相关
        if "抄袭" in msg_lower or "侵权" in msg_lower:
            return """判定著作权侵权通常遵循"接触 + 实质性相似"原则。
            
            分析：
            1. **接触**：侵权人是否有机会接触到您的作品。
            2. **实质性相似**：两部作品在核心表达上是否构成实质性相似。
            
            建议保留创作底稿，进行侵权对比分析。
            """
            
        # 3. 共识 Agent (JSON 格式)
        if "共识" in self.name or "仲裁" in self.role or "conflicts" in self.system_prompt:
            return """```json
{
  "conflicts": [
    {
      "point": "法律适用条款",
      "positions": [
        {"agent": "LegalAdvisor", "view": "适用劳动合同法第39条", "score": 9, "reason": "法律依据准确"},
        {"agent": "RiskAssessor", "view": "建议支付N+1以降低风险", "score": 7, "reason": "出于实务风险考虑"}
      ],
      "winner": "LegalAdvisor"
    }
  ],
  "debate_summary": "法律顾问强调法定免赔情形，风险专家关注实际操作中的举证难度。",
  "final_decision": "在证据充分的情况下，依据第39条解除合同且无需赔偿；若证据不足，建议协商解除。",
  "reasoning": "法律规定明确，关键在于举证责任。",
  "risk_level": "medium",
  "is_consensus_reached": true
}
```"""

        # 4. 通用回复
        return f"【Mock响应】我已收到您的问题：{message}。由于正在使用测试API Key，无法调用真实模型进行回答。请配置有效的OPENAI_API_KEY。"

    
    async def broadcast_status(self, status: str, message: str, payload: Dict = None):
        """广播Agent状态到事件总线"""
        try:
            from src.services.event_bus import event_bus
            event_data = {
                "agent": self.name,
                "status": status,
                "message": message,
                "payload": payload or {}
            }
            await event_bus.publish("agent_events", event_data)
        except Exception as e:
            logger.warning(f"状态广播失败: {e}")

    def get_info(self) -> Dict[str, Any]:
        """获取Agent信息"""
        return {
            "name": self.name,
            "role": self.role,
            "description": self.config.description,
            "tools": self.config.tools
        }
