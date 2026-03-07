# Security And Privacy

## Security Posture

- MVP has no accounts and no backend persistence.
- Main risks are client-side input safety, third-party exposure, dependency risk, and bad race data.

## Trusted vs Untrusted Input

- Treat URL fragment state as untrusted.
- Validate and normalize external data before use.
- Never render user-provided values as raw HTML.

## Privacy Posture

- Optional runner identity should be nickname-first.
- Share pages are public by URL and always `noindex`.
- Third-party services may still receive IP/referrer data.

## Time Safety Rule

- Viewer local time is irrelevant in MVP.
- Show only race local time.
- Always label the race timezone clearly.

## Third Parties

- GitHub Pages for hosting
- Cloudflare in front of GitHub Pages
- Map provider exposure is expected and should be disclosed

## Dependency Posture

- Keep dependencies lean
- Review upgrades via PR

## Doc Update Rule

- Update this doc only for material changes to threat model, privacy posture, trusted-input rules, or third-party exposure.
