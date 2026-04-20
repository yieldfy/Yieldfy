use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("CNGH7jZbLHJDTWSz5XnbZ5o4QBWQxph6qGWKRe1y6SNK");

pub mod attest;
pub mod deposit_ix;
pub mod state;
pub mod withdraw_ix;
pub use state::*;

pub use deposit_ix::*;
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
}
