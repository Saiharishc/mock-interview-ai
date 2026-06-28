"""Unit test: reporter aggregation logic (no LLM calls)."""
import os

os.environ.setdefault("MASTER_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
os.environ.setdefault("JWT_SECRET", "test-secret")


def test_reporter_imports():
    from app.interview import reporter  # noqa: F401


def test_schemas_validate():
    from app.llm.schemas import EvaluationOutput, ReportOutput

    report = ReportOutput(
        overall_score=7.5,
        topic_scores={"Python": 8.0, "RAG": 7.0},
        strong_areas=["Python"],
        weak_areas=["RAG"],
        recommended_topics=["LangChain"],
        suggestions=["Practice coding exercises"],
        summary="Good overall performance.",
    )
    assert report.overall_score == 7.5

    evaluation = EvaluationOutput.model_validate({
        "scores": {"relevance": 8, "accuracy": 7, "clarity": 8, "confidence": 7, "completeness": 6},
        "score_10": 7.3,
        "feedback": {
            "good": "Good explanation",
            "missing": "Missing edge cases",
            "better_answer": "A better answer...",
            "best_practices": "Use RAG pattern",
        },
        "follow_up_recommended": True,
        "follow_up_topic": "RAG",
    })
    assert evaluation.score_10 == 7.3
    assert evaluation.follow_up_recommended is True
