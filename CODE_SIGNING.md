# Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

---

## 1. Project Roles & Governance

| Role | Name / GitHub Handle | Responsibilities |
| :--- | :--- | :--- |
| **Project Lead & Author** | [Qu-Bi](https://github.com/Qu-Bi) | Architecture, core browser implementation, and release authority |
| **Approver** | [Qu-Bi](https://github.com/Qu-Bi) | Signing request authorizations and production release tagging |

- All commits and release tags must originate from authorized maintainers.
- Multi-Factor Authentication (MFA) is strictly enabled on the GitHub organization and maintainer accounts.

---

## 2. Build and Signing Pipeline

- All official releases are automatically compiled from public, unmodified source code on GitHub-hosted runners using GitHub Actions.
- Release binaries are built in an isolated CI/CD environment without manual tampering.
- The compiled binaries are submitted to SignPath via their trusted GitHub Action (`signpath/github-action-submit-signing-request`) to receive an Authenticode signature backed by the SignPath Foundation Hardware Security Module (HSM).

---

## 3. Privacy & User Data Policy

- **No Telemetry**: QBrowse does not collect, sell, or transmit user browsing history, keystrokes, personal identity, or hardware identifiers.
- **Onion Routing**: Tor traffic is routed through onion circuits without logging or ISP interception.
- **Client-Side Encryption**: Cloud sync utilizes client-side AES-256-GCM encryption with user-derived master keys before any synchronization occurs.
- **Local AI**: Gemma AI inference runs entirely on the user's local device without sending query prompts to remote servers.
