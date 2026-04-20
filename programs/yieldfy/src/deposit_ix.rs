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

pub fn handle(ctx: Context<DepositToKamino>, args: DepositArgs) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, YieldfyError::Paused);
    require!(
        args.amount <= cfg.max_single_deposit,
        YieldfyError::CapExceeded
    );
    require!(args.expected_venue == 0u8, YieldfyError::VenueMismatch);

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
    Ok(())
}
