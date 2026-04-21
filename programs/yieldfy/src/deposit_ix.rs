use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::{attest, state::*, venues::kamino};

/// Re-exported for backwards compatibility with clients that imported the ID
/// directly. The canonical definition lives in `venues::kamino::PROGRAM_ID`.
pub const KAMINO_PROGRAM_ID: Pubkey = kamino::PROGRAM_ID;

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

    #[account(mut, address = config.yxrp_mint)]
    pub yxrp_mint: Account<'info, Mint>,

    #[account(mut, constraint = user_yxrp.mint == yxrp_mint.key())]
    pub user_yxrp: Account<'info, TokenAccount>,

    /// CHECK: address-constrained to the Kamino program
    #[account(address = KAMINO_PROGRAM_ID)]
    pub venue_program: AccountInfo<'info>,

    /// CHECK: the instructions sysvar; content validated in `attest::verify`
    pub ix_sysvar: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_deposit(ctx: Context<DepositToKamino>, args: DepositArgs) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, YieldfyError::Paused);
    require!(
        args.amount <= cfg.max_single_deposit,
        YieldfyError::CapExceeded
    );
    // MVP: only venue 0 (Kamino). Multi-venue routing lands at Phase C.
    require!(args.expected_venue == 0u8, YieldfyError::VenueMismatch);

    // 1. Verify optimizer attestation (ed25519 pre-ix at index 0).
    attest::verify(
        &ctx.accounts.ix_sysvar,
        cfg.attestor,
        args.expected_venue,
        args.attestation_slot,
        cfg.staleness_slots,
    )?;

    // 2. Pull wXRP: user -> vault.
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_wxrp.to_account_info(),
                to: ctx.accounts.vault_wxrp.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        args.amount,
    )?;

    // 3. Route into Kamino. Phase B leaves wXRP in our own vault; the
    //    venues::kamino::supply stub describes the exact CPI Phase C will
    //    issue without changing this call site.
    kamino::supply(
        &kamino::SupplyAccounts {
            owner: ctx.accounts.config.to_account_info(),
            obligation: ctx.accounts.config.to_account_info(), // Phase C: real obligation PDA
            lending_market: ctx.accounts.venue_program.to_account_info(),
            lending_market_authority: ctx.accounts.venue_program.to_account_info(),
            reserve: ctx.accounts.venue_program.to_account_info(),
            reserve_liquidity_mint: ctx.accounts.user_wxrp.to_account_info(),
            reserve_liquidity_supply: ctx.accounts.vault_wxrp.to_account_info(),
            reserve_collateral_mint: ctx.accounts.yxrp_mint.to_account_info(),
            user_source_liquidity: ctx.accounts.vault_wxrp.to_account_info(),
            user_destination_collateral: ctx.accounts.vault_wxrp.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            instruction_sysvar: ctx.accounts.ix_sysvar.to_account_info(),
        },
        args.amount,
        &[b"config", std::slice::from_ref(&cfg.bump)],
    )?;

    // 4. Mint yXRP receipt 1:1, signed by the Config PDA.
    let bump = cfg.bump;
    let seeds: &[&[u8]] = &[b"config", std::slice::from_ref(&bump)];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.yxrp_mint.to_account_info(),
                to: ctx.accounts.user_yxrp.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[seeds],
        ),
        args.amount,
    )?;

    // 5. Update position.
    let p = &mut ctx.accounts.position;
    p.owner = ctx.accounts.user.key();
    p.venue = 0;
    p.principal = p.principal.saturating_add(args.amount);
    p.receipt_supply = p.receipt_supply.saturating_add(args.amount);
    p.last_update = Clock::get()?.unix_timestamp;
    p.bump = ctx.bumps.position;

    emit!(DepositEvent {
        user: p.owner,
        venue: 0,
        amount: args.amount,
    });
    Ok(())
}
