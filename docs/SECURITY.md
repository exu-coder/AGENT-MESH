# Security requirements

This starter is not hardened for untrusted multi-user environments.

1. Bind HTTP listeners to 127.0.0.1 by default.
2. Authenticate every dashboard management endpoint.
3. Validate Host and Origin; implement CSRF protection for cookie-authenticated browser requests.
4. Do not expose the owner credential to MCP clients or browser JavaScript.
5. Treat agent prompts, messages, tool results, and artifacts as untrusted input.
6. Do not enable arbitrary shell execution by default.
7. Use per-agent identities, scoped permissions, task quotas, timeouts, and bounded retries.
8. Require human approval for sensitive filesystem, process, or network actions.
9. Redact secrets from logs and persist only token hashes.
10. Add audit events for authorization decisions and task lifecycle transitions.

Before enabling a worker that executes code, implement OS-level isolation or a properly configured container sandbox. A TypeScript interface is not a security sandbox.
