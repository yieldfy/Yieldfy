use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::state::*;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"position", user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key()
    )]
    pub position: Account<'info, Position>,

    #[account(mut, address = config.yxrp_mint)]
    pub yxrp_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_yxrp.mint == yxrp_mint.key())]
    pub user_yxrp: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_wxrp.mint == config.wxrp_mint)]
    pub user_wxrp: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault", config.wxrp_mint.as_ref()],
        bump,
    )]
    pub vault_wxrp: Account<'info, TokenAccount>,
}
