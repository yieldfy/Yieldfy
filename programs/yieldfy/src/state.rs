use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub wxrp_mint: Pubkey,
    pub yxrp_mint: Pubkey,
    pub attestor: Pubkey,
    pub max_single_deposit: u64,
    pub staleness_slots: u64,
    pub paused: bool,
    pub bump: u8,
}
