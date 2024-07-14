use anchor_lang::prelude::*;

#[account]
pub struct ServiceNFT {
    /* pub service_ta: Pubkey, */
    pub marketplace: Pubkey,
    pub creator: Pubkey,
    pub price: u64,
    pub is_soulbound: bool,
    pub bump: u8,
}

impl Space for ServiceNFT {
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1 + 1;
}
