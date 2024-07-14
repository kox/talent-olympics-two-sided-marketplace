use anchor_lang::prelude::*;

#[account]
pub struct Marketplace {
    pub admin: Pubkey,
    pub seed: u64,
    pub bump: u8,
}

impl Space for Marketplace {
    const INIT_SPACE: usize = 8 + 32 + 8 + 1;
}
