"""Read-only security/readiness check of an already-running local public image."""

import argparse
import json
import re
import subprocess

READY = """
import json,time,urllib.request
for attempt in range(20):
    try:
        with urllib.request.urlopen('http://127.0.0.1:7860/api/v3/ready',timeout=1) as r:
            if json.load(r).get('status') == 'ready':
                break
    except Exception:
        pass
    time.sleep(1)
else:
    raise SystemExit(1)
"""

RECORDED = """
import hashlib,json,urllib.request,urllib.error
base='http://127.0.0.1:7860/api/v3/recorded-meta'
responses={}
for suffix in ('','/report.json','/report.html','/replay'):
    with urllib.request.urlopen(base+suffix,timeout=10) as r:
        assert r.status == 200
        assert r.headers['cache-control'] == 'no-store'
        assert r.headers['x-content-type-options'] == 'nosniff'
        assert r.headers['x-frame-options'] == 'DENY'
        assert "default-src 'self'" in r.headers['content-security-policy']
        assert not r.headers.get('access-control-allow-origin')
        responses[suffix]=r.read(262145)
        assert len(responses[suffix]) <= 262144
    try:
        urllib.request.urlopen(urllib.request.Request(base+suffix,data=b'{}',method='POST'),timeout=10)
    except urllib.error.HTTPError as e:
        assert e.code == 403
    else:
        raise AssertionError('Recorded evidence must be read-only')
p=json.loads(responses[''])['provenance']
assert p['source'] == 'meta_http_response' and p['mode'] == 'previously_recorded'
assert p['synthetic'] is True and p['independently_verified'] is True
assert p['public_live_inference_enabled'] is False
assert p['model_id'] == 'meta-models/muse-spark-open-1026'
sha=hashlib.sha256(responses['/report.json']).hexdigest()
assert sha == p['artifact_sha256'] == '8cb36b2d182ac84657abbe07ba6230c7483dd115aeeed0478fee80a49c32b88f'
report=json.loads(responses['/report.json'])['investigation']
assert len(report['measurements']) == 120
assert len(report['hypotheses']['hypotheses']) == 3 and len(report['trials']) == 2
assert all(label.encode() in responses['/report.html'] for label in p['labels'])
replay=json.loads(responses['/replay'])
assert replay['verified'] is True and replay['status'] == 'SUPPORTED_SYNTHETIC'
assert replay['findings'] == ['process-pressure','sensor-pressure']
assert replay['network_requests_sent'] == replay['new_experiments_executed'] == 0
print(json.dumps({'passed':True,'artifact_sha256':sha,'read_only_routes':4,'model_requests':0,'new_experiments':0}))
"""


def check(container: str, image: str | None, local_socket: bool = False) -> dict:
    docker_command = ["docker"] + (
        ["--host=unix:///var/run/docker.sock"] if local_socket else []
    )
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", container):
        raise ValueError("Invalid local container name")
    subprocess.run(
        [
            *docker_command,
            "exec",
            container,
            "/app/backend/.venv/bin/python",
            "-c",
            READY,
        ],
        check=True,
        capture_output=True,
        timeout=45,
    )
    result = subprocess.run(
        [
            *docker_command,
            "exec",
            container,
            "/app/backend/.venv/bin/python",
            "-m",
            "forge.submission.audit",
            "--url",
            "http://127.0.0.1:7860",
            "--allow-loopback-http",
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=45,
    )
    audit = json.loads(result.stdout)
    if not audit["passed"]:
        raise ValueError("Public HTTP boundaries failed")
    owner = subprocess.run(
        [*docker_command, "inspect", "--format", "{{.Config.User}}", container],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    ).stdout.strip()
    uid = subprocess.run(
        [*docker_command, "exec", container, "id", "-u"],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    ).stdout.strip()
    output = {
        "runtime_uid": int(uid),
        "http_audit": audit,
        "non_root_image_user": int(uid) > 0 and owner not in ("", "root", "0", "0:0"),
        "scope": "Local image only, not an external HTTPS deployment",
    }
    reviewed = subprocess.run(
        [
            *docker_command,
            "exec",
            container,
            "/app/backend/.venv/bin/python",
            "-c",
            RECORDED,
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=45,
    )
    output["recorded_meta"] = json.loads(reviewed.stdout)
    if image:
        if not re.fullmatch(r"[a-z0-9][a-z0-9._/:-]{0,127}", image):
            raise ValueError("Invalid local image tag")
        dummy = "fixture-only-public-key-rejection-not-real"
        probe = subprocess.run(
            [
                *docker_command,
                "run",
                "--pull=never",
                "--rm",
                "-e",
                "BASETEN_API_KEY=" + dummy,
                image,
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=20,
        )
        output["credential_bearing_public_start_refused"] = (
            probe.returncode == 2 and dummy not in probe.stdout + probe.stderr
        )
    output["passed"] = (
        output["non_root_image_user"]
        and audit["passed"]
        and output["recorded_meta"]["passed"]
        and output.get("credential_bearing_public_start_refused", True)
    )
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("container")
    parser.add_argument("--image")
    parser.add_argument(
        "--local-socket",
        action="store_true",
        help="Use the managed local Unix socket explicitly",
    )
    args = parser.parse_args()
    try:
        result = check(args.container, args.image, args.local_socket)
    except (ValueError, KeyError, OSError, subprocess.SubprocessError):
        print(
            json.dumps(
                {
                    "passed": False,
                    "error": "Local container validation failed; inspect the bounded readiness/audit checks",
                }
            )
        )
        return 1
    print(json.dumps(result, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
