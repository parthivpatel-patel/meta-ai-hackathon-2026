import copy
import json

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from forge.industrial.investigation import (
    Context,
    InvestigationRequest,
    investigate,
    render,
    replay,
)
from forge.industrial.model import COMPONENTS, SENSORS, Recipe, simulate
from forge.industrial.telemetry import load
from forge.main import app


@pytest.mark.parametrize(
    "scenario",
    [
        "normal",
        "bearing",
        "misalignment",
        "cavitation",
        "pressure_sensor",
        "thermal",
        "process",
    ],
)
def test_coupled_determinism_binding_and_replay(scenario):
    recipe = Recipe(scenario=scenario)
    assert simulate(recipe) == simulate(recipe)
    r = investigate(InvestigationRequest(recipe=recipe, experiments=4))
    assert replay(r) == r
    assert all(t["simulator"] == "coupled-pump-1" for t in r["trials"])
    assert "No physical actuation" in render(r)
    changed = copy.deepcopy(r)
    changed["measurements"][0]["pressure"] += 1
    with pytest.raises(ValueError):
        replay(changed)


def values(frame):
    return {r["sensor_id"]: r["value"] for r in frame["readings"]}


def test_coupled_physics_sensor_process_and_interventions():
    base = simulate(Recipe(), True)["frames"][319]
    sensor = simulate(Recipe(scenario="pressure_sensor"), True)["frames"][319]
    assert sensor["truth"] == base["truth"]
    assert values(sensor)["discharge_pressure"] - values(base)[
        "discharge_pressure"
    ] == pytest.approx(1.2)
    process = simulate(Recipe(scenario="process"), True)["frames"][319]
    assert process["truth"]["flow"] < base["truth"]["flow"]
    assert process["truth"]["discharge_pressure"] < base["truth"]["discharge_pressure"]
    assert values(sensor)["differential_pressure"] == pytest.approx(
        values(sensor)["discharge_pressure"] - values(sensor)["suction_pressure"],
        abs=1e-5,
    )
    repaired = simulate(
        Recipe(
            scenario="thermal",
            steps=600,
            actions=[{"sequence": 320, "kind": "restore_cooling"}],
        ),
        True,
    )
    assert repaired["frames"][-1]["truth"]["motor_temperature"] < 66
    assert repaired["frames"][-1]["state"] == "RUNNING"
    stopped = simulate(Recipe(steps=600, actions=[{"sequence": 320, "kind": "stop"}]))
    assert stopped["frames"][-1]["state"] == "STOPPED"
    assert len(stopped["frames"]) == 600


def test_components_and_units_are_closed():
    for part in COMPONENTS.values():
        assert part["parent"] == "pump-104"
        assert set(part["sensors"]) <= set(SENSORS)
    assert all(s[0] in COMPONENTS for s in SENSORS.values())


@pytest.mark.parametrize(
    "change",
    [
        {"steps": 601},
        {"seed": -1},
        {"scenario": "http://evil.invalid"},
        {"actions": [{"sequence": 1, "kind": "restore_feed"}]},
        {
            "actions": [
                {"sequence": 300, "kind": "stop"},
                {"sequence": 301, "kind": "reset_fault"},
            ]
        },
    ],
)
def test_bounds_and_illegal_transitions(change):
    with pytest.raises(ValidationError):
        Recipe(**change)


def test_no_future_or_modified_capture():
    with pytest.raises(ValueError):
        investigate(InvestigationRequest(context=Context(component_id="base")))
    with pytest.raises(ValidationError):
        Context(at_sequence=318)
    with pytest.raises(ValueError):
        investigate(InvestigationRequest(context=Context(component_id="unknown")))
    with pytest.raises(ValueError):
        investigate(
            InvestigationRequest(
                recipe=Recipe(actions=[{"sequence": 320, "kind": "stop"}])
            )
        )
    with pytest.raises(ValueError):
        replay({"schema": "forge-report-unknown"})


def test_api_integration_and_no_provider(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Provider initialized")

    monkeypatch.setattr("forge.phase3.routes.get_provider", forbidden)
    with TestClient(app) as client:
        assert client.get("/api/v4/catalog").json()["connected"] == "UNAVAILABLE"
        result = client.post("/api/v4/simulate", json={"scenario": "bearing"})
        assert result.status_code == 200 and "truth" not in result.text
        r = client.post(
            "/api/v4/investigate",
            json={"recipe": {"scenario": "pressure_sensor"}, "experiments": 2},
        )
        assert r.status_code == 200 and r.json()["decision"]["findings"] == [
            "sensor-pressure"
        ]
        h = client.post(
            "/api/v4/report.html",
            json={"recipe": {"scenario": "bearing"}, "experiments": 2},
        )
        assert h.status_code == 200 and "<h1>" in h.text
        assert (
            client.post(
                "/api/v4/simulate",
                json={"scenario": "normal", "endpoint": "http://evil.invalid"},
            ).status_code
            == 422
        )
        assert (
            client.post("/api/v4/simulate", json={"steps": 100000}).status_code == 422
        )


def sample(**kwargs):
    return dict(
        timestamp="2026-10-27T08:00:00Z",
        sensor_id="vibration",
        component_id="bearing",
        value=2,
        unit="mm/s",
        **kwargs,
    )


def test_offline_imports_and_adversarial_data():
    row = sample()
    record = {"schema": "forge-telemetry-1", "machine_id": "pump-104", "samples": [row]}
    assert load(json.dumps(record).encode()).samples[0].value == 2
    for key, value in [
        ("unit", "rpm"),
        ("component_id", "motor"),
        ("timestamp", "2026-02-30T08:00:00Z"),
        ("value", float("nan")),
        ("sensor_id", "__import__"),
    ]:
        bad = copy.deepcopy(record)
        bad["samples"][0][key] = value
        with pytest.raises((ValueError, ValidationError)):
            load(json.dumps(bad).encode())
    with pytest.raises(ValueError):
        load(b"x" * 1048577)
    with pytest.raises(ValidationError):
        load(json.dumps({**record, "samples": [row, row]}).encode())
    csv = b"timestamp,sensor_id,component_id,value,unit\n2026-10-27T08:00:00Z,vibration,bearing,2,mm/s\n"
    assert load(csv, "csv").samples[0].value == 2


def test_sampling_interval_and_deterministic_shutdown():
    slow = simulate(Recipe(sample_period_seconds=5))
    assert slow["frames"][1]["timestamp"] == "2026-10-27T08:00:05+00:00"
    assert (
        slow["frames"][10]["readings"][0]["value"]
        > simulate(Recipe())["frames"][10]["readings"][0]["value"]
    )
    with pytest.raises(ValidationError):
        Recipe(sample_period_seconds=3)


def test_report_window_tracks_nondefault_onset_and_sampling():
    recipe = Recipe(scenario="bearing", onset=250, sample_period_seconds=5)
    report = investigate(InvestigationRequest(recipe=recipe))
    assert report["evidence_window"] == {
        "first_sequence": 170,
        "last_sequence": 289,
        "time_step_seconds": 5,
        "legacy_index_field": "minute is a sample index in this adapter, not elapsed minutes",
    }
    frames = simulate(recipe)["frames"]
    assert report["measurements"][0]["vibration"] == values(frames[170])["vibration"]
    assert report["measurements"][-1]["vibration"] == values(frames[289])["vibration"]
    assert replay(report) == report


def test_replay_rejects_boolean_numeric_type_substitution_even_with_resealed_hash():
    from forge.engine.contracts import digest

    original = investigate(InvestigationRequest())
    for reseal in (False, True):
        changed = copy.deepcopy(original)
        changed["measurements"][1]["minute"] = True
        if reseal:
            changed["report_hash"] = digest(
                {k: v for k, v in changed.items() if k != "report_hash"}
            )
        with pytest.raises(ValueError):
            replay(changed)


def test_public_industrial_boundary_is_closed_and_never_initializes_inference(
    monkeypatch,
):
    from forge.phase3 import safety

    config = safety.DemoSettings(mode="public", allowed_hosts=["testserver"])
    monkeypatch.setattr(safety, "settings", lambda: config)
    import forge.phase2.inference as provider

    monkeypatch.setattr(
        provider,
        "get_provider",
        lambda: (_ for _ in ()).throw(
            AssertionError("Provider initialization forbidden")
        ),
    )
    with TestClient(app) as client:
        assert client.get("/api/v4/catalog").status_code == 200
        assert client.get("/docs").status_code == 403
        assert client.post("/api/v4/control-write", json={}).status_code == 403
        assert (
            client.post("/api/v4/simulate", json={"use_meta": True}).status_code == 422
        )
        assert (
            client.post("/api/v4/simulate", content=b"x" * 1048577).status_code == 413
        )
        assert (
            client.post(
                "/api/v4/investigate",
                json={"context": {"component_id": "<script>", "at_sequence": 319}},
            ).status_code
            == 422
        )


def test_coupled_source_cannot_be_relabeled_as_legacy_trial():
    from forge.phase2.contracts import Trial

    report = investigate(
        InvestigationRequest(recipe=Recipe(scenario="bearing"), experiments=2)
    )
    with pytest.raises(ValidationError):
        Trial.model_validate(report["trials"][0])


def test_prepared_model_evidence_excludes_ground_truth_and_secrets():
    from forge.industrial.investigation import proposal_evidence

    r = investigate(
        InvestigationRequest(recipe=Recipe(scenario="bearing"), experiments=2)
    )
    payload = proposal_evidence(r)
    assert (
        payload["mode"] == "SIMULATION_ONLY"
        and len(payload["experiment_summaries"]) == 6
    )
    text = json.dumps(payload)
    for forbidden in ['"recipe"', '"seed"', '"scenario"', '"truth"', "api_key"]:
        assert forbidden not in text


def test_instrument_variation_is_bounded():
    result = simulate(Recipe(), True)
    limits = {
        "rpm": 6,
        "motor_temperature": 0.45,
        "bearing_temperature": 0.45,
        "vibration": 0.075,
        "suction_pressure": 0.03,
        "discharge_pressure": 0.075,
        "flow": 0.3,
        "load": 0.3,
    }
    for frame in result["frames"]:
        observed = values(frame)
        for sensor, bound in limits.items():
            assert abs(observed[sensor] - frame["truth"][sensor]) <= bound + 1e-5


def test_offline_cli_html_and_proposal_are_exclusive(tmp_path, monkeypatch, capsys):
    from forge.industrial.replay import main

    report = investigate(
        InvestigationRequest(recipe=Recipe(scenario="pressure_sensor"), experiments=2)
    )
    source = tmp_path / "report.json"
    source.write_text(json.dumps(report))
    target = tmp_path / "report.html"
    proposal = tmp_path / "proposal.json"
    monkeypatch.setattr(
        "sys.argv",
        ["replay", str(source), "--html", str(target), "--proposal", str(proposal)],
    )
    main()
    assert "Industrial replay verified" in capsys.readouterr().out
    assert "<h1>" in target.read_text()
    assert json.loads(proposal.read_text())["mode"] == "SIMULATION_ONLY"
    with pytest.raises(FileExistsError):
        main()
