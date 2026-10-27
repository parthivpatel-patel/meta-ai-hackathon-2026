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
