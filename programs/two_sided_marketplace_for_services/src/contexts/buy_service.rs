use anchor_lang::prelude::*;
use anchor_lang::system_program;

use mpl_core::instructions::TransferV1CpiBuilder;
use mpl_core::ID;

use crate::{
    constants::{ MARKETPLACE_SEED, SERVICE_SEED }, errors::MarketplaceErrors, states::{ Marketplace, ServiceNFT }
};

#[derive(Accounts)]
pub struct BuyService<'info> {
    #[account(mut)]
    buyer: Signer<'info>,

    /// CHECK: account read from service
    #[account(mut, address = service.creator)]
    seller: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            MARKETPLACE_SEED, 
            marketplace.admin.key().as_ref(), 
            marketplace.seed.to_le_bytes().as_ref()
        ],
        bump = marketplace.bump
    )]
    marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        seeds = [
            SERVICE_SEED, 
            marketplace.key().as_ref(),
            service.creator.key().as_ref(),
            asset.key().as_ref(),
        ],
        bump = service.bump
    )]
    service: Account<'info, ServiceNFT>,

    /// CHECK:` we need to add this to the pda to solve the issue
    #[account(mut)]
    pub asset: AccountInfo<'info>,

    /// CHECK: Checked in mpl-core
    #[account(address = ID)]
    pub mpl_core: AccountInfo<'info>,   

    /// The system program.
    system_program: Program<'info, System>,
}


impl<'info> BuyService<'info> {
    pub fn buy_service(&mut self) -> Result<()> {
        // Ensure the buyer has enough funds to pay for the service
        let buyer_lamports = self.buyer.to_account_info().lamports();
        let price = self.service.price;

        require!(buyer_lamports > price, MarketplaceErrors::PurchaseNotEnoughFunds);
    
        // Sending the price
        system_program::transfer(
            CpiContext::new(
                self.system_program.to_account_info(), 
    
                system_program::Transfer {
                    from: self.buyer.to_account_info(),
                    to: self.seller.to_account_info(),
                }
            ), 
            price,
        )?;

        let marketplace_key = self.service.marketplace.key();
        let creator_key = self.service.creator.key();
        let asset_key = self.asset.key();
        
        let signer_seeds: &[&[_]] = &[
            SERVICE_SEED.as_ref(),
            marketplace_key.as_ref(),
            creator_key.as_ref(),
            asset_key.as_ref(),
            &[self.service.bump],
        ];

        TransferV1CpiBuilder::new(&self.mpl_core.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(None)
            .payer(&self.buyer.to_account_info())
            .new_owner(&self.buyer.to_account_info())
            .authority(Some(&self.service.to_account_info()))
            .invoke_signed(&[signer_seeds])?;

        Ok(())
    }
}

        