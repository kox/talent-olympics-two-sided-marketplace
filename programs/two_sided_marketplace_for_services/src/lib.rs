#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

pub mod contexts;
pub mod states;
pub mod errors;
pub mod constants;
use contexts::*;

declare_id!("9Qn3V5179PjU2NkYwD3KLcp9ravS94upMC33wTJZSEFH");

#[program]
pub mod two_sided_marketplace_for_services {
    use super::*;

    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, seed: u64) -> Result<()> {
        ctx.accounts.initialize_marketplace(seed, ctx.bumps.marketplace)
    }

    pub fn list_service(ctx: Context<ListService>, args: ListServiceArgs) -> Result<()> {
        ctx.accounts.list_service(args, ctx.bumps.service)
    }

    pub fn buy_service(ctx: Context<BuyService>) -> Result<()> {
        ctx.accounts.buy_service()
    }
}

