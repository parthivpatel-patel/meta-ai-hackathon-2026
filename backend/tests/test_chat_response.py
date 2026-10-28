"""Deterministic protocol tests. Injected MockTransport only, never real inference."""

import asyncio
import copy
import json
import traceback

import httpx
import pytest
from forge.engine.contracts import BlindInput
from forge.phase2.evidence import demo_assets
from forge.phase2.inference import ENDPOINTS, ChatProvider, TransportSettings
from forge.phase2.oracle import Recipe
from forge.phase2.service import investigate, replay
from forge.providers import ProviderError

KEY = "fixture-only-parser-test-key-not-a-provider-credential"
MARKER = "UNTRUSTED_PRIVATE_MODEL_TEXT_DO_NOT_LOG"


@pytest.fixture(autouse=True)
def no_real_transport(monkeypatch):
    async def forbidden(*args, **kwargs):
        raise AssertionError("Real HTTP is forbidden in parser regressions")

    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", forbidden)


def output():
    return {
        "hypotheses": [
            {
                "hypothesis_id": "normal",
                "rationale": "A competing synthetic candidate.",
                "evidence_channels": ["temperature"],
                "scope": "synthetic_mechanism",
            }
        ]
    }


def envelope(content=None):
    return {
        "model": "meta-models/muse-spark-open-1026",
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": json.dumps(output()) if content is None else content,
                },
            }
        ],
    }


def provider(body, **kwargs):
    settings = TransportSettings(
        api_key=KEY,
        BASETEN_API_KEY=None,
        FORGE_INFERENCE_KEY=None,
        enabled=True,
        free_access_confirmed=True,
        request_budget=1,
        token_budget=8192,
        max_tokens=1024,
        retry_limit=0,
        timeout_seconds=15,
        total_timeout_seconds=30,
        **kwargs,
    )
    wire = []

    def respond(request):
        wire.append(json.loads(request.content))
        if isinstance(body, str):
            return httpx.Response(200, content=body)
        return httpx.Response(200, json=body)

    return ChatProvider(settings, httpx.MockTransport(respond)), wire


def infer(p):
    return asyncio.run(p.infer(BlindInput(signals=[], quality_issues=[]), {}))


@pytest.mark.parametrize("wrapper", ["bare", "json_fence", "plain_fence", "crlf_fence"])
@pytest.mark.parametrize("reasoning", [None, MARKER + " {not valid JSON}"])
def test_complete_final_json_is_valid_with_separate_reasoning(wrapper, reasoning):
    text = json.dumps(output())
    text = {
        "bare": text,
        "json_fence": f"```json\n{text}\n```",
        "plain_fence": f"```\n{text}\n```",
        "crlf_fence": f" \n```json\r\n{text}\r\n``` \t",
    }[wrapper]
    body = envelope(text)
    body["choices"][0]["message"]["reasoning_content"] = reasoning
    p, wire = provider(body)
    result = infer(p)
    assert result.source == "test_transport" and result.output.model_dump() == output()
    assert p.used == len(wire) == 1
    assert wire[0]["reasoning_effort"] == "low"
    assert wire[0]["max_tokens"] == 1024
    assert not {"response_format", "reasoning", "chat_template_args"} & wire[0].keys()
    assert "no Markdown or prose" in wire[0]["messages"][0]["content"]
    assert MARKER not in result.model_dump_json() + json.dumps(p.attempts)
    assert p.attempts[0]["response_structure"]["reasoning_present"]
    assert p.attempts[0]["validation_code"] is None


def test_other_provider_does_not_receive_muse_reasoning_control():
    body = envelope()
    body["model"] = "muse-spark-1.3"
    p, wire = provider(
        body, provider="meta", endpoint=ENDPOINTS["meta"], model_id=body["model"]
    )
    assert infer(p).requested_model == body["model"]
    assert "reasoning_effort" not in wire[0]


def test_usage_including_reasoning_survives_a_rejected_length_stop():
    body = envelope("")
    body["choices"][0]["finish_reason"] = "length"
    body["choices"][0]["message"]["reasoning_content"] = MARKER
    body["usage"] = {
        "prompt_tokens": 23,
        "completion_tokens": 1024,
        "total_tokens": 1047,
        "completion_tokens_details": {"reasoning_tokens": 1024},
    }
    p, _ = provider(body)
    with pytest.raises(ProviderError):
        infer(p)
    d = p.attempts[0]
    assert d["validation_code"] == "output_truncated"
    assert d["provider_reported_usage"]["completion_tokens"] == 1024
    assert d["response_structure"]["reasoning_tokens"] == 1024
    assert d["response_structure"]["content_characters"] == 0
    assert MARKER not in json.dumps(d)


def test_valid_final_answer_keeps_numeric_usage_but_not_reasoning_text():
    body = envelope()
    body["choices"][0]["message"]["reasoning_content"] = MARKER
    body["usage"] = {
        "prompt_tokens": 23,
        "completion_tokens": 920,
        "total_tokens": 943,
        "completion_tokens_details": {"reasoning_tokens": 800},
    }
    p, _ = provider(body)
    result = infer(p)
    assert result.usage.completion_tokens == 920
    assert p.attempts[0]["response_structure"]["reasoning_tokens"] == 800
    assert p.attempts[0]["response_valid"] and p.attempts[0]["validation_code"] is None
    assert MARKER not in result.model_dump_json() + json.dumps(p.attempts)


@pytest.mark.parametrize(
    "content,code",
    [
        ("not JSON", "content_json_invalid"),
        ('{"hypotheses":', "content_json_invalid"),
        ('{"hypotheses":[],"hypotheses":[]}', "content_json_invalid"),
        ('{"hypotheses":NaN}', "content_json_invalid"),
        ("[]", "hypothesis_schema_invalid"),
        ("{}", "hypothesis_schema_invalid"),
        ('{"hypotheses":[]}', "hypothesis_schema_invalid"),
        ("", "final_content_empty"),
        (" \n\t", "final_content_empty"),
        ([{"type": "text", "text": "{}"}], "final_content_type_invalid"),
        ({"hypotheses": []}, "final_content_type_invalid"),
    ],
)
def test_invalid_or_incomplete_final_content_is_never_repaired(content, code):
    p, wire = provider(envelope(content))
    with pytest.raises(ProviderError):
        infer(p)
    assert p.attempts[0]["validation_code"] == code and len(wire) == 1
    assert not p.attempts[0]["response_valid"]


@pytest.mark.parametrize(
    "mode,code",
    [
        ("choices_missing", "choices_invalid"),
        ("choices_empty", "choices_invalid"),
        ("choices_null", "choices_invalid"),
        ("choices_object", "choices_invalid"),
        ("choices_multiple", "choices_invalid"),
        ("choice_null", "choices_invalid"),
        ("message_missing", "message_invalid"),
        ("message_null", "message_invalid"),
        ("message_string", "message_invalid"),
        ("content_null", "final_content_empty"),
        ("content_missing", "final_content_empty"),
        ("finish_missing", "finish_reason_rejected"),
        ("finish_unknown", "finish_reason_rejected"),
        ("truncated", "output_truncated"),
        ("tool", "tool_output_rejected"),
        ("function", "tool_output_rejected"),
        ("refusal", "refusal_rejected"),
        ("wrong_role", "message_role_invalid"),
    ],
)
def test_response_envelope_failure_diagnostics_are_specific_and_sanitized(mode, code):
    body = envelope()
    c = body["choices"][0]
    m = c["message"]
    if mode == "choices_missing":
        del body["choices"]
    elif mode == "choices_empty":
        body["choices"] = []
    elif mode == "choices_null":
        body["choices"] = None
    elif mode == "choices_object":
        body["choices"] = {MARKER: []}
    elif mode == "choices_multiple":
        body["choices"].append(copy.deepcopy(c))
    elif mode == "choice_null":
        body["choices"] = [None]
    elif mode == "message_missing":
        del c["message"]
    elif mode == "message_null":
        c["message"] = None
    elif mode == "message_string":
        c["message"] = MARKER
    elif mode == "content_null":
        m.update(content=None, reasoning_content=MARKER)
    elif mode == "content_missing":
        del m["content"]
    elif mode == "finish_missing":
        del c["finish_reason"]
    elif mode == "finish_unknown":
        c["finish_reason"] = MARKER
    elif mode == "truncated":
        c["finish_reason"] = "length"
    elif mode == "tool":
        m["tool_calls"] = [{"name": MARKER}]
    elif mode == "function":
        m["function_call"] = {"name": MARKER}
    elif mode == "refusal":
        m["refusal"] = MARKER
    elif mode == "wrong_role":
        m["role"] = MARKER
    p, wire = provider(body)
    with pytest.raises(ProviderError) as exc:
        infer(p)
    assert p.attempts[0]["validation_code"] == code
    assert MARKER not in json.dumps(p.attempts) + str(exc.value)
    # A second local call must fail before transport, not silently retry/fallback.
    with pytest.raises(ProviderError):
        infer(p)
    assert p.used == len(wire) == 1


@pytest.mark.parametrize(
    "mode", ["id", "scope", "extra", "rationale_type", "rationale_length", "duplicates"]
)
def test_hypothesis_schema_stays_strict_without_logging_values_or_extra_field_names(
    mode,
):
    data = output()
    h = data["hypotheses"][0]
    if mode == "id":
        h["hypothesis_id"] = MARKER
    elif mode == "scope":
        h["scope"] = MARKER
    elif mode == "extra":
        h[MARKER] = MARKER
    elif mode == "rationale_type":
        h["rationale"] = 23
    elif mode == "rationale_length":
        h["rationale"] = MARKER * 100
    elif mode == "duplicates":
        data["hypotheses"].append(copy.deepcopy(h))
    p, _ = provider(envelope(json.dumps(data)))
    with pytest.raises(ProviderError) as exc:
        infer(p)
    d = p.attempts[0]
    assert d["validation_code"] == "hypothesis_schema_invalid" and d["schema_errors"]
    assert MARKER not in json.dumps(d) + str(exc.value)
    assert MARKER not in "".join(traceback.format_exception(exc.value))
    assert len(d["schema_errors"]) <= 8


@pytest.mark.parametrize(
    "mode", ["prefix", "suffix", "multiple", "think", "unterminated"]
)
def test_json_is_not_extracted_from_prose_reasoning_or_multiple_fences(mode):
    text = json.dumps(output())
    content = {
        "prefix": "Answer: " + text,
        "suffix": text + " done",
        "multiple": f"```json\n{text}\n```\n```json\n{text}\n```",
        "think": f"<think>{MARKER}</think>{text}",
        "unterminated": "```json\n" + text,
    }[mode]
    p, _ = provider(envelope(content))
    with pytest.raises(ProviderError):
        infer(p)
    assert p.attempts[0]["validation_code"] == "content_json_invalid"


@pytest.mark.parametrize(
    "usage",
    [
        [],
        {},
        {"prompt_tokens": True, "completion_tokens": 1, "total_tokens": 2},
        {"prompt_tokens": 1, "completion_tokens": "2", "total_tokens": 3},
        {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 1},
        *[
            {
                "prompt_tokens": 1,
                "completion_tokens": 2,
                "total_tokens": 3,
                "completion_tokens_details": {"reasoning_tokens": n},
            }
            for n in [-1, 3, True, MARKER]
        ],
        {
            "prompt_tokens": 1,
            "completion_tokens": 2,
            "total_tokens": 3,
            "completion_tokens_details": [],
        },
    ],
)
def test_malformed_usage_is_rejected_without_coercion(usage):
    body = envelope()
    body["usage"] = usage
    p, _ = provider(body)
    with pytest.raises(ProviderError):
        infer(p)
    assert p.attempts[0]["validation_code"] == "usage_invalid"
    assert MARKER not in json.dumps(p.attempts)


def test_reported_output_above_the_configured_limit_is_rejected():
    body = envelope()
    body["usage"] = {
        "prompt_tokens": 1,
        "completion_tokens": 1025,
        "total_tokens": 1026,
    }
    p, _ = provider(body)
    with pytest.raises(ProviderError):
        infer(p)
    assert p.attempts[0]["validation_code"] == "output_token_limit_exceeded"


@pytest.mark.parametrize(
    "body,code",
    [
        ("not JSON", "envelope_json_invalid"),
        ("[]", "envelope_type_invalid"),
        ('{"model":"x","model":"y"}', "envelope_json_invalid"),
    ],
)
def test_invalid_outer_json_has_a_distinct_diagnostic(body, code):
    p, _ = provider(body)
    with pytest.raises(ProviderError):
        infer(p)
    assert p.attempts[0]["validation_code"] == code


def test_model_identity_and_reflected_credentials_remain_rejected():
    for mode in ["identity", "key"]:
        body = envelope()
        if mode == "identity":
            body["model"] = MARKER
        else:
            body["choices"][0]["message"]["reasoning_content"] = KEY
        p, _ = provider(body)
        with pytest.raises(ProviderError) as exc:
            infer(p)
        assert p.used == 1 and not p.attempts[0]["response_valid"]
        assert KEY not in json.dumps(p.attempts) + str(exc.value)
        assert MARKER not in json.dumps(p.attempts)


def test_normalized_model_answer_cannot_override_independent_numerical_verification():
    body = envelope("```json\n" + json.dumps(output()) + "\n```")
    body["choices"][0]["message"]["reasoning_content"] = MARKER
    p, wire = provider(body)
    result = asyncio.run(investigate(Recipe(), demo_assets(), p))
    assert result.model_source == "test_transport"
    assert result.verification.findings == ["process-temperature"]
    assert result.model_assessments[0].status == "NOT_SUPPORTED"
    assert replay(result) == result.verification
    assert p.used == len(wire) == 1
    assert MARKER not in result.model_dump_json()
