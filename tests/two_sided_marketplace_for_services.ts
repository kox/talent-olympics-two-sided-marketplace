import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { randomBytes } from "crypto";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { fetchAssetV1, transferV1 } from "@metaplex-foundation/mpl-core";
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi'
import { describe, it } from "node:test";
import { assert } from "chai";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { TwoSidedMarketplaceForServices } from "../target/types/two_sided_marketplace_for_services";

describe("two_sided_marketplace_for_services", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;

  const program = anchor.workspace.TwoSidedMarketplaceForServices as Program<TwoSidedMarketplaceForServices>;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    /* console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    ); */
    return signature;
  };

  const serviceNFTData = {
    name: "Solana Talent Olympics Service NFT",
    uri: "https://ipfs.io/ipfs/QmccPznp7WAduRLbHhrUwjuYkDV1VFo77c9B3ic5uZ6HCT",
    plugins: []
  }


  const seed = new BN(randomBytes(8));
  // protocol administrator
  const admin = Keypair.generate();
  // Service creator
  const creator = Keypair.generate();
  // NFT reseller
  const noFundsUser = Keypair.generate();
  // NFT reseller
  const reseller = Keypair.generate();
  // NFT final buyer
  const user = Keypair.generate();
  // Non-souldbound service
  const serviceA = Keypair.generate();
  // souldbound service
  const serviceB = Keypair.generate();
  const marketplacePda = PublicKey.findProgramAddressSync([
    Buffer.from("marketplace"),
    admin.publicKey.toBuffer(),
    seed.toBuffer("le", 8)
  ], program.programId)[0];
  const serviceAPda = PublicKey.findProgramAddressSync([
    Buffer.from("service"),
    marketplacePda.toBuffer(),
    creator.publicKey.toBuffer(),
    serviceA.publicKey.toBuffer(),
  ], program.programId)[0];
  const serviceBPda = PublicKey.findProgramAddressSync([
    Buffer.from("service"),
    marketplacePda.toBuffer(),
    creator.publicKey.toBuffer(),
    serviceB.publicKey.toBuffer(),
  ], program.programId)[0];
  const price = new BN(1 * LAMPORTS_PER_SOL);
  const royaltyBasisPoints = 500;
  const attributeList = [{
    key: 'hours',
    value: '10'
  }, {
    key: 'terms',
    value: 'https://ipfs.io/ipfs/QmbwVBHPQWgdpiR625NDwrLZpawcWdiMVE8JzHYTkfu5EJ'
  }]

  const accounts = {
    seed: seed,
    admin: admin.publicKey,
    creator: creator.publicKey,
    reseller: reseller.publicKey,
    user: user.publicKey,
    marketplace: marketplacePda,
    logWrapper: null,
    systemProgram: SystemProgram.programId
  }

  const umi = createUmi('http://127.0.0.1:8899', 'confirmed')
    .use(mplTokenMetadata())
    .use(keypairIdentity(provider.wallet.payer));

  it('Airdrops funds to the main users', async () => {
    let tx = new Transaction();

    tx.instructions = [
      ...[admin, creator, reseller, user].map((k) =>
        SystemProgram.transfer({
          fromPubkey: provider.publicKey,
          toPubkey: k.publicKey,
          lamports: 10 * LAMPORTS_PER_SOL,
        })
      ),
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: noFundsUser.publicKey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
      })
    ];

    await provider.sendAndConfirm(tx, [provider.wallet.payer]).then(log);
  });

  it("Is initialized!", async () => {
    // Add your test here.
    await program.methods
      .initializeMarketplace(seed)
      .accounts({ ...accounts })
      .signers([admin])
      .rpc()
      .then(confirm)
      .then(log);

    const marketplaceAccount = await program.account.marketplace.fetch(marketplacePda);
    assert.equal(marketplaceAccount.admin.toString(), admin.publicKey.toString());
    assert.equal(marketplaceAccount.seed.toString(), seed.toString());
  });

  it("Can add a soulbound service to the list!", async () => {
    let asset = serviceA;

    await program.methods
      .listService({
        ...serviceNFTData,
        price,
        royaltyBasisPoints: royaltyBasisPoints,
        soulbound: true,
        hours: attributeList[0].value,
        terms: attributeList[1].value
      })
      .accounts({
        ...accounts,
        service: serviceAPda,
        asset: asset.publicKey,
      })
      .signers([creator, asset])
      .rpc()
      .then(confirm)
      .then(log);

    const serviceAccount = await program.account.serviceNft.fetch(serviceAPda);
    assert.equal(serviceAccount.marketplace.toString(), marketplacePda.toString());
    assert.equal(serviceAccount.creator.toString(), creator.publicKey.toString());
    assert.equal(serviceAccount.price.toNumber(), price.toNumber());

    const assetData = await fetchAssetV1(umi, publicKey(asset.publicKey.toString()));
    assert.equal(assetData.name, serviceNFTData.name);
    assert.equal(assetData.uri, serviceNFTData.uri);
    assert.equal(assetData.royalties.creators.length, 1);
    assert.equal(assetData.royalties.creators[0].address.toString(), creator.publicKey.toString());
    assert.equal(assetData.royalties.creators[0].percentage, 100);
    assert.equal(assetData.royalties.basisPoints, royaltyBasisPoints);
    assert.equal(assetData.permanentTransferDelegate.authority.address, serviceAPda.toString());
    assert.equal(assetData.permanentFreezeDelegate.authority.address, serviceAPda.toString());
    assert.ok(assetData.permanentFreezeDelegate.frozen);
    assert.deepEqual(assetData.attributes.attributeList, attributeList)
  });
 
  it("Should fail if the user doesn't enough funds to buy the service!", async () => {
    try {
      let asset = serviceA;
  
      await program.methods
      .buyService()
      .accounts({
        ...accounts,
        service: serviceAPda,
        buyer: noFundsUser.publicKey,
        seller: creator.publicKey,
        asset: asset.publicKey,
      })
      .signers([noFundsUser])
      .rpc()
      .then(confirm)
      .then(log);
      throw new Error("It should not trigger this error because this user doesn't have funds");
    } catch(err) {
      assert.equal(err.error.errorCode.code, 'PurchaseNotEnoughFunds');
      assert.equal(err.error.errorMessage, "You don't have enough funds to buy the service");
    }
  });

  it("Buy the new created soundbound service NFT from the marketplace!", async () => {
    let asset = serviceA;

    const creatorBalance = await provider.connection.getBalance(creator.publicKey);

    await program.methods
    .buyService()
    .accounts({
      ...accounts,
      service: serviceAPda,
      buyer: reseller.publicKey,
      seller: creator.publicKey,
      asset: asset.publicKey,
    })
    .signers([reseller])
    .rpc()
    .then(confirm)
    .then(log);
  
    // creator earns the full money 
    const creatorLatestBalance = await provider.connection.getBalance(creator.publicKey);
    assert.ok(creatorBalance == creatorLatestBalance - price);

    const assetData = await fetchAssetV1(umi, publicKey(asset.publicKey.toString()));
    assert.equal(assetData.owner.toString(), reseller.publicKey.toString());
  });

  it('Should not be able to transfer the soulbound NFT again!', async () => {
    let asset = serviceA;

    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(reseller.secretKey))

    const umiReseller = createUmi('http://127.0.0.1:8899', 'confirmed')
    .use(mplTokenMetadata())
    .use(keypairIdentity(keypair)); 
    try {
      await transferV1(umiReseller, {
        asset: publicKey(asset.publicKey),
        newOwner: publicKey(user.publicKey)
      })
      .sendAndConfirm(umiReseller);

      throw new Error('It should not be able to transfer it');
    } catch(err) {
      assert.ok(true);
    }

    const assetData = await fetchAssetV1(umiReseller, publicKey(asset.publicKey.toString()));
    assert.equal(assetData.owner.toString(), reseller.publicKey.toString());
  });

  it("Can add a non-soulbound service to the list!", async () => {
    let asset = serviceB;

    await program.methods
      .listService({
        ...serviceNFTData,
        service: serviceBPda,
        price,
        royaltyBasisPoints: royaltyBasisPoints,
        soulbound: false,
        hours: attributeList[0].value,
        terms: attributeList[1].value
      })
      .accounts({
        ...accounts,
        asset: asset.publicKey,
      })
      .signers([creator, asset])
      .rpc()
      .then(confirm)
      .then(log);

    const serviceAccount = await program.account.serviceNft.fetch(serviceBPda);
    assert.equal(serviceAccount.marketplace.toString(), marketplacePda.toString());
    assert.equal(serviceAccount.creator.toString(), creator.publicKey.toString());
    assert.equal(serviceAccount.price.toNumber(), price.toNumber());

    const assetData = await fetchAssetV1(umi, publicKey(asset.publicKey.toString()));
    assert.equal(assetData.name, serviceNFTData.name);
    assert.equal(assetData.uri, serviceNFTData.uri);
    assert.equal(assetData.royalties.creators.length, 1);
    assert.equal(assetData.royalties.creators[0].address.toString(), creator.publicKey.toString());
    assert.equal(assetData.royalties.creators[0].percentage, 100);
    assert.equal(assetData.royalties.basisPoints, royaltyBasisPoints);
    assert.deepEqual(assetData.attributes.attributeList, attributeList)
  }); 

  it("Buy the new created service NFT from the marketplace!", async () => {
    let asset = serviceB;

    const creatorBalance = await provider.connection.getBalance(creator.publicKey);

    await program.methods
    .buyService()
    .accounts({
      ...accounts,
      service: serviceBPda,
      buyer: reseller.publicKey,
      seller: creator.publicKey,
      asset: asset.publicKey,
    })
    .signers([reseller])
    .rpc()
    .then(confirm)
    .then(log);
  
    // creator earns the full money 
    const creatorLatestBalance = await provider.connection.getBalance(creator.publicKey);
    assert.ok(creatorBalance == creatorLatestBalance - price);

    const assetData = await fetchAssetV1(umi, publicKey(asset.publicKey.toString()));
    assert.equal(assetData.owner.toString(), reseller.publicKey.toString());
  });
});

