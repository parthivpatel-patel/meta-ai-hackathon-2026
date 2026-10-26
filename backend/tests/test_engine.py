import ast
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from forge.engine import routes
from forge.engine.contracts import (
    BlindInput,
    ExperimentKind,
    Proposal,
    digest,
)
from forge.engine.hypotheses import (
    describe_selection,
)
from forge.engine.investigation import Investigation
from forge.engine.oracle import CaseRecipe, SyntheticOracle
from forge.engine.reporting import Report, make_report, render_html, replay_report
from forge.engine.verifier import interval, verify
from forge.evaluate import evaluate
from forge.main import app
from pydantic import ValidationError


def run(**kwargs):
    return Investigation("session", SyntheticOracle(CaseRecipe(**kwargs))).run()


def reseal(result):
    raw = {
        "dataset_hash": result.dataset_hash,
        "kind": result.kind,
        "probes": [p.model_dump() for p in result.probes],
    }
    return result.model_copy(update={"id": "EXP-" + digest(raw)})


@pytest.mark.parametrize(
    "scenario,target,experiment",
    [
        ("normal", "normal", "reference_check"),
        ("cooling_loss", "process-temperature", "restore_cooling"),
        ("imbalance", "process-vibration", "balance_rotor"),
        ("pressure_loss", "process-pressure", "restore_feed"),
    ],
)
def test_full_investigation(scenario, target, experiment):
    s = run(scenario=scenario)
    assert s.status == "VERIFIED" and s.selection.kind == experiment
    assert (
        s.verification.decision == "SUPPORTED_SYNTHETIC"
        and s.verification.finding == target
    )
    assert s.verification.causal_scope == "synthetic_model_only"
    assert len(s.candidates) == 7 and all(
        c.source == "deterministic_rules_not_meta" for c in s.candidates
    )
    assert len(s.experiment.probes) == 3 and all(
        len(p.witness_before) == 24 for p in s.experiment.probes
    )
    assert replay_report(make_report(s)) == s.verification


@pytest.mark.parametrize("channel", ["temperature", "vibration", "pressure"])
def test_sensor_alternative(channel):
    s = run(scenario="normal", sensor_bias=channel)
    assert s.verification.finding == "sensor-" + channel
    process = next(
        a for a in s.verification.assessments if a.hypothesis_id == "process-" + channel
    )
    assert process.status == "CONTRADICTED"


@pytest.mark.parametrize(
    "kwargs,decision",
    [
        ({"missing_fraction": 0.8}, "ABSTAIN"),
        ({"confounder": True}, "INCONCLUSIVE"),
        ({"sensor_bias": "vibration"}, "INCONCLUSIVE"),
        ({"sensor_bias": "temperature"}, "INCONCLUSIVE"),
    ],
)
def test_abstention_on_insufficient_or_conflicting_data(kwargs, decision):
    s = run(**kwargs)
    assert s.verification.decision == decision and s.verification.finding is None
    assert s.verification.reasons


def test_missing_data_preserved_and_handled():
    s = run(missing_fraction=0.15)
    assert any(r.temperature is None for r in s.measurements)
    assert s.verification.finding == "process-temperature"
    assert sum(e.missing_count for e in s.evidence) > 0


def test_ground_truth_not_in_generator_inputs(monkeypatch):
    from forge.engine import investigation

    seen = []
    original = investigation.generate_candidates

    def spy(observed):
        assert isinstance(observed, BlindInput)
        assert set(observed.model_dump()) == {"signals", "quality_issues"}
        assert not any(
            word in observed.model_dump_json()
            for word in [
                "cooling_loss",
                "imbalance",
                "pressure_loss",
                "seed",
                "scenario",
            ]
        )
        seen.append(observed)
        return original(observed)

    monkeypatch.setattr(investigation, "generate_candidates", spy)
    oracle = SyntheticOracle(CaseRecipe(scenario="imbalance"))
    result = Investigation("opaque", oracle).run()
    assert seen and result.verification.finding == "process-vibration"
    assert not any(
        key in result.model_dump() for key in ["scenario", "seed", "recipe", "truth"]
    )
    with pytest.raises(ValidationError):
        BlindInput(signals=[], quality_issues=[], scenario="cooling_loss")


def test_module_independence():
    import forge.engine.hypotheses as generator
    import forge.engine.verifier as verifier

    for module in [generator, verifier]:
        tree = ast.parse(Path(module.__file__).read_text())
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                assert not any(
                    name in (node.module or "")
                    for name in ["oracle", "hypotheses", "investigation"]
                )
                assert not any(
                    alias.name in ["simulate", "SHIFTS", "CaseRecipe"]
                    for alias in node.names
                )


def test_generator_text_cannot_override_verifier(monkeypatch):
    from forge.engine import investigation

    monkeypatch.setattr(investigation, "generate_candidates", lambda observed: [])
    s = run()
    assert not s.candidates and s.verification.finding == "process-temperature"
    rejected = verify(s.measurements, s.experiment, Proposal(hypothesis_id="normal"))
    assert rejected.decision == "REJECTED"
    physical = verify(
        s.measurements,
        s.experiment,
        Proposal(hypothesis_id="process-temperature", scope="physical_cause"),
    )
    assert physical.decision == "REJECTED" and "physical-world" in physical.reasons[0]
    assert verify(s.measurements, None).decision == "INCONCLUSIVE"


def test_mismatched_intervention_does_not_support_cause():
    oracle = SyntheticOracle(CaseRecipe())
    result = oracle.execute(
        describe_selection(ExperimentKind.FEED, "test competing intervention")
    )
    assert verify(oracle.rows, result).decision == "INCONCLUSIVE"


def test_intervention_mechanism_and_statistics():
    s = run()
    stat = next(x for x in s.verification.statistics if x.channel == "temperature")
    expected_remaining = 9 * (0.15 + 0.85 * 0.75**24)
    assert stat.witness_before.estimate == pytest.approx(9, abs=0.5)
    assert stat.witness_after.estimate == pytest.approx(expected_remaining, abs=0.5)
    assert stat.witness_reduction.low > 3
    assert interval([1.0] * 24).low == 1 and interval([1.0] * 24).high == 1
    from scipy.stats import t

    data = list(range(24))
    ci = interval(data)
    assert ci.estimate == 11.5
    assert ci.high - ci.estimate == pytest.approx(
        t.ppf(0.995, 23) * np.std(data, ddof=1) / np.sqrt(24)
    )
    with pytest.raises(ValueError):
        interval([1.0] * 15)


def test_evidence_binding_and_misaligned_replicates():
    s = run()
    tampered = s.experiment.model_copy(update={"dataset_hash": "0" * 64})
    assert verify(s.measurements, tampered).decision == "REJECTED"
    p = s.experiment.probes[0].model_copy(update={"witness_after": [0.0] * 15})
    changed = reseal(
        s.experiment.model_copy(update={"probes": [p, *s.experiment.probes[1:]]})
    )
    assert verify(s.measurements, changed).decision == "ABSTAIN"
    duplicate = reseal(
        s.experiment.model_copy(update={"probes": [s.experiment.probes[0]] * 3})
    )
    assert verify(s.measurements, duplicate).decision == "REJECTED"


def test_uncertain_intervals_abstain():
    s = run(scenario="normal")
    probes = [
        p.model_copy(
            update={
                key: [3.0] * 24
                for key in [
                    "primary_before",
                    "primary_after",
                    "witness_before",
                    "witness_after",
                ]
            }
        )
        for p in s.experiment.probes
    ]
    result = reseal(s.experiment.model_copy(update={"probes": probes}))
    assert verify(s.measurements, result).decision == "INCONCLUSIVE"


def test_determinism_and_report_replay_rejects_tampering():
    first, second = make_report(run()), make_report(run())
    assert first.model_dump_json() == second.model_dump_json()
    assert (
        replay_report(Report.model_validate_json(first.model_dump_json())).finding
        == "process-temperature"
    )
    forged = first.model_copy(
        update={
            "investigation": first.investigation.model_copy(
                update={
                    "verification": first.investigation.verification.model_copy(
                        update={"finding": "normal"}
                    )
                }
            )
        }
    )
    with pytest.raises(ValueError, match="replay mismatch"):
        replay_report(forged)
    wrong = first.model_copy(update={"evidence_references": []})
    with pytest.raises(ValueError, match="metadata mismatch"):
        replay_report(wrong)
    changed_selection = first.investigation.selection.model_copy(
        update={"rationale": "invented provenance"}
    )
    changed_report = first.model_copy(
        update={
            "investigation": first.investigation.model_copy(
                update={"selection": changed_selection}
            )
        }
    )
    with pytest.raises(ValueError, match="Selection metadata mismatch"):
        replay_report(changed_report)
    polluted = first.investigation.candidates[0].model_copy(
        update={"title": "<script>alert(1)</script>"}
    )
    html = render_html(
        first.model_copy(
            update={
                "investigation": first.investigation.model_copy(
                    update={"candidates": [polluted]}
                )
            }
        )
    )
    assert "<script>" not in html and "&lt;script&gt;" in html


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setattr(routes, "store", routes.SessionStore())
    with TestClient(app) as client:
        yield client


def test_phase1_api_contract_and_export(api):
    r = api.post(
        "/api/v1/investigations", json={"scenario": "cooling_loss", "seed": 42}
    )
    assert r.status_code == 201
    base = "/api/v1/investigations/" + r.json()["id"]
    assert r.json()["status"] == "OBSERVED" and "scenario" not in r.json()
    assert api.get(base + "/report.json").status_code == 409
    assert api.post(base + "/verification").status_code == 409
    for path, status in [
        ("hypotheses", "HYPOTHESES_READY"),
        ("selection", "EXPERIMENT_SELECTED"),
        ("experiments", "EXPERIMENT_COMPLETE"),
        ("verification", "VERIFIED"),
    ]:
        response = api.post(base + "/" + path, json={} if path == "selection" else None)
        assert response.status_code == 200, response.text
        assert response.json()["status"] == status
        assert (
            api.post(base + "/" + path, json={} if path == "selection" else None).json()
            == response.json()
        )
    report = api.get(base + "/report.json")
    assert (
        replay_report(Report.model_validate_json(report.content)).finding
        == "process-temperature"
    )
    assert "attachment" in report.headers["content-disposition"]
    html = api.get(base + "/report.html")
    assert (
        "default-src" in html.headers["content-security-policy"]
        and "<script" not in html.text
    )
    assert api.get(base).json()["verification"]["decision"] == "SUPPORTED_SYNTHETIC"


def test_api_bounds_capacity_expiry_and_allowlist(api, monkeypatch):
    assert api.post("/api/v1/investigations", json={"seed": -1}).status_code == 422
    assert (
        api.post("/api/v1/investigations", json={"command": "rm -rf /"}).status_code
        == 422
    )
    monkeypatch.setattr(routes, "store", routes.SessionStore(capacity=1))
    first = api.post("/api/v1/investigations", json={}).json()
    base = "/api/v1/investigations/" + first["id"]
    assert api.post("/api/v1/investigations", json={}).status_code == 429
    api.post(base + "/hypotheses")
    assert (
        api.post(base + "/selection", json={"kind": "exec_python"}).status_code == 422
    )
    monkeypatch.setattr(routes.store, "ttl", -1)
    assert api.get(base).status_code == 404
    assert api.get("/api/v1/investigations/unknown").status_code == 404


def test_evaluation_is_reproducible_and_counts_cases():
    first = evaluate(range(2))
    assert first == evaluate(range(2))
    assert first["overall"]["cases"] == 48
    assert first["by_profile"]["clean"]["verification_precision"]["numerator"] == 8
    assert first["by_profile"]["missing75"]["decisions"] == {"ABSTAIN": 8}
    # Evaluation reports failures/abstentions rather than forcing desired accuracy.
    assert first["overall"]["required_abstention_recall"]["denominator"] == 18


@pytest.mark.parametrize(
    "proposal",
    [
        {"hypothesis_id": "normal"},
        {"hypothesis_id": "process-temperature", "scope": "physical_cause"},
    ],
)
def test_api_rejects_unsupported_proposals(api, proposal):
    identifier = api.post("/api/v1/investigations", json={}).json()["id"]
    base = "/api/v1/investigations/" + identifier
    api.post(base + "/hypotheses")
    api.post(base + "/selection", json={})
    api.post(base + "/experiments")
    result = api.post(base + "/verification", json={"proposal": proposal})
    assert (
        result.status_code == 200
        and result.json()["verification"]["decision"] == "REJECTED"
    )
    report = Report.model_validate_json(api.get(base + "/report.json").content)
    assert replay_report(report).decision == "REJECTED"
    assert (
        api.post(
            base + "/verification", json={"unrestricted_claim": "physical proof"}
        ).status_code
        == 422
    )
