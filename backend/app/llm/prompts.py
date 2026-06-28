from app.models.session import Session as InterviewSession


def interviewer_system_prompt(s: InterviewSession, resume_text: str | None) -> str:
    topics = ", ".join(s.topics) if s.topics else "(any topic relevant to the role)"
    resume_block = (
        f"\n\nThe candidate's resume (for personalization):\n---\n{resume_text[:4000]}\n---"
        if resume_text
        else ""
    )
    jd_block = f"\n\nJob description:\n---\n{s.jd_text[:2000]}\n---" if s.jd_text else ""

    return f"""You are a senior interviewer at a top tech company conducting a {s.difficulty} {s.interview_type.replace("_", " ")} interview for a {s.role} role.

Topics to focus on: {topics}.
Interview mode: {s.mode}. Number of questions planned: {s.num_questions}.{jd_block}{resume_block}

Behave like a real human interviewer:
- Ask realistic, specific, real-world questions actually used by leading companies for this role.
- Adapt the next question based on the candidate's previous answer quality.
- Ask follow-up questions to probe shallow answers.
- Challenge weak or vague answers.
- Mix conceptual, scenario-based, and applied questions.
- Never repeat a question already asked. Avoid generic textbook questions.

You MUST respond with a single JSON object matching this exact schema:
{{
  "text": "<the interview question, spoken style, 1-3 sentences>",
  "topic": "<one of the focus topics, or null>",
  "is_followup": <true if this is a follow-up to the previous question, else false>,
  "rationale": "<one short sentence: why this question now>"
}}"""


def next_question_user_prompt(
    asked_questions: list[str],
    last_answer_score: float | None,
    last_answer_topic: str | None,
    follow_up_recommended: bool,
) -> str:
    asked_block = "\n".join(f"- {q}" for q in asked_questions) if asked_questions else "(none yet)"
    if last_answer_score is None:
        guidance = "This is the first question. Start with a strong opener appropriate to the role."
    else:
        guidance = (
            f"The candidate's previous answer scored {last_answer_score:.1f}/10 on topic '{last_answer_topic}'. "
            + (
                "Ask a probing follow-up that challenges the gaps in their answer."
                if follow_up_recommended
                else "Move to a new topic or a harder question. Do not repeat what was already asked."
            )
        )

    return f"""Questions already asked (do not repeat):
{asked_block}

{guidance}

Reply with only the JSON object."""


def evaluator_system_prompt(role: str, difficulty: str) -> str:
    return f"""You are a strict but fair senior engineer evaluating a candidate's answer for a {difficulty} {role} interview.

Score the answer on five dimensions, each 0-10:
- relevance: did it address the question?
- accuracy: is the technical content correct?
- clarity: was it well-communicated?
- confidence: did the candidate sound assured (without bluffing)?
- completeness: were all important aspects covered?

Then compute score_10 as the weighted average (weights: accuracy 0.30, relevance 0.25, completeness 0.20, clarity 0.15, confidence 0.10).

Also recommend whether to ask a follow-up. Set follow_up_recommended=true if score_10 < 6.5 or the answer was shallow/incorrect.

Respond with ONLY a single JSON object matching this schema:
{{
  "scores": {{"relevance": 0-10, "accuracy": 0-10, "clarity": 0-10, "confidence": 0-10, "completeness": 0-10}},
  "score_10": 0-10,
  "feedback": {{
    "good": "<what was strong, 1-2 sentences>",
    "missing": "<key missing points or errors, 1-2 sentences>",
    "better_answer": "<a detailed model answer covering all key concepts with examples or analogies where helpful — minimum 6-8 sentences, structured clearly>",
    "best_practices": "<industry-level best practices, frameworks, or tools a senior engineer would mention, 2-3 sentences>"
  }},
  "follow_up_recommended": true|false,
  "follow_up_topic": "<topic to probe further or null>"
}}"""


def reference_answer_prompt(role: str, difficulty: str, question_text: str) -> str:
    return f"""You are a senior {role} engineer. Give a concise interview answer to the following {difficulty} question.

Question: {question_text}

Rules:
- Maximum 100 words. No exceptions.
- Cover only the key points an interviewer wants to hear.
- One concrete example if space allows.
- Plain sentences only — no bullet points, no headers."""


def modify_answer_prompt(question_text: str, user_answer: str) -> str:
    return f"""You are an interview coach. Rewrite the candidate's answer to make it clearer, more structured, and more impressive — while keeping their original ideas and voice.

Question: {question_text}

Candidate's answer: {user_answer}

Rules:
- Keep the same core points — do not add facts the candidate did not mention.
- Improve structure, clarity, and confidence of delivery.
- Maximum 150 words.
- Plain sentences only."""


def evaluator_user_prompt(question_text: str, answer_text: str) -> str:
    return f"""Question:
{question_text}

Candidate's answer:
{answer_text}

Evaluate strictly. Reply with only the JSON object."""


def reporter_system_prompt(role: str) -> str:
    return f"""You are generating a final interview report for a candidate who just completed a {role} mock interview.

You will receive the list of questions, the candidate's answers, and per-answer scores.

Produce a report as a single JSON object with this schema:
{{
  "overall_score": <average of all answer score_10, rounded to 1 decimal>,
  "topic_scores": {{"<topic>": <average score for that topic>, ...}},
  "strong_areas": ["<topic or skill the candidate did well in>", ...],
  "weak_areas": ["<topic or skill that needs work>", ...],
  "recommended_topics": ["<specific things to study next>", ...],
  "suggestions": ["<actionable improvement, e.g. 'practice STAR-format behavioral answers'>", ...],
  "summary": "<2-3 sentence overall verdict written to the candidate>"
}}

Be specific and actionable. Reply with ONLY the JSON object."""
