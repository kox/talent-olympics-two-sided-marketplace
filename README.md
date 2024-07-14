# Two-Sided Marketplace for Services

This repository contains the implementation of a two-sided marketplace for services using the Anchor framework. 

The marketplace allows users to list services and buy services using Solana blockchain.

## Introduction

The two-sided marketplace enables service providers to list their services on the blockchain, and users to purchase these services in a secure and decentralized manner. The key features include:

* Listing services with details such as name, URI, price, soulbound status, royalty basis points, hours, and terms.
* Purchasing services using SOL.
* Managing marketplace initialization and service transactions.

## Installation

To install and run this program, follow these steps:

### Clone the repository:
```sh
git clone https://github.com/yourusername/two-sided-marketplace-for-services.git
```

Navigate to the project directory:
```sh
cd two-sided-marketplace-for-services
```
Build the project:
```sh
anchor build
```
Deploy the program:
```sh
anchor deploy
```

### Usage
#### Initializing the Marketplace
To initialize the marketplace, use the initialize_marketplace function with the following parameters:

* ctx: Context for initializing the marketplace.
* seed: A unique seed value to initialize the marketplace.

Example:

```rust
pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>, seed: u64) -> Result<()> {
    ctx.accounts.initialize_marketplace(seed, ctx.bumps.marketplace)
}
```

#### Listing a Service
To list a service, use the list_service function with the following parameters:

* ctx: Context for listing the service.
* args: Arguments for listing the service, including name, URI, price, soulbound status, royalty basis points, hours, and terms.

Example:

```rust
pub fn list_service(ctx: Context<ListService>, args: ListServiceArgs) -> Result<()> {
    ctx.accounts.list_service(args, ctx.bumps.service)
}
```

#### Buying a Service
To buy a service, use the buy_service function with the following parameters:

* ctx: Context for buying the service.

Example:

```rust
pub fn buy_service(ctx: Context<BuyService>) -> Result<()> {
    ctx.accounts.buy_service()
}
```

### Program Structure
The program is structured into several modules:

* contexts: Contains the context definitions for various functions.
* states: Contains the state definitions for the marketplace and service NFTs.
* errors: Contains the error definitions for the marketplace.
* constants: Contains the constants used in the program.

### Key Structures and Functions
* Marketplace: Represents the marketplace with fields for admin, seed, and bump.
* ServiceNFT: Represents a service NFT with fields for marketplace, creator, price, soulbound status, and bump.

### Accounts
* InitializeMarketplace: Initializes the marketplace account.
* ListService: Lists a service and initializes the service account.
* BuyService: Facilitates the purchase of a service.

### Error Handling
Custom errors are defined in the MarketplaceErrors enum:

```rust
#[error_code]
pub enum MarketplaceErrors {
    #[msg("You don't have enough funds to buy the service")]
    PurchaseNotEnoughFunds,
}
```

## Youtube Link
`https://youtu.be/qUzBmvAmnvA`
