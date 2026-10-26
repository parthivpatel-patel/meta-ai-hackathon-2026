"""Real-process workflow and export check; run after starting backend and Vite."""

import json
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "http://127.0.0.1:5173/api/v1/investigations"


def request(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = Request(url, data=data, headers={"Content-Type": "application/json"})
    with urlopen(req, timeout=15) as response:
        return response.read()


for scenario, expected in [
    ("normal", "normal"),
    ("cooling_loss", "process-temperature"),
    ("imbalance", "process-vibration"),
    ("pressure_loss", "process-pressure"),
]:
    snapshot = json.loads(request(BASE, {"scenario": scenario, "seed": 42}))
    case_url = BASE + "/" + snapshot["id"]
    for suffix in ["hypotheses", "selection", "experiments", "verification"]:
        snapshot = json.loads(request(case_url + "/" + suffix, {}))
    assert snapshot["verification"]["finding"] == expected, snapshot
    report = request(case_url + "/report.json")
    assert json.loads(report)["investigation"]["verification"]["finding"] == expected
    html = request(case_url + "/report.html").decode()
    assert "Synthetic investigation report" in html and "<script" not in html
    if scenario == "cooling_loss":
        Path("/tmp/forge-phase1-report.json").write_bytes(report)
    print(scenario, "workflow + JSON/HTML exports passed")
