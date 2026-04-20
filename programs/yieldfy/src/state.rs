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

#[account]
#[derive(InitSpace)]
pub struct Position {
    pub owner: Pubkey,
    /// 0 = kamino, 1 = marginfi, 2 = drift, 3 = meteora
    pub venue: u8,
    pub principal: u64,
    pub receipt_supply: u64,
    pub last_update: i64,
    pub bump: u8,
}
