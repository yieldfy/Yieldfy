//! Venue adapters. Each submodule owns the CPI boundary to a single external
//! lending / yield venue — Kamino for Phase B · MVP, then MarginFi · Drift ·
//! Meteora at Phase C.
//!
//! The top-level program never imports a venue's on-chain types directly; it
//! calls `supply` and `redeem` on whichever adapter matches `Position.venue`.
//! That keeps the attestation + receipt-mint flow in `deposit_ix` /
//! `withdraw_ix` decoupled from per-venue account layouts.

pub mod kamino;
