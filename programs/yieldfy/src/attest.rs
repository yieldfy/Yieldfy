use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_instruction_at_checked, ID as IX_SYSVAR_ID,
};

use crate::state::YieldfyError;

/// ed25519 precompile program id. Hardcoded because
/// `anchor_lang::solana_program::ed25519_program` is not exported in this
/// Anchor/Solana combo.
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");
