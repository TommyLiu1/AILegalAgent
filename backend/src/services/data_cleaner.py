"""
数据清洗服务
使用 CAMEL-AI 从原始 HTML 中提取法律实体
"""

import json
from typing import Dict, Any, Optional
from loguru import logger

from camel.agents import ChatAgent
from camel.messages import BaseMessage
from camel.models import ModelFactory
from camel.types import ModelPlatformType, ModelType

from src.core.llm_helper import get_llm_config_sync

class DataCleaner:
    """法务情报数据清洗管道"""
    
    def __init__(self):
        self._agent = None
        self._init_agent()
        
    def _init_agent(self):
        """初始化 CAMEL Agent"""
        try:
            # 获取 LLM 配置
            llm_config = get_llm_config_sync("llm")
            
            # 确定平台类型
            platform_type = self._get_platform_type(llm_config.provider)
            
            # 统一使用 GPT_4O 作为占位符，实际模型在 model_config 中指定
            model_type = ModelType.GPT_4O
                
            # 构建模型配置
            model_config = {
                "temperature": 0, # 清洗任务需要高确定性
                "max_tokens": 4096,
                "model": llm_config.model_name
            }
            
            # 创建模型
            model = ModelFactory.create(
                model_platform=platform_type,
                model_type=model_type,
                model_config_dict=model_config,
                api_key=llm_config.api_key,
                url=llm_config.api_base_url,
            )
            
            # 定义系统提示词
            sys_msg = BaseMessage.make_assistant_message(
                role_name="Data Cleaner",
                content=(
                    "你是一个法务数据专家。你的任务是从原始 HTML 或文本中提取法律案件关键信息。"
                    "请严格按 JSON 格式输出，不要包含任何 Markdown 格式。包含以下字段：\n"
                    "- court_name: 法院名称\n"
                    "- parties: 当事人（原告、被告等，以列表形式）\n"
                    "- amount: 标的额（数值或描述，如 100万元）\n"
                    "- legal_provisions: 法律关系条文（提取提到的法律法规，以列表形式）\n"
                    "如果某个字段无法提取，请填入 null。"
                )
            )
            
            self._agent = ChatAgent(sys_msg, model=model)
            logger.info("DataCleaner 智能体初始化成功")
        except Exception as e:
            logger.error(f"DataCleaner 智能体初始化失败: {e}")
            self._agent = None

    def _get_platform_type(self, provider: str) -> ModelPlatformType:
        """根据提供商获取 CAMEL 平台类型"""
        platform_map = {
            "openai": ModelPlatformType.OPENAI,
            "anthropic": ModelPlatformType.ANTHROPIC,
            "ollama": ModelPlatformType.OLLAMA,
            "vllm": ModelPlatformType.VLLM,
            "deepseek": ModelPlatformType.OPENAI,
            "qwen": ModelPlatformType.OPENAI,
            "glm": ModelPlatformType.OPENAI,
        }
        return platform_map.get(provider, ModelPlatformType.OPENAI)

    async def clean_html(self, html_content: str) -> Dict[str, Any]:
        """从 HTML 中提取法务实体"""
        if not self._agent:
            logger.error("DataCleaner 智能体未初始化")
            return {}
            
        logger.info("开始使用 CAMEL-AI 清洗法务数据...")
        
        # 限制长度防止超长，同时简单清理 HTML
        text_content = html_content[:8000]
        
        user_msg = BaseMessage.make_user_message(
            role_name="User",
            content=f"请分析以下内容并提取信息：\n\n{text_content}"
        )
        
        try:
            # CAMEL Agent.step 是同步的，这里用 run_in_executor 也可以，
            # 但在异步环境中通常直接调用，如果是大规模并发则需要优化
            response = self._agent.step(user_msg)
            content = response.msgs[0].content
            
            # 提取 JSON 部分
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                json_str = content[start:end]
                result = json.loads(json_str)
                logger.info(f"数据清洗完成: {result.get('court_name')}")
                return result
            else:
                logger.warning(f"未能从 AI 响应中解析出 JSON 数据: {content}")
                return {}
        except Exception as e:
            logger.error(f"数据清洗过程中发生错误: {e}")
            return {}

# 全局单例
data_cleaner = DataCleaner()
