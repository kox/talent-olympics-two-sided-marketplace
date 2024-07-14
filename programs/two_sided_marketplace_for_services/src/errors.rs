use anchor_lang::prelude::*;

#[error_code]
pub enum MarketplaceErrors {
    #[msg("You don't have enough funds to buy the service")]
    PurchaseNotEnoughFunds,
}