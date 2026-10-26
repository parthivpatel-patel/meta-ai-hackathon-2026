import json

import pytest
from forge.phase3.safety import DemoSettings
from forge.submission.render import configure_render


def test_non_render_launch_preserves_configuration():
    env = {"FORGE_DEMO_ALLOWED_HOSTS": '["localhost"]'}
    configure_render(env)
    assert env == {"FORGE_DEMO_ALLOWED_HOSTS": '["localhost"]'}


def test_render_trusts_only_exact_platform_hostname():
    env = {"RENDER": "true", "RENDER_EXTERNAL_HOSTNAME": "forge-judge-123.onrender.com"}
    configure_render(env)
    hosts = json.loads(env["FORGE_DEMO_ALLOWED_HOSTS"])
    assert hosts == ["localhost", "127.0.0.1", "::1", "forge-judge-123.onrender.com"]
    assert DemoSettings(allowed_hosts=hosts).allowed_hosts == hosts


@pytest.mark.parametrize(
    "hostname",
    [
        "",
        "https://forge.onrender.com",
        "*.onrender.com",
        "forge.onrender.com.evil.test",
        "evil.test",
        "forge.onrender.com:443",
        "forge..onrender.com",
    ],
)
def test_render_refuses_invalid_or_nonplatform_hostname(hostname):
    with pytest.raises(ValueError):
        configure_render({"RENDER": "true", "RENDER_EXTERNAL_HOSTNAME": hostname})


def test_explicit_render_hosts_must_include_service_and_health():
    env = {
        "RENDER": "true",
        "RENDER_EXTERNAL_HOSTNAME": "forge.onrender.com",
        "FORGE_DEMO_ALLOWED_HOSTS": '["localhost"]',
    }
    with pytest.raises(ValueError):
        configure_render(env)
    env["FORGE_DEMO_ALLOWED_HOSTS"] = '["forge.onrender.com","127.0.0.1"]'
    configure_render(env)
    assert json.loads(env["FORGE_DEMO_ALLOWED_HOSTS"]) == [
        "forge.onrender.com",
        "127.0.0.1",
    ]


def test_ephemeral_profile_reports_storage_risk(monkeypatch):
    from forge.phase3 import routes

    monkeypatch.setattr(
        routes, "settings", lambda: DemoSettings(mode="public", storage_ephemeral=True)
    )
    result = routes.capabilities()
    assert result["persistence"] == "ephemeral_sqlite"
    assert "lost on restart" in result["hosting_notice"]
    assert result["real_inference_permitted"] is False
