import asyncio

import pytest
from forge.experience.routes import payload, reproduce
from forge.phase2.evidence import demo_assets
from forge.phase3.service import PRESETS, Metadata, advance, create


@pytest.mark.parametrize("preset", list(PRESETS))
def test_recovery_reproduces_each_recorded_stage_without_a_provider(preset):
    async def check():
        title, recipe = PRESETS[preset]
        metadata = Metadata(equipment_id="RIG-104", investigation_title=title, acquired_at="2026-10-27T08:00:00Z") if preset in {"temperature_response", "vibration_response"} else Metadata()
        s = create(recipe, demo_assets(), metadata)
        while True:
            recovered, name = await reproduce(s)
            assert name == preset
            assert recovered.id != s.id
            assert recovered.version == 0
            assert payload(recovered) == payload(s)
            if s.status == "COMPLETE":
                break
            s = await advance(s, recipe)
    asyncio.run(check())


@pytest.mark.parametrize("field,value", [("dataset_hash","fake"),("model_source","test_transport"),("max_experiments",3),("verification_scope","Forged certainty")])
def test_recovery_rejects_modified_provenance(field,value):
    s=create(PRESETS["misleading_sensor"][1],demo_assets(),Metadata())
    with pytest.raises(ValueError):
        asyncio.run(reproduce(s.model_copy(update={field:value})))


def test_recovery_rejects_forged_event_history_and_numeric_results():
    async def check():
        s=create(PRESETS["misleading_sensor"][1],demo_assets(),Metadata())
        for _ in range(3):s=await advance(s,PRESETS["misleading_sensor"][1])
        with pytest.raises(ValueError):await reproduce(s.model_copy(update={"events":s.events[:-1]}))
        bad=s.model_copy(deep=True);bad=bad.model_copy(update={"decision":bad.decision.model_copy(update={"findings":["normal"]})})
        with pytest.raises(ValueError):await reproduce(bad)
    asyncio.run(check())


def test_public_recovery_after_server_loss_preserves_budget_and_rejects_tampering(monkeypatch,tmp_path):
    from fastapi.testclient import TestClient
    from forge.main import app
    from forge.phase3 import safety, storage, routes
    from forge.experience import routes as recovery
    config=safety.DemoSettings(mode="public",allowed_hosts=["testserver"],db_path=str(tmp_path/"recover.sqlite3"))
    store=storage.SQLiteStore(config.db_path)
    monkeypatch.setattr(safety,"settings",lambda:config)
    monkeypatch.setattr(routes,"settings",lambda:config)
    for module in [storage,routes,recovery]:monkeypatch.setattr(module,"get_store",lambda:store)
    with TestClient(app, client=("127.0.7.1", 50000)) as client:
        saved=client.post("/api/v3/sessions",json={"preset":"misleading_sensor"}).json()
        for _ in range(3):saved=client.post(f"/api/v3/sessions/{saved['id']}/advance",json={"expected_version":saved["version"]}).json()
        assert len(saved["trials"])==1
        with store.connect() as con:con.execute("DELETE FROM sessions")
        assert client.get(f"/api/v3/sessions/{saved['id']}").status_code==404
        from forge.experience.routes import numeric_json
        result=client.post("/api/v6/recover",json={"session":numeric_json(saved)})
        assert result.status_code==200
        out=result.json();restored=out["session"]
        assert restored["id"]!=saved["id"] and restored["version"]==0
        assert restored["trials"]==saved["trials"] and restored["max_experiments"]==4
        assert out["recovery"]["model_requests"]==0
        next_state=client.post(f"/api/v3/sessions/{restored['id']}/advance",json={"expected_version":0}).json()
        assert len(next_state["trials"])==1
        bad={**saved,"decision":{**saved["decision"],"findings":["normal"]}}
        assert client.post("/api/v6/recover",json={"session":bad}).status_code==422
        assert client.post("/api/v6/recover",json={"session":saved,"use_meta":True}).status_code==422
        boolean={**saved,"version":True}
        assert client.post("/api/v6/recover",json={"session":boolean}).status_code==422
        assert client.post("/api/v6/infer",json={}).status_code==403
        assert client.post("/api/v6/recover",content=b"x"*1048577).status_code==413
