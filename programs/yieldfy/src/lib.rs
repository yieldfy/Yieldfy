use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("CNGH7jZbLHJDTWSz5XnbZ5o4QBWQxph6qGWKRe1y6SNK");

pub mod attest;
pub mod deposit_ix;
pub mod rebalance;
pub mod state;
pub mod withdraw_ix;
pub use state::*;

// Re-export Accounts structs at the crate root so the #[program] macro can
// find their auto-generated `__client_accounts_*` siblings at `crate::*`.
// (If we keep them inside `deposit_ix::` / `withdraw_ix::`, Anchor's macro
// expansion resolves the wrong path and emits "unresolved import crate".)
pub use deposit_ix::*;
pub use rebalance::*;
pub use withdraw_ix::*;

#[program]
pub mod yieldfy {
    use super::*;

    /// One-time setup. Creates the Config PDA and the wXRP vault PDA. The
    /// yXRP mint must already exist and have its mint-authority transferred
    /// to the Config PDA before the first deposit — do that with a plain
    /// `spl-token authorize` call post-initialize.
    pub fn initialize(ctx: Context<Initialize>, args: ConfigArgs) -> Result<()> {
        let c = &mut ctx.accounts.config;
        c.authority = ctx.accounts.authority.key();
        c.wxrp_mint = ctx.accounts.wxrp_mint.key();
        c.yxrp_mint = ctx.accounts.yxrp_mint.key();
        c.attestor = args.attestor;
        c.max_single_deposit = args.max_single_deposit;
        c.staleness_slots = args.staleness_slots;
        c.paused = false;
        c.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn deposit_wxrp_to_kamino(
        ctx: Context<DepositToKamino>,
        args: DepositArgs,
    ) -> Result<()> {
        deposit_ix::handle(ctx, args)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw_ix::handle(ctx, amount)
    }

    pub fn rebalance(ctx: Context<Rebalance>, args: RebalanceArgs) -> Result<()> {
        rebalance::handle(ctx, args)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,

    pub wxrp_mint: Account<'info, Mint>,
    pub yxrp_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault", wxrp_mint.key().as_ref()],
        bump,
        token::mint = wxrp_mint,
        token::authority = config,
    )]
    pub vault_wxrp: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
