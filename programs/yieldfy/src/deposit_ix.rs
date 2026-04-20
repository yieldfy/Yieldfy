use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::{attest, state::*};

pub const KAMINO_PROGRAM_ID: Pubkey =
    pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

#[derive(Accounts)]
pub struct DepositToKamino<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Position::INIT_SPACE,
        seeds = [b"position", user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(mut, constraint = user_wxrp.mint == config.wxrp_mint)]
    pub user_wxrp: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", config.wxrp_mint.as_ref()],
        bump,
    )]
    pub vault_wxrp: Account<'info, TokenAccount>,
}
