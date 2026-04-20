use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("CNGH7jZbLHJDTWSz5XnbZ5o4QBWQxph6qGWKRe1y6SNK");

pub mod attest;
pub mod deposit_ix;
pub mod state;
pub mod withdraw_ix;
