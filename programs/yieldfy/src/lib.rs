use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("3PY2nY7UVQR327WeSdJFrsrcrqhD4wE2CHg4ZcDarGDE");

pub mod admin;
pub mod attest;
pub mod deposit_ix;
pub mod rebalance;
pub mod state;
pub mod venues;
pub mod withdraw_ix;
pub use admin::*;
pub use state::*;

// Re-export Accounts structs at the crate root so the #[program] macro can
// find their auto-generated `__client_accounts_*` siblings at `crate::*`.
// Each ix module exposes a uniquely-named handler (handle_deposit /
// handle_withdraw / handle_rebalance) so the wildcard globs don't collide.
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
        deposit_ix::handle_deposit(ctx, args)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw_ix::handle_withdraw(ctx, amount)
    }

    pub fn rebalance(ctx: Context<Rebalance>, args: RebalanceArgs) -> Result<()> {
        rebalance::handle_rebalance(ctx, args)
    }

    /// Authority-only circuit breaker. Pausing causes every deposit and
    /// rebalance to revert with `YieldfyError::Paused`; withdraw is never
    /// blocked so users can always exit.
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        admin::handle_set_paused(ctx, paused)
    }

    /// Authority-only. Replaces `Config.attestor` so subsequent deposits
    /// must be signed by the new key. Existing attestations with the old
    /// key still need to clear the staleness window — operators should
    /// drain any in-flight optimizer work before rotating.
    pub fn rotate_attestor(ctx: Context<AdminOnly>, new_attestor: Pubkey) -> Result<()> {
        admin::handle_rotate_attestor(ctx, new_attestor)
    }

    /// Authority-only. Updates the per-tx deposit cap and the attestation
    /// staleness window. Both must be > 0 — use `set_paused(true)` if the
    /// intent is to halt activity.
    pub fn set_cap(
        ctx: Context<AdminOnly>,
        max_single_deposit: u64,
        staleness_slots: u64,
    ) -> Result<()> {
        admin::handle_set_cap(ctx, max_single_deposit, staleness_slots)
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
