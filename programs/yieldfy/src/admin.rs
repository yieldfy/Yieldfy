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
