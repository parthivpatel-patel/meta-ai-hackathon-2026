# Industrial security review

Public mode retains the existing host/CORS/CSP/security-header policy,1MiB ASGI body prebuffer, request/write/concurrency limits and private inference prohibition. Only GET `/api/v4/catalog` and POST `/api/v4/simulate`, `/api/v4/investigate`, `/api/v4/report.html` are added to the closed public allow-list. Unknown v4 control paths are denied. Payloads accept bounded enums/numbers, never URLs, shell commands, filesystem destinations, tools or provider credentials.

Recipe runs have320–600 steps,1/2/5-second sampling, at most16 ordered actions and no actions after shutdown. Capture context and experiment count are bounded; modified scenarios must reset before capture. The existing workload gate bounds CPU work. Imports occur locally in browser memory or the offline validator, not a new public upload endpoint. Strings are data, not instructions. Import mappings/units/calendar dates/order/duplicates and finite numeric values are checked. File/hash checks do not authenticate an industrial source.

HTML renders only after reproduction and escapes all dynamic content. JSON import compares the entire canonical report against independent reproduction. No imported narrative can enable a model, execute a command, change a security policy or trigger a hardware write. Logs retain request IDs/status/timing without payloads or secrets.

The Baseten exact-model adapter and protected smoke/evaluation gates remain unchanged. The owner reports a credential configured, but no values were inspected and no genuine request was authorized or issued by this work. Public containers receive no provider/owner keys. A credential alone does not authorize activation. Existing fixture, deadline, retry, budget, identity and redaction tests remain part of regression.

Tests include invalid scenarios/IDs/units/timestamps, oversized imports/requests, illegal actions, tampered reports, malicious field content and public endpoint restrictions. Dependency/secret scans and acceptance evidence are recorded separately. This is a same-agent adversarial engineering review, not an independent external penetration test or security certification.
