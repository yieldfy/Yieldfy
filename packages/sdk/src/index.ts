// @yieldfy/sdk — typed client for the Yieldfy Anchor program.
//
// Ships with a stub IDL that matches programs/yieldfy per the engineering
// plan (§05–§07). Once someone runs `anchor build` and publishes the real
// IDL, replace src/idl/yieldfy.json with the generated file — the public
// surface of this package stays stable.

export { Yieldfy, SDK_VERSION } from "./client.js";

export {
  buildAttestationMessage,
  buildAttestationPreIx,
  fetchAttestation,
} from "./attestation.js";

export {
  CONFIG_SEED,
  POSITION_SEED,
  VAULT_SEED,
  IX_SYSVAR,
  KAMINO_PROGRAM_ID,
  findConfigPda,
  findPositionPda,
  findVaultPda,
} from "./pdas.js";

export {
  VENUE_CODE,
  VENUE_FROM_CODE,
  type Attestation,
  type ConfigAccount,
  type DepositParams,
  type PositionAccount,
  type RiskProfile,
  type VenueKey,
} from "./types.js";

export {
  DEFAULT_REWARD_PARAMS,
  computeScore,
  distributeEpoch,
  epochSolPool,
  type ParticipantInput,
  type ParticipantScore,
  type RewardParams,
} from "./rewards.js";

export {
  SABER_DISTRIBUTOR_PROGRAM_ID,
  SABER_DISTRIBUTOR_SEED,
  SABER_CLAIM_STATUS_SEED,
  findSaberDistributorPda,
  findSaberClaimStatusPda,
  buildSaberNewDistributorIx,
  buildSaberClaimIx,
  type NewDistributorAccounts,
  type NewDistributorArgs,
  type ClaimAccounts,
  type ClaimArgs,
} from "./saber-distributor.js";
