from pydantic import BaseModel, Field


class QuestionOutput(BaseModel):
    text: str
    topic: str | None = None
    is_followup: bool = False
    rationale: str | None = None


class AnswerScores(BaseModel):
    relevance: float = Field(ge=0, le=10)
    accuracy: float = Field(ge=0, le=10)
    clarity: float = Field(ge=0, le=10)
    confidence: float = Field(ge=0, le=10)
    completeness: float = Field(ge=0, le=10)


class AnswerFeedback(BaseModel):
    good: str
    missing: str
    better_answer: str
    best_practices: str


class EvaluationOutput(BaseModel):
    scores: AnswerScores
    score_10: float = Field(ge=0, le=10)
    feedback: AnswerFeedback
    follow_up_recommended: bool = False
    follow_up_topic: str | None = None


class ReportOutput(BaseModel):
    overall_score: float = Field(ge=0, le=10)
    topic_scores: dict[str, float]
    strong_areas: list[str]
    weak_areas: list[str]
    recommended_topics: list[str]
    suggestions: list[str]
    summary: str
