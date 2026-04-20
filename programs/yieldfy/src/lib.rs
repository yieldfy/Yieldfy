use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("CNGH7jZbLHJDTWSz5XnbZ5o4QBWQxph6qGWKRe1y6SNK");

pub mod attest;
pub mod deposit_ix;
pub mod state;
pub mod withdraw_ix;

pub use state::*;

// Re-export Accounts structs at the crate root so the #[program] macro can
// find their auto-generated `__client_accounts_*` siblings at `crate::*`.
// (If we keep them inside `deposit_ix::` / `withdraw_ix::`, Anchor's macro
// expansion resolves the wrong path and emits "unresolved import crate".)
pub use deposit_ix::*;
pub use withdraw_ix::*;
