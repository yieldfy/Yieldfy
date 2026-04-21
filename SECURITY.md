# Security Policy

Yieldfy handles real value on Solana mainnet-beta. We take security reports seriously and respond on business hours within one working day.

## Supported versions

| Component | Version | Supported |
| --- | --- | --- |
| `@yieldfy/sdk` | `>= 0.1.0` | ✅ |
| `programs/yieldfy` | latest mainnet-beta deploy | ✅ |
| `@yieldfy/optimizer` | `>= 0.1.0` | ✅ |
| `@yieldfy/wxrp-indexer` | `>= 0.1.0` | ✅ |
| `@yieldfy/dashboard` | production at yieldfy.ai | ✅ |
| anything tagged `*-preview` or `sdk-v0.0.*` | — | ❌ |

## Reporting a vulnerability

**Preferred channel: GitHub private vulnerability reports.**

Open a report at <https://github.com/yieldfy/Yieldfy/security/advisories/new>. This creates a private thread only the Yieldfy team can see.

**Fallback channel: encrypted email.**

- `security@yieldfy.ai`
- PGP fingerprint: published at <https://yieldfy.ai/.well-known/security.txt>

Please include:

1. A description of the issue and the component(s) affected.
2. Steps to reproduce, including any proof-of-concept code.
3. The impact you can demonstrate — stolen funds, frozen state, denial of service, privilege escalation, etc.
4. Your name or handle for public acknowledgement (optional).

**Do not** open a public GitHub issue, tweet, or post the details anywhere before we confirm a fix. We will coordinate disclosure with you.

## Response timeline

| Stage | Target |
| --- | --- |
| Acknowledgement of report | within 1 business day |
| Severity triage and scoping | within 3 business days |
| Fix in a private branch | within 7 business days for critical / high |
| Coordinated public disclosure | within 90 days of initial report |

Timelines may extend if reproduction requires staging infrastructure or if an audit review is needed.

## Scope

**In scope:**

- The on-chain program at `programs/yieldfy/`
- The optimizer service, including attestation signer and webhook delivery
- The `@yieldfy/sdk` package, including IDL correctness
- The wXRP indexer, including metric correctness
- The dashboard's signing and transaction-construction paths
- Infrastructure-as-code in `ops/` (Prometheus, Grafana, Docker)

**Out of scope:**

- Bugs in third-party venues (Kamino, MarginFi, Drift, Meteora) — report directly to the venue
- Bugs in the Hex Trust wXRP bridge — report to Hex Trust
- Social engineering of Yieldfy staff
- Denial of service via public RPC rate limits
- Best-practice findings without a demonstrable impact (missing headers, permissive CORS on read-only endpoints, etc.)

## Bug bounty

Rewards are determined by a severity tier matrix modeled on [Immunefi's grading](https://immunefi.com/severity-definitions/):

| Severity | Reward (USDC) |
| --- | --- |
| Critical (loss of user funds, program upgrade takeover) | up to 250,000 |
| High (permanent freeze, mint-supply corruption) | up to 50,000 |
| Medium (unauthorised state mutation without loss) | up to 10,000 |
| Low (DoS, read-only information leak) | up to 1,000 |

Payouts are made in USDC on Solana mainnet-beta to the address you provide. Reports covering code that has not been deployed to mainnet-beta are eligible at 25% of the above rates.

## Safe harbor

Yieldfy commits to not pursuing legal action against researchers who:

- Make a good-faith effort to comply with this policy.
- Do not exfiltrate more data than is necessary to demonstrate the issue.
- Do not publicly disclose before a coordinated release.
- Do not attempt to phish, social-engineer, or compromise the accounts of Yieldfy users.

When in doubt, contact us before testing.

## Hall of fame

We publicly acknowledge researchers who report valid issues. Opt out at any time.

---

Last reviewed: 2026-04-21.
