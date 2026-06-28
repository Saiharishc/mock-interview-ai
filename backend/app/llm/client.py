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
    message = response["choices"][0]["message"]
    content = message.get("content") if hasattr(message, "get") else message["content"]

    # Thinking models (e.g. gemini-2.5-flash) may return None content with
    # reasoning in a separate field — extract it as fallback.
    if content is None:
        content = (
            getattr(message, "reasoning_content", None)
            or (message.get("reasoning_content") if hasattr(message, "get") else None)
        )

    if not content:
        logger.error("Empty LLM response. Full message: %s", message)
        raise RuntimeError(
            f"LLM returned empty content for model '{kwargs.get('model')}'. "
            "Try a non-thinking variant (e.g. gemini-2.5-flash-lite) or check your quota."
        )
    return content


def _strip_markdown(text: str) -> str:
    """Strip markdown code fences that some models wrap around JSON."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]  # remove opening ```json line
        text = text.rsplit("```", 1)[0]  # remove closing ```
    return text.strip()


def chat_json(call: ProviderCall, messages: list[dict[str, str]], **kwargs: Any) -> dict[str, Any]:
    """Chat with JSON response. Retries once on parse failure."""
    raw = chat(call, messages, json_mode=True, **kwargs)
    try:
        return json.loads(_strip_markdown(raw))
    except json.JSONDecodeError:
        logger.warning("JSON parse failed, retrying once")
        retry_messages = messages + [
            {"role": "assistant", "content": raw},
            {"role": "user", "content": "Your previous response was not valid JSON. Reply with only a valid JSON object, no markdown."},
        ]
        raw = chat(call, retry_messages, json_mode=True, **kwargs)
        return json.loads(_strip_markdown(raw))


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
