//! Kamino Lend CPI boundary.
//!
//! MVP (Phase B) holds wXRP in the program's vault directly so the round-trip
//! is provably reversible from the program alone. The stubs in this module
//! describe the exact instruction shapes a full Phase C integration must emit,
//! so the migration is mechanical: replace each `// TODO(phase-c)` block with
//! `solana_program::program::invoke_signed(&ix, accounts, &[seeds])`.
//!
//! Kamino's instruction namespace is documented at
//! <https://github.com/Kamino-Finance/klend> — their `LendingInstruction` enum
//! is the source of truth for discriminators + account ordering.

use anchor_lang::prelude::*;

/// Kamino Lending program on mainnet-beta and devnet.
pub const PROGRAM_ID: Pubkey = pubkey!("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

/// Accounts Kamino expects for `DepositReserveLiquidity`. Order matches the
/// klend IDL exactly; the vault PDA is the `source_liquidity` authority.
#[derive(Debug, Clone)]
pub struct SupplyAccounts<'info> {
    pub owner: AccountInfo<'info>,
    pub obligation: AccountInfo<'info>,
    pub lending_market: AccountInfo<'info>,
    pub lending_market_authority: AccountInfo<'info>,
    pub reserve: AccountInfo<'info>,
    pub reserve_liquidity_mint: AccountInfo<'info>,
    pub reserve_liquidity_supply: AccountInfo<'info>,
    pub reserve_collateral_mint: AccountInfo<'info>,
    pub user_source_liquidity: AccountInfo<'info>,
    pub user_destination_collateral: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub instruction_sysvar: AccountInfo<'info>,
}

/// Accounts for `WithdrawObligationCollateralAndRedeemReserveCollateral` —
/// the single ix that unwinds a supply position in one round trip.
#[derive(Debug, Clone)]
pub struct RedeemAccounts<'info> {
    pub owner: AccountInfo<'info>,
    pub obligation: AccountInfo<'info>,
    pub lending_market: AccountInfo<'info>,
    pub lending_market_authority: AccountInfo<'info>,
    pub withdraw_reserve: AccountInfo<'info>,
    pub reserve_liquidity_mint: AccountInfo<'info>,
    pub reserve_source_collateral: AccountInfo<'info>,
    pub reserve_collateral_mint: AccountInfo<'info>,
    pub reserve_liquidity_supply: AccountInfo<'info>,
    pub user_destination_liquidity: AccountInfo<'info>,
    pub user_destination_collateral: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub instruction_sysvar: AccountInfo<'info>,
}

/// Supply `amount` wXRP into Kamino on behalf of the program vault. Phase B
/// no-op (wXRP stays in our vault); Phase C invokes Kamino via CPI.
pub fn supply(
    _accounts: &SupplyAccounts,
    _amount: u64,
    _vault_signer_seeds: &[&[u8]],
) -> Result<()> {
    // TODO(phase-c): build Kamino's DepositReserveLiquidity ix and call
    //   solana_program::program::invoke_signed(&ix, &[...], &[vault_signer_seeds])
    Ok(())
}

/// Redeem `amount` collateral → wXRP back to the program vault. Phase B
/// no-op; Phase C issues Kamino's withdraw-and-redeem CPI.
pub fn redeem(
    _accounts: &RedeemAccounts,
    _amount: u64,
    _vault_signer_seeds: &[&[u8]],
) -> Result<()> {
    // TODO(phase-c): WithdrawObligationCollateralAndRedeemReserveCollateral
    Ok(())
}
