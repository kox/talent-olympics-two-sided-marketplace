use anchor_lang::prelude::*;

use crate::{constants::MARKETPLACE_SEED, states::Marketplace};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct InitializeMarketplace<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// Initialize the marketplace
    #[account(
        init,
        payer = admin,
        space = Marketplace::INIT_SPACE,
        seeds = [
            MARKETPLACE_SEED, 
            admin.key().as_ref(), 
            seed.to_le_bytes().as_ref()
        ],
        bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    system_program: Program<'info, System>
}

impl<'info> InitializeMarketplace<'info> {
    pub fn initialize_marketplace(&mut self, seed: u64, bump: u8) -> Result<()> {
        self.marketplace.set_inner(Marketplace {
            admin: self.admin.key(),
            seed,
            bump,
        });

        Ok(())
    }
    
}