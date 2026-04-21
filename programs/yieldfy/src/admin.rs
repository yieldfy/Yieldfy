use anchor_lang::prelude::*;

use crate::state::{Config, YieldfyError};

/// Authority-only accounts struct used by every admin instruction. The
/// `has_one = authority` constraint on `config` verifies the signer matches
/// the authority captured in `initialize`.
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        has_one = authority @ YieldfyError::BadAttestor
    )]
    pub config: Account<'info, Config>,

    pub authority: Signer<'info>,
}

pub fn handle_set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let prev = c.paused;
    c.paused = paused;
    emit!(PausedToggled {
        authority: ctx.accounts.authority.key(),
        previous: prev,
        current: paused,
    });
    Ok(())
}

pub fn handle_set_cap(
    ctx: Context<AdminOnly>,
    max_single_deposit: u64,
    staleness_slots: u64,
) -> Result<()> {
    require!(max_single_deposit > 0, YieldfyError::CapExceeded);
    require!(staleness_slots > 0, YieldfyError::AttestationStale);
    let c = &mut ctx.accounts.config;
    let prev = (c.max_single_deposit, c.staleness_slots);
    c.max_single_deposit = max_single_deposit;
    c.staleness_slots = staleness_slots;
    emit!(CapsUpdated {
        authority: ctx.accounts.authority.key(),
        previous_max_single_deposit: prev.0,
        previous_staleness_slots: prev.1,
        current_max_single_deposit: max_single_deposit,
        current_staleness_slots: staleness_slots,
    });
    Ok(())
}

pub fn handle_rotate_attestor(ctx: Context<AdminOnly>, new_attestor: Pubkey) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let prev = c.attestor;
    c.attestor = new_attestor;
    emit!(AttestorRotated {
        authority: ctx.accounts.authority.key(),
        previous: prev,
        current: new_attestor,
    });
    Ok(())
}

#[event]
pub struct PausedToggled {
    pub authority: Pubkey,
    pub previous: bool,
    pub current: bool,
}

#[event]
pub struct AttestorRotated {
    pub authority: Pubkey,
    pub previous: Pubkey,
    pub current: Pubkey,
}

#[event]
pub struct CapsUpdated {
    pub authority: Pubkey,
    pub previous_max_single_deposit: u64,
    pub previous_staleness_slots: u64,
    pub current_max_single_deposit: u64,
    pub current_staleness_slots: u64,
}
