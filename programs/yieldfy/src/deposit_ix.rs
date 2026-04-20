use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::{attest, state::*};

/// Kamino lending program ID. Verified via address constraint on
/// `venue_program`. Full Kamino CPI lands in a W3.5 follow-up; for MVP the
/// vault holds wXRP directly and the receipt is still minted 1:1.
pub const KAMINO_PROGRAM_ID: Pubkey =
    pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
