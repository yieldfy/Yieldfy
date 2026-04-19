# Changelog

All notable changes to `@yieldfy/sdk` will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Phase 5: Typed `Yieldfy` client with `deposit` / `withdraw` / `readPosition` once the Anchor IDL is published.
- Phase 5: ed25519 pre-instruction builder wired to `fetchAttestation`.

## [0.0.1] — 2026-04-19

### Added
- Scaffold package with `fetchAttestation` helper and shared `Attestation` / `VenueKey` / `DepositParams` types.
- tsup build pipeline producing ESM + `.d.ts` bundles.
- Publish workflow at `.github/workflows/release-sdk.yml` triggered by `sdk-v*` tags.
