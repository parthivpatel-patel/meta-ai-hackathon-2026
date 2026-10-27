import asyncio
import html

import pytest
from forge.phase2.evidence import demo_assets
from forge.phase3.reporting import export, render, replay
from forge.phase3.service import PRESETS, Metadata, run


@pytest.mark.parametrize(
    "preset,expected",
    [
        ("misleading_sensor", ["process-pressure", "sensor-pressure"]),
        ("temperature_response", ["process-temperature"]),
        ("vibration_response", ["process-vibration"]),
        ("insufficient", []),
        ("noisy_multifault", ["process-vibration"]),
    ],
)
def test_product_cases_are_distinct_reproducible_and_replayed(preset, expected):
    recipe = PRESETS[preset][1]
    session = asyncio.run(run(recipe, assets=demo_assets()))
    assert session.status == "COMPLETE"
    assert session.decision.findings == expected
    report = export(session)
    assert replay(report) == session.decision
    assert (
        report["run_id"]
        == export(asyncio.run(run(recipe, assets=demo_assets())))["run_id"]
    )
    document = render(report)
    for section in [
        "Case information",
        "Independent verification",
        "Uncertainty",
        "Tests and new observations",
        "Evidence and provenance",
        "Technical audit record",
    ]:
        assert section in document
    assert (
        "Rules-based proposals, not Meta inference" in document
        or session.model_source == "not_run"
    )
    if preset == "insufficient":
        assert session.decision.status == "ABSTAIN"


def test_customer_report_escapes_equipment_context():
    metadata = Metadata(investigation_title="<script>alert(1)</script>")
    session = asyncio.run(run(PRESETS["temperature_response"][1], metadata=metadata))
    document = render(export(session))
    assert "<script>" not in document
    assert html.escape(metadata.investigation_title) in document
