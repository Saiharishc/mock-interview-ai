"""LiteLLM wrapper. Single chat() entry point across all providers."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import litellm

logger = logging.getLogger(__name__)

# Map our internal provider id -> LiteLLM model prefix
PROVIDER_PREFIX = {
    "openai": "",  # bare model id, e.g. "gpt-4o-mini"
    "anthropic": "anthropic/",
    "gemini": "gemini/",
    "azure": "azure/",
    "groq": "groq/",
    "ollama": "ollama/",
}

FREE_MODELS = {
    "groq": [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "mixtral-8x7b-32768",
    ],
    "ollama": ["llama3.1", "mistral", "gemma2", "phi3", "deepseek-coder"],
}


@dataclass
class ProviderCall:
    provider: str
    model: str
    api_key: str | None
    api_base: str | None = None


def _format_model(provider: str, model: str) -> str:
    prefix = PROVIDER_PREFIX.get(provider, "")
    return f"{prefix}{model}" if prefix else model


def chat(
    call: ProviderCall,
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.7,
) -> str:
    """Run an LLM completion. Returns the assistant message content as a string."""
    kwargs: dict[str, Any] = {
        "model": _format_model(call.provider, call.model),
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if call.api_key:
        kwargs["api_key"] = call.api_key
    if call.api_base:
        kwargs["api_base"] = call.api_base
    if call.provider == "ollama" and not call.api_base:
        kwargs["api_base"] = "http://localhost:11434"
    # Only OpenAI and Azure reliably support response_format; all prompts already
    # instruct JSON output explicitly, so other providers don't need it.
    if json_mode and call.provider in ("openai", "azure"):
        kwargs["response_format"] = {"type": "json_object"}

    response = litellm.completion(**kwargs, num_retries=3)
    choice = response["choices"][0]
    message = choice["message"]

    # Extract content — try all known fields across providers
    content = None
    for getter in [
        lambda m: m.get("content") if hasattr(m, "get") else m["content"],
        lambda m: getattr(m, "content", None),
        lambda m: m.get("reasoning_content") if hasattr(m, "get") else None,
        lambda m: getattr(m, "reasoning_content", None),
        # Gemini thinking: content may be nested in parts
        lambda m: (
            m.get("parts", [{}])[0].get("text")
            if hasattr(m, "get") and m.get("parts")
            else None
        ),
    ]:
        try:
            val = getter(message)
            if val:
                content = val
                break
        except Exception:  # noqa: BLE001
            continue

    if not content:
        logger.error("Empty LLM response. Full choice: %s", choice)
        raise RuntimeError(
            f"LLM returned empty content for model '{kwargs.get('model')}'. "
            f"Full response: {str(choice)[:300]}"
        )
    return content


def _extract_json(text: str) -> str:
    """Extract the first complete JSON object or array from text, ignoring surrounding content.

    Handles thinking models (Gemini 2.5-flash etc.) that emit reasoning prose
    before/after the JSON, as well as markdown code fences.
    """
    text = text.strip()

    # 1. If wrapped in code fences, unwrap first
    if "```" in text:
        import re
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if m:
            text = m.group(1).strip()

    # 2. Find outermost { ... } or [ ... ] by tracking brace depth
    for open_char, close_char in (("{", "}"), ("[", "]")):
        start = text.find(open_char)
        if start == -1:
            continue
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == open_char:
                depth += 1
            elif ch == close_char:
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]

    # 3. Fallback: return as-is and let json.loads raise a clear error
    return text


def chat_json(call: ProviderCall, messages: list[dict[str, str]], **kwargs: Any) -> dict[str, Any]:
    """Chat with JSON response. Retries once on parse failure."""
    raw = chat(call, messages, json_mode=True, **kwargs)
    extracted = _extract_json(raw)
    try:
        return json.loads(extracted)
    except json.JSONDecodeError:
        logger.warning("JSON parse failed (raw=%r), retrying once", raw[:300])
        retry_messages = messages + [
            {"role": "assistant", "content": raw},
            {"role": "user", "content": "Your previous response was not valid JSON. Reply with only a valid JSON object, no markdown, no explanation."},
        ]
        raw = chat(call, retry_messages, json_mode=True, **kwargs)
        return json.loads(_extract_json(raw))


def ping(call: ProviderCall) -> dict[str, Any]:
    """Lightweight call to verify provider+key+model work."""
    try:
        out = chat(
            call,
            [{"role": "user", "content": "Reply with the single word OK."}],
            max_tokens=8,
            temperature=0,
        )
        return {"ok": True, "response": out.strip()}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)[:300]}
