"""
事件总线服务 (Event Bus Service)
基于 Redis 实现的轻量级事件分发系统
用于实现 Agent 之间的异步通信和解耦
"""

import json
import asyncio
from typing import Dict, Any, Callable, Awaitable, List
from loguru import logger
import redis.asyncio as redis
from src.core.config import settings


class EventBus:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.redis: redis.Redis = None
        self.subscribers: Dict[str, List[Callable[[Dict[str, Any]], Awaitable[None]]]] = {}
        self.is_connected = False
        self._pubsub = None
        self._listen_task = None

    async def connect(self):
        """连接到 Redis"""
        if self.is_connected:
            return

        try:
            self.redis = redis.from_url(self.redis_url, decode_responses=True)
            await self.redis.ping()
            self.is_connected = True
            logger.info(f"EventBus 已连接到 Redis: {self.redis_url}")
            
            # 启动监听任务
            self._pubsub = self.redis.pubsub()
            self._listen_task = asyncio.create_task(self._listen_loop())
            
        except Exception as e:
            logger.error(f"EventBus 连接失败: {e}")
            self.is_connected = False

    async def disconnect(self):
        """断开连接"""
        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        
        if self._pubsub:
            await self._pubsub.close()
            
        if self.redis:
            await self.redis.close()
            
        self.is_connected = False
        logger.info("EventBus 已断开连接")

    async def publish(self, channel: str, message: Dict[str, Any]):
        """发布事件"""
        if not self.is_connected:
            await self.connect()
            
        try:
            # 自动添加时间戳等元数据
            if "timestamp" not in message:
                import time
                message["timestamp"] = time.time()
                
            payload = json.dumps(message, ensure_ascii=False)
            await self.redis.publish(channel, payload)
            logger.debug(f"EventBus 发布消息到 [{channel}]: {payload[:100]}...")
            
        except Exception as e:
            logger.error(f"EventBus 发布失败: {e}")

    async def subscribe(self, channel: str, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        """订阅频道"""
        if channel not in self.subscribers:
            self.subscribers[channel] = []
            if self.is_connected and self._pubsub:
                await self._pubsub.subscribe(channel)
                
        self.subscribers[channel].append(callback)
        logger.info(f"EventBus 新增订阅者: [{channel}] (当前 {len(self.subscribers[channel])} 个)")

    async def unsubscribe(self, channel: str, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        """取消订阅"""
        if channel in self.subscribers:
            try:
                self.subscribers[channel].remove(callback)
                logger.info(f"EventBus 移除订阅者: [{channel}] (剩余 {len(self.subscribers[channel])} 个)")
            except ValueError:
                pass  # callback 不在列表中

    async def _listen_loop(self):
        """监听循环"""
        while True:
            try:
                if not self.is_connected or not self._pubsub:
                    await asyncio.sleep(1)
                    continue
                    
                message = await self._pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    channel = message["channel"]
                    data = message["data"]
                    
                    try:
                        payload = json.loads(data)
                        if channel in self.subscribers:
                            tasks = []
                            for callback in self.subscribers[channel]:
                                tasks.append(callback(payload))
                            
                            if tasks:
                                # 并行执行所有回调
                                await asyncio.gather(*tasks, return_exceptions=True)
                                
                    except json.JSONDecodeError:
                        logger.warning(f"EventBus 收到非 JSON 消息: {data}")
                    except Exception as e:
                        logger.error(f"EventBus 处理消息异常: {e}")
                        
            except asyncio.CancelledError:
                break
            except Exception as e:
                if not hasattr(self, '_listen_backoff'):
                    self._listen_backoff = 1
                    self._listen_error_count = 0
                self._listen_error_count += 1
                # 仅在前 3 次和之后每 60 次打印错误，避免日志爆炸
                if self._listen_error_count <= 3 or self._listen_error_count % 60 == 0:
                    logger.error(f"EventBus 监听循环异常(#{self._listen_error_count}): {e}")
                self._listen_backoff = min(self._listen_backoff * 2, 30)  # 最大 30s 退避
                await asyncio.sleep(self._listen_backoff)

# 全局单例
event_bus = EventBus()
