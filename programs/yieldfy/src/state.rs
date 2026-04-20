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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigArgs {
    pub attestor: Pubkey,
    pub max_single_deposit: u64,
    pub staleness_slots: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DepositArgs {
    pub amount: u64,
    pub attestation_slot: u64,
    pub attestation_sig: [u8; 64],
    pub expected_venue: u8,
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub venue: u8,
    pub amount: u64,
}

#[error_code]
pub enum YieldfyError {
    #[msg("Program is paused")]
    Paused,
    #[msg("Exceeds per-transaction cap")]
    CapExceeded,
    #[msg("Venue mismatch vs attestation")]
    VenueMismatch,
}
