use anchor_lang::prelude::*;

use mpl_core::{
    instructions::AddPluginV1CpiBuilder, types::{
        Attribute, Attributes, Creator, DataState, PermanentFreezeDelegate, PermanentTransferDelegate, Plugin, PluginAuthority, PluginAuthorityPair, Royalties, RuleSet, TransferDelegate
    }, ID 
};

use crate::{
    constants::{ MARKETPLACE_SEED, SERVICE_SEED },
    states::{ Marketplace, ServiceNFT }
};

#[derive(Accounts)]
pub struct ListService<'info> {
    #[account(mut)]
    creator: Signer<'info>,

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

    /// The address of the new asset.
    #[account(mut)]
    pub asset: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = ServiceNFT::INIT_SPACE,
        seeds = [
            SERVICE_SEED, 
            marketplace.key().as_ref(), 
            creator.key().as_ref(),
            asset.key().as_ref(),
        ],
        bump
    )]
    service: Account<'info, ServiceNFT>,


    /// The SPL Noop program.
    /// CHECK: Checked in mpl-core.
    pub log_wrapper: Option<AccountInfo<'info>>,
    
    /// The MPL Core program.
    /// CHECK: Checked in mpl-core.
    #[account(address = ID)]
    pub mpl_core: AccountInfo<'info>,
    
    // The system program.
    system_program: Program<'info, System>
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct ListServiceArgs {
    pub name: String,
    pub uri: String,
    pub price: u64,
    pub soulbound: bool,
    pub royalty_basis_points: u16,
    pub hours: String,
    pub terms: String,
}

impl<'info> ListService<'info> {
    pub fn list_service(&mut self, args: ListServiceArgs, bump: u8) -> Result<()> {
        
        self.service.set_inner(ServiceNFT {
            marketplace: self.marketplace.key(),
            creator: self.creator.key(),
            price: args.price,
            is_soulbound: args.soulbound,
            bump,
        });

        let plugins = if args.soulbound {
            Some(vec![
                PluginAuthorityPair {
                    plugin: Plugin::PermanentTransferDelegate( PermanentTransferDelegate{}),
                    authority: Some(PluginAuthority::Address { address: self.service.key() }),
                },
                PluginAuthorityPair {
                    plugin: Plugin::PermanentFreezeDelegate( PermanentFreezeDelegate { frozen: true }),
                    authority: Some(PluginAuthority::Address { address: self.service.key() }),
                }
            ])
        } else {
            Some(vec![
                PluginAuthorityPair {
                    plugin: Plugin::TransferDelegate( TransferDelegate {}),
                    authority: Some(PluginAuthority::Address { address: self.service.key() }),
                },
            ])
        };

        // mint asset
        mpl_core::instructions::CreateV1Cpi {
            asset: &self.asset.to_account_info(),
            collection: None,
            authority: Some(&self.creator.to_account_info()),
            payer: &self.creator.to_account_info(),
            owner: None,
            update_authority: Some(self.creator.as_ref()),
            system_program: &self.system_program.to_account_info(),
            log_wrapper: self.log_wrapper.as_ref(),
            __program: &self.mpl_core,
            __args: mpl_core::instructions::CreateV1InstructionArgs {
                data_state: DataState::AccountState,
                name: args.name,
                uri: args.uri,
                plugins: plugins,
            },
        }
        .invoke()?;

        // Add royalty plugin
        AddPluginV1CpiBuilder::new(&self.mpl_core.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(None)
            .payer(&self.creator.to_account_info())
            .authority(Some(&self.creator.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin(Plugin::Royalties(Royalties {
                creators: vec![Creator {
                    address: self.creator.key(),
                    percentage: 100,
                }],
                basis_points: args.royalty_basis_points,
                rule_set: RuleSet::None,
            }))
            .invoke()?;

        AddPluginV1CpiBuilder::new(&self.mpl_core.to_account_info())
            .asset(&self.asset.to_account_info())
            .collection(None)
            .payer(&self.creator.to_account_info())
            .authority(Some(&self.creator.to_account_info()))
            .system_program(&self.system_program.to_account_info())
            .plugin(Plugin::Attributes(Attributes {
                attribute_list: vec![
                    Attribute {
                        key: String::from("hours"),
                        value: args.hours
                    }, 
                    Attribute {
                        key: String::from("terms"),
                        value: args.terms,
                    }
                ]
            }))
            .invoke()?;

        Ok(())
    }
}
