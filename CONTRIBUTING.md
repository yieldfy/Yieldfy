# Contributing to Yieldfy

Thanks for considering a contribution. Yieldfy is open source under the MIT license, and we welcome code, documentation, and security work from outside the core team.

Please read this document before you open your first pull request.

## Code of conduct

We follow the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold it. Report incidents to `conduct@yieldfy.ai`.

## Ways to contribute

- **Bug reports** — open a [GitHub issue](https://github.com/yieldfy/Yieldfy/issues/new/choose) with a minimal reproduction.
- **Feature proposals** — open a [discussion](https://github.com/yieldfy/Yieldfy/discussions) first. Substantive features start with a design conversation, not a pull request.
- **Documentation** — corrections and clarifications are welcome as direct PRs.
- **Security findings** — follow [SECURITY.md](./SECURITY.md). Do not open a public issue.

## Development setup

```sh
git clone https://github.com/yieldfy/Yieldfy
cd Yieldfy
npm install

# on-chain
anchor build

# services
npm run optimizer:dev          # in one terminal
npm -w @yieldfy/wxrp-indexer run dev   # in another

# frontend
npm run dev
```

Prerequisites: `node@20+`, `rust@1.78+`, `anchor@0.30.1+` (`avm install 0.30.1`), `solana-cli@1.18+`, optional `docker`.

## Pull request workflow

1. **Fork and branch.** Feature branches should be named `feat/<short-slug>` or `fix/<short-slug>`. Long-running work can live on `feat/<slug>` and rebase regularly.
2. **Conventional commits** — we use [Conventional Commits](https://www.conventionalcommits.org/) for the first line of every commit message. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`. Scope is optional but encouraged for multi-workspace PRs (`feat(sdk): ...`).
3. **One concern per PR.** Keep the diff focused. Refactors go in their own PRs.
4. **Tests required** — any behavior change must land with a test. For on-chain changes, that means a new or updated bankrun case in `tests/*.spec.ts`. For TypeScript, a vitest case in the relevant workspace.
5. **CI must pass.** All four workflow jobs (`dashboard`, `optimizer`, `sdk`, `wxrp-indexer`) must be green. Anchor test runs are gated behind a manual dispatch for cost reasons.
6. **Squash-merge only.** Maintainers merge via squash so the history stays linear and every commit on `main` is a releasable unit.
7. **Changelog** — if your PR changes public behavior in the SDK or the program, add an entry under the `Unreleased` section of [packages/sdk/CHANGELOG.md](./packages/sdk/CHANGELOG.md).

## Coding standards

### TypeScript

- Strict mode is on everywhere. Keep it on.
- Prefer explicit types on exported functions.
- Avoid `any`. If you must, comment why.
- No ambient globals. Modules only.
- ESM throughout. `type: "module"` in every `package.json`.

### Rust (Anchor program)

- Follow the Anchor 0.30 idioms already in `programs/yieldfy/src/`.
- Every new instruction gets an entry in `lib.rs`'s `#[program]` block and an `Accounts` struct re-exported at the crate root.
- Every validation uses `require!` + a typed `YieldfyError` variant, never `panic!`.
- Prefer checked arithmetic in state transitions (`saturating_add` / `saturating_sub`).

### Solidity / XRPL

Not in scope for this repository.

## Running tests

```sh
# Unit tests across all TypeScript workspaces
npm test

# Bankrun integration tests (requires `anchor build` first)
npm run anchor:test
```

## Security review

If your PR touches any of the following, request a security review in the PR description (ping `@yieldfy/security`):

- `programs/yieldfy/src/**`
- `services/optimizer/src/attest.ts`
- `packages/sdk/src/attestation.ts`
- Anything under `ops/` that affects upgrade authority or multisig config

## Releasing

Releases are cut by core maintainers. A release requires:

1. All CI jobs green on `main`.
2. Changelog updated.
3. A signed, annotated tag following `vMAJOR.MINOR.PATCH` for the repo and `sdk-vMAJOR.MINOR.PATCH` for the SDK npm package.
4. A corresponding GitHub Release with notes generated from the changelog.

## Licensing

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE). You represent that you have the right to submit the work under that license.

## Questions

Open a [discussion](https://github.com/yieldfy/Yieldfy/discussions) or email `hello@yieldfy.ai`.

— Yieldfy Labs
