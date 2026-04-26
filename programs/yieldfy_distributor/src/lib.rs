//! Yieldfy SOL rewards merkle distributor.
//!
//! Phase 2 mechanic: an off-chain indexer (`services/rewards-indexer`)
//! snapshots $YIELDFY holders and wXRP vault positions every epoch, computes
//! per-wallet SOL rewards via the dual-stake scoring math, and publishes
//! a keccak merkle root of (index, wallet, lamports) leaves. This program
//! holds the SOL treasury, accepts a fresh root from the admin per epoch,
//! and pays out claims that produce a valid proof.
//!
//! Leaf layout (must match `services/rewards-indexer/src/merkle.ts`):
//!   keccak256( index:u32 LE || wallet:32 || lamports:u64 LE )
//! Tree is built with sortPairs=true, so verification hashes siblings in
//! lexicographic order at every level.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use solana_keccak_hasher::hashv;

declare_id!("9jXLmjPtUSZ2P1D22mXYSmjmHPty2AExeU1cXoEwnEqa");

#[program]
pub mod yieldfy_distributor {
    use super::*;

    /// One-time setup. Creates the Distributor account + the SOL treasury PDA.
    /// `admin` becomes the only key that can publish new epoch roots and
    /// withdraw stuck treasury funds. Squads vault is the expected admin in
    /// production.
    pub fn initialize(ctx: Context<Initialize>, args: InitArgs) -> Result<()> {
        let d = &mut ctx.accounts.distributor;
        d.admin = ctx.accounts.admin.key();
        d.treasury_bump = ctx.bumps.treasury;
        d.distributor_bump = ctx.bumps.distributor;
        d.distributor_id = args.distributor_id;
        d.current_epoch_id = 0;
        d.current_root = [0u8; 32];
        d.epoch_lamports_total = 0;
        d.epoch_lamports_claimed = 0;
        d.paused = false;
        Ok(())
    }

    /// Admin-only. Posts the merkle root for a new epoch. The root commits to
    /// the full set of (wallet, lamports) leaves the indexer published.
    /// `epoch_lamports_total` is the sum of all leaf amounts — used as a
    /// sanity bound: total claimed for the epoch can never exceed this.
    pub fn publish_epoch(
        ctx: Context<AdminGated>,
        epoch_id: u64,
        merkle_root: [u8; 32],
        epoch_lamports_total: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.distributor.paused, ErrorCode::Paused);
        require!(
            epoch_id > ctx.accounts.distributor.current_epoch_id || ctx.accounts.distributor.current_epoch_id == 0,
            ErrorCode::EpochNotMonotonic
        );
        let d = &mut ctx.accounts.distributor;
        d.current_epoch_id = epoch_id;
        d.current_root = merkle_root;
        d.epoch_lamports_total = epoch_lamports_total;
        d.epoch_lamports_claimed = 0;
        Ok(())
    }

    /// Anyone can call this — it tops up the treasury PDA from the payer.
    /// In practice the admin (Squads vault) calls it, but funding from any
    /// wallet is fine since SOL has no spend authority once it lands.
    pub fn top_up(ctx: Context<TopUp>, amount: u64) -> Result<()> {
        let from = ctx.accounts.payer.to_account_info();
        let to = ctx.accounts.treasury.to_account_info();
        let ix = system_instruction::transfer(from.key, to.key, amount);
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[from, to, ctx.accounts.system_program.to_account_info()],
        )?;
        Ok(())
    }

    /// Submit a merkle proof to claim this epoch's SOL allocation. The
    /// `ClaimStatus` PDA prevents double-claims for (distributor, epoch, index).
    pub fn claim(
        ctx: Context<Claim>,
        epoch_id: u64,
        index: u32,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let d = &ctx.accounts.distributor;
        require!(!d.paused, ErrorCode::Paused);
        require!(epoch_id == d.current_epoch_id, ErrorCode::WrongEpoch);

        let claimant = ctx.accounts.claimant.key();
        let leaf = compute_leaf(index, &claimant, amount);
        require!(verify_proof(&proof, &d.current_root, &leaf), ErrorCode::BadProof);

        let new_total = d
            .epoch_lamports_claimed
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            new_total <= d.epoch_lamports_total,
            ErrorCode::EpochExhausted
        );

        // Mark claimed first; PDA init prevents replay.
        let cs = &mut ctx.accounts.claim_status;
        cs.distributor = d.key();
        cs.epoch_id = epoch_id;
        cs.index = index;
        cs.claimant = claimant;
        cs.amount = amount;

        // Pay out from treasury PDA. Direct lamport transfer between owned
        // accounts — cheaper than a System Program CPI and works for PDAs.
        let treasury_ai = ctx.accounts.treasury.to_account_info();
        let claimant_ai = ctx.accounts.claimant.to_account_info();
        **treasury_ai.try_borrow_mut_lamports()? = treasury_ai
            .lamports()
            .checked_sub(amount)
            .ok_or(ErrorCode::TreasuryUnderflow)?;
        **claimant_ai.try_borrow_mut_lamports()? = claimant_ai
            .lamports()
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        let d_mut = &mut ctx.accounts.distributor;
        d_mut.epoch_lamports_claimed = new_total;
        Ok(())
    }

    /// Admin-only circuit breaker. While paused, publish + claim revert.
    pub fn set_paused(ctx: Context<AdminGated>, paused: bool) -> Result<()> {
        ctx.accounts.distributor.paused = paused;
        Ok(())
    }
}

// ───────────────────────── State ─────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Distributor {
    pub admin: Pubkey,
    pub treasury_bump: u8,
    pub distributor_bump: u8,
    pub distributor_id: u64, // arbitrary tag so multiple distributors can coexist
    pub current_epoch_id: u64,
    pub current_root: [u8; 32],
    pub epoch_lamports_total: u64,
    pub epoch_lamports_claimed: u64,
    pub paused: bool,
}

#[account]
#[derive(InitSpace)]
pub struct ClaimStatus {
    pub distributor: Pubkey,
    pub epoch_id: u64,
    pub index: u32,
    pub claimant: Pubkey,
    pub amount: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitArgs {
    pub distributor_id: u64,
}

// ───────────────────────── Accounts ─────────────────────────

#[derive(Accounts)]
#[instruction(args: InitArgs)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Distributor::INIT_SPACE,
        seeds = [b"distributor", args.distributor_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub distributor: Account<'info, Distributor>,

    /// CHECK: PDA holding SOL only. No data layout — lamports-only escrow.
    #[account(
        seeds = [b"treasury", distributor.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminGated<'info> {
    #[account(mut, has_one = admin)]
    pub distributor: Account<'info, Distributor>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct TopUp<'info> {
    pub distributor: Account<'info, Distributor>,

    /// CHECK: PDA verified by seeds. SOL escrow.
    #[account(
        mut,
        seeds = [b"treasury", distributor.key().as_ref()],
        bump = distributor.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(epoch_id: u64, index: u32)]
pub struct Claim<'info> {
    #[account(mut)]
    pub distributor: Account<'info, Distributor>,

    /// CHECK: SOL-only PDA, verified by seeds.
    #[account(
        mut,
        seeds = [b"treasury", distributor.key().as_ref()],
        bump = distributor.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init,
        payer = claimant,
        space = 8 + ClaimStatus::INIT_SPACE,
        seeds = [
            b"claim",
            distributor.key().as_ref(),
            &epoch_id.to_le_bytes(),
            &index.to_le_bytes(),
        ],
        bump,
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    #[account(mut)]
    pub claimant: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ───────────────────────── Errors ─────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Distributor is paused")]
    Paused,
    #[msg("Epoch id must be strictly greater than the current epoch")]
    EpochNotMonotonic,
    #[msg("Claim references an epoch that's not currently active")]
    WrongEpoch,
    #[msg("Merkle proof did not verify against the published root")]
    BadProof,
    #[msg("Cumulative claims would exceed the epoch's published total")]
    EpochExhausted,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Treasury balance is below the requested payout")]
    TreasuryUnderflow,
}

// ───────────────────────── Merkle helpers ─────────────────────────

fn compute_leaf(index: u32, wallet: &Pubkey, amount: u64) -> [u8; 32] {
    let mut buf = [0u8; 4 + 32 + 8];
    buf[0..4].copy_from_slice(&index.to_le_bytes());
    buf[4..36].copy_from_slice(wallet.as_ref());
    buf[36..44].copy_from_slice(&amount.to_le_bytes());
    hashv(&[&buf]).to_bytes()
}

fn verify_proof(proof: &[[u8; 32]], root: &[u8; 32], leaf: &[u8; 32]) -> bool {
    let mut computed = *leaf;
    for sibling in proof {
        // sortPairs=true → hash siblings in lexicographic order
        if computed <= *sibling {
            computed = hashv(&[&computed, sibling]).to_bytes();
        } else {
            computed = hashv(&[sibling, &computed]).to_bytes();
        }
    }
    computed == *root
}
