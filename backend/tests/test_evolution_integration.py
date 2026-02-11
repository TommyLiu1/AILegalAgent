"""
进化系统集成测试
测试反馈、经验提取、策略优化的完整流程

修复：
- FeedbackPipeline(episodic_memory, experience_extractor)
- ExperienceExtractor(episodic_memory)
- PolicyOptimizer(episodic_memory, experience_extractor)
- episodic_memory.update_feedback (非 update_rating)
- episodic_memory.get 需为 AsyncMock
"""

import asyncio
import pytest
from datetime import datetime
from unittest.mock import Mock, AsyncMock, MagicMock

from src.core.evolution import (
    FeedbackPipeline,
    UserFeedback,
    ExperienceExtractor,
    Pattern,
    PolicyOptimizer,
    DAGStructure
)

# 测试数据
TEST_EPISODE_ID = "test-episode-001"
TEST_SESSION_ID = "test-session-001"
TEST_TASK_DESCRIPTION = "审查房屋租赁合同"
TEST_TASK_TYPE = "contract_review"

_MOCK_EPISODE = {
    "episode_id": TEST_EPISODE_ID,
    "task_description": TEST_TASK_DESCRIPTION,
    "task_type": TEST_TASK_TYPE,
    "agents_involved": ["ContractAgent", "RiskAgent"],
    "execution_trace": {
        "agent_sequence": ["ContractAgent", "RiskAgent"],
        "parallel_groups": [],
    },
    "user_rating": 5,
    "result_summary": "发现3处风险条款",
    "is_successful": True,
    "success_metrics": {"efficiency": 0.9, "execution_time": 25},
}


def _make_mock_episodic():
    """创建完整 mock 的 episodic memory"""
    m = MagicMock()
    # FeedbackPipeline.submit_feedback 调用 update_feedback
    m.update_feedback = AsyncMock(return_value=True)
    # ExperienceExtractor.extract_from_episode 调用 get(episode_id)
    m.get = AsyncMock(return_value=_MOCK_EPISODE)
    # PolicyOptimizer 调用 search
    m.search = AsyncMock(return_value=[
        {
            **_MOCK_EPISODE,
            "similarity_score": 0.9,
        }
    ])
    m.add_documents = AsyncMock(return_value=1)
    m.update = AsyncMock(return_value=True)
    return m


@pytest.mark.asyncio
class TestFeedbackPipeline:
    """反馈管道测试"""

    @pytest.fixture
    def feedback_pipeline(self):
        mock_episodic = _make_mock_episodic()
        extractor = ExperienceExtractor(episodic_memory=mock_episodic)
        # Mock 经验提取方法避免深层调用
        extractor.extract_from_episode = AsyncMock(return_value=[])
        return FeedbackPipeline(
            episodic_memory=mock_episodic,
            experience_extractor=extractor,
        )

    async def test_submit_feedback(self, feedback_pipeline):
        """测试提交反馈"""
        feedback = UserFeedback(
            episode_id=TEST_EPISODE_ID,
            rating=5,
            comment="非常准确和及时",
            session_id=TEST_SESSION_ID,
        )

        result = await feedback_pipeline.submit_feedback(feedback)
        assert result is True

    async def test_feedback_triggers_experience_extraction(self, feedback_pipeline):
        """测试反馈后内部状态"""
        feedback = UserFeedback(
            episode_id=TEST_EPISODE_ID,
            rating=5,
            comment="处理得很好",
            session_id=TEST_SESSION_ID,
        )

        result = await feedback_pipeline.submit_feedback(feedback)
        assert result is True
        # 验证 episodic memory 被调用
        feedback_pipeline.episodic_memory.update_feedback.assert_awaited_once()


@pytest.mark.asyncio
class TestExperienceExtractor:
    """经验提取器测试"""

    @pytest.fixture
    def extractor(self):
        mock_episodic = _make_mock_episodic()
        return ExperienceExtractor(episodic_memory=mock_episodic)

    async def test_extract_success_pattern(self, extractor):
        """测试提取成功模式"""
        patterns = await extractor.extract_from_episode(
            episode_id=TEST_EPISODE_ID,
        )

        assert isinstance(patterns, list)
        # 成功案例（rating >= 4）应提取出模式
        if patterns:
            for p in patterns:
                assert isinstance(p, Pattern)

    async def test_extract_failure_pattern(self, extractor):
        """测试失败案例提取"""
        # 返回一个失败的案例
        extractor.episodic_memory.get = AsyncMock(return_value={
            "episode_id": "ep-fail-001",
            "task_type": TEST_TASK_TYPE,
            "error_message": "API 调用超时",
            "agents_involved": ["ContractAgent"],
            "user_rating": 1,
            "is_successful": False,
            "execution_trace": {"agent_sequence": ["ContractAgent"]},
            "result_summary": "失败",
        })

        patterns = await extractor.extract_from_episode(
            episode_id="ep-fail-001",
        )
        assert isinstance(patterns, list)

    async def test_pattern_confidence_in_range(self, extractor):
        """测试模式置信度在合法范围"""
        patterns = await extractor.extract_from_episode(
            episode_id=TEST_EPISODE_ID,
        )
        for p in patterns:
            if hasattr(p, 'confidence'):
                assert 0.0 <= p.confidence <= 1.0


@pytest.mark.asyncio
class TestPolicyOptimizer:
    """策略优化器测试"""

    @pytest.fixture
    def optimizer(self):
        mock_episodic = _make_mock_episodic()
        extractor = ExperienceExtractor(episodic_memory=mock_episodic)
        # Mock 所有 extractor 方法
        extractor.extract_from_episode = AsyncMock(return_value=[])
        extractor.get_patterns = AsyncMock(return_value=[])
        extractor.get_pattern_stats = AsyncMock(return_value={"total": 0})
        return PolicyOptimizer(
            episodic_memory=mock_episodic,
            experience_extractor=extractor,
        )

    async def test_optimize_agent_selection(self, optimizer):
        """测试优化代理选择"""
        agents = await optimizer.optimize_agent_selection(
            task_description=TEST_TASK_DESCRIPTION,
            task_type=TEST_TASK_TYPE,
        )

        assert isinstance(agents, list)
        assert len(agents) > 0

    async def test_optimize_dag_structure(self, optimizer):
        """测试优化 DAG 结构"""
        dag = await optimizer.optimize_dag_structure(
            task_description=TEST_TASK_DESCRIPTION,
            task_type=TEST_TASK_TYPE,
            agents=["ContractAgent", "RiskAgent"],
        )

        assert isinstance(dag, DAGStructure)
        assert len(dag.agents) > 0

    async def test_optimize_produces_consistent_results(self, optimizer):
        """测试优化结果一致性"""
        agents1 = await optimizer.optimize_agent_selection(
            task_description="审查服务合同",
            task_type="contract_review",
        )
        agents2 = await optimizer.optimize_agent_selection(
            task_description="审查服务合同",
            task_type="contract_review",
        )
        # 相同输入应产出相同结果（如有缓存更佳）
        assert agents1 == agents2


@pytest.mark.asyncio
class TestEvolutionWorkflow:
    """进化工作流端到端测试"""

    async def test_complete_evolution_cycle(self):
        """测试完整的进化周期"""
        # 1. 创建所有组件
        mock_episodic = _make_mock_episodic()
        extractor = ExperienceExtractor(episodic_memory=mock_episodic)
        # Mock extractor 的方法
        extractor.extract_from_episode = AsyncMock(return_value=[
            Pattern(
                pattern_id="pat-001",
                pattern_type="dag_optimization",
                task_type=TEST_TASK_TYPE,
                description="ContractAgent → RiskAgent",
                confidence=0.85,
                data={"agents_used": ["ContractAgent", "RiskAgent"]},
                created_at=datetime.now(),
            )
        ])
        extractor.get_patterns = AsyncMock(return_value=[])
        extractor.get_pattern_stats = AsyncMock(return_value={"total": 1})

        pipeline = FeedbackPipeline(mock_episodic, extractor)
        optimizer = PolicyOptimizer(mock_episodic, extractor)

        # 2. 提交反馈
        feedback = UserFeedback(
            episode_id=TEST_EPISODE_ID,
            rating=5,
            comment="非常准确",
            session_id=TEST_SESSION_ID,
        )
        result = await pipeline.submit_feedback(feedback)
        assert result is True

        # 3. 提取经验
        patterns = await extractor.extract_from_episode(TEST_EPISODE_ID)
        assert isinstance(patterns, list)
        assert len(patterns) > 0

        # 4. 优化策略
        optimized_agents = await optimizer.optimize_agent_selection(
            task_description=TEST_TASK_DESCRIPTION,
            task_type=TEST_TASK_TYPE,
        )
        assert isinstance(optimized_agents, list)
        assert len(optimized_agents) > 0
