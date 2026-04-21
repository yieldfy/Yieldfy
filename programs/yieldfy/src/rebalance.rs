use anchor_lang::prelude::*;

use crate::{attest, state::*};

#[derive(Accounts)]
pub struct Rebalance<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"position", user.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == user.key()
    )]
    pub position: Account<'info, Position>,

    /// CHECK: the instructions sysvar; content validated in `attest::verify`
    pub ix_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RebalanceArgs {
    pub target_venue: u8,
    pub attestation_slot: u64,
    pub attestation_sig: [u8; 64],
}

pub fn handle(ctx: Context<Rebalance>, args: RebalanceArgs) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, YieldfyError::Paused);
    require!(
        args.target_venue != ctx.accounts.position.venue,
        YieldfyError::VenueMismatch
    );

    attest::verify(
        &ctx.accounts.ix_sysvar,
        cfg.attestor,
        args.target_venue,
        args.attestation_slot,
        cfg.staleness_slots,
    )?;

    // Phase C: CPI redeem from old venue + supply to new venue. For MVP the
    // vault holds wXRP directly, so rebalance is a bookkeeping update.
    let p = &mut ctx.accounts.position;
    let from_venue = p.venue;
    p.venue = args.target_venue;
    p.last_update = Clock::get()?.unix_timestamp;

    emit!(RebalanceEvent {
        user: p.owner,
        from_venue,
        to_venue: args.target_venue,
        principal: p.principal,
    });
    Ok(())
}

#[event]
pub struct RebalanceEvent {
    pub user: Pubkey,
    pub from_venue: u8,
    pub to_venue: u8,
    pub principal: u64,
}
