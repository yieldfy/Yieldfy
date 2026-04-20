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

    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handle(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(
        amount <= ctx.accounts.position.receipt_supply,
        YieldfyError::InsufficientBalance
    );

    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.yxrp_mint.to_account_info(),
                from: ctx.accounts.user_yxrp.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // 2. TODO(W3.5): CPI into Kamino to redeem wXRP back into the vault
    //    before transferring it to the user. MVP holds wXRP in the vault
    //    directly so this step is a no-op.

    // 3. Return wXRP: vault -> user, signed by the Config PDA.
    let bump = ctx.accounts.config.bump;
    let seeds: &[&[u8]] = &[b"config", std::slice::from_ref(&bump)];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_wxrp.to_account_info(),
                to: ctx.accounts.user_wxrp.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            &[seeds],
        ),
        amount,
    )?;
    Ok(())
}
