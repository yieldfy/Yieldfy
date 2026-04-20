use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_instruction_at_checked, ID as IX_SYSVAR_ID,
};

use crate::state::YieldfyError;

/// ed25519 precompile program id. Hardcoded because
/// `anchor_lang::solana_program::ed25519_program` is not exported in this
/// Anchor/Solana combo.
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");

/// Verify that the preceding ed25519 instruction (index 0 in the current
/// transaction) is a valid Yieldfy attestation:
///
///   signer   = `attestor` stored in Config
///   message  = [venue_u8, slot_u64_le]   (9 bytes)
///
/// Also enforces a staleness bound: `current_slot <= slot + staleness_slots`.
pub fn verify(
    ix_sysvar: &AccountInfo,
    attestor: Pubkey,
    venue: u8,
    attestation_slot: u64,
    staleness_slots: u64,
) -> Result<()> {
    require_keys_eq!(*ix_sysvar.key, IX_SYSVAR_ID, YieldfyError::BadAttestIx);

    // ed25519 precompile must be at index 0; the current Yieldfy ix is at 1+.
    let ix = load_instruction_at_checked(0, ix_sysvar)
        .map_err(|_| YieldfyError::BadAttestIx)?;
    require!(ix.program_id == ED25519_PROGRAM_ID, YieldfyError::BadAttestIx);

    // ed25519 single-signature instruction data layout:
    //   [0..2]    num_signatures (u16 LE) — must be 1
    //   [2..4]    padding
    //   [4..16]   offsets struct (12 bytes)
    //   [16..48]  public key (32 bytes)
    //   [48..112] signature (64 bytes)
    //   [112..]   message (9 bytes for us: venue_u8 + slot_u64_le)
    require!(ix.data.len() >= 121, YieldfyError::BadAttestIx);
    let pk = &ix.data[16..48];
    let msg = &ix.data[112..121];

    require!(pk == attestor.as_ref(), YieldfyError::BadAttestor);
    require!(msg[0] == venue, YieldfyError::VenueMismatch);

    let slot = u64::from_le_bytes(
        msg[1..9].try_into().map_err(|_| YieldfyError::BadAttestIx)?,
    );
    require!(slot == attestation_slot, YieldfyError::AttestationStale);

    let now = Clock::get()?.slot;
    require!(
        now <= slot.saturating_add(staleness_slots),
        YieldfyError::AttestationStale
    );
    Ok(())
}
