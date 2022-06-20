var { expect } = require("chai");
var should = require("chai").should();
const { ethers } = require("hardhat");
const ToknCollection = require("../artifacts/contracts/ToknCollectionInit.sol/ToknCollection.json");
const ToknCollectionV2 = require("../artifacts/contracts/ToknCollectionV2.sol/ToknCollectionV2.json");

describe("CollectionFactory", () => {
  var owner, addr1, addr2, addrs;
  var factory, proxyAddress, proxy;
  var contractUri =
    "https://storageapi.fleek.co/be7986c9-5c86-46d7-b855-071264f7611c-bucket/Tokn/collection1/collection1.json";
  var baseUri =
    "https://storageapi.fleek.co/be7986c9-5c86-46d7-b855-071264f7611c-bucket/Tokn/collection1/Tokens/json/";

  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const CollectionFactory = await ethers.getContractFactory(
      "CollectionFactory"
    );
    const collectionFactory = await CollectionFactory.deploy();
    await collectionFactory.deployed();
    factory = collectionFactory;
  });

  describe("Factory Deployment", () => {
    it("should deploy a collection factory and a collection", async () => {
      should.exist(factory);
      should.exist(await factory.collection());
    });

    it("should create a collection proxy", async () => {
      var tx = await factory.createCollection(
        owner.address,
        baseUri,
        contractUri,
        addr2.address
      );

      await tx.wait();
      proxyAddress = await factory.getArtistProxy(owner.address);

      proxy = await ethers.getContractAtFromArtifact(
        ToknCollection,
        proxyAddress
      );
      console.log("proxy: " + proxyAddress);
      expect(proxy).not.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("Initial Collection Creation", function () {
    it("should initialize proxy", async () => {
      expect(await proxy.contractURI()).equals(contractUri);
      expect(await proxy.uri(0)).equals(baseUri + "0.json");
      expect(await proxy.treasury()).equals(addr2.address);
    });

    it("should transfer the ownership to artist", async () => {
      expect(await proxy.owner()).equals(owner.address);
    });
  });

  describe("Collection V1", function () {
    it("shouldn't allow anyone else to call onlyOwner functions other than owner", async () => {
      await expect(
        proxy.connect(addr1).setRoyaltyPercentage(20)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(
        proxy.connect(addr1).setTreasury(addr1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("allows owner to change state of the contract", async () => {
      var tx = await proxy.setRoyaltyPercentage(20);
      await tx.wait();
      expect(await proxy.royaltyPercentage()).to.equal(20);
      var tx = await proxy.setTreasury(addr1.address);
      await tx.wait();
      expect(await proxy.treasury()).to.equal(addr1.address);
    });

    it("allows owner to mint new tokens", async () => {
      var parsedPrice = ethers.utils.parseEther("0.1");
      var tx = await proxy.mintNew(20, "In circles", parsedPrice);
      await tx.wait();

      expect(await proxy.balanceOf(owner.address, 0)).to.equal(20);
    });

    it("does not allow owner to mint non existing tokens", async () => {
      await expect(proxy.mintExisting(1, 10)).to.be.reverted;
    });

    it("allows owner to mint more of existing tokens", async () => {
      var tx = await proxy.mintExisting(0, 10);
      await tx.wait();
      expect(await proxy.balanceOf(owner.address, 0)).to.equal(30);
    });
  });

  describe("Collection Upgradation", () => {
    var upgradedProxy, collectionV2;
    beforeEach(async () => {
      var contractV2 = await ethers.getContractFactory("ToknCollectionV2");
      collectionV2 = await contractV2.deploy();
      await collectionV2.deployed();
      var tx = await proxy.upgradeTo(collectionV2.address);
      await tx.wait();

      upgradedProxy = await ethers.getContractAtFromArtifact(
        ToknCollectionV2,
        proxyAddress
      );
    });

    it("should deploy the collection version 2", async () => {
      should.exist(collectionV2);
    });

    it("should upgrade the current proxy and only allow owner to initialize the contract state once", async () => {
      await expect(
        upgradedProxy
          .connect(addr1)
          .initializeState("abc", contractUri, addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
      var tx = await upgradedProxy.initializeState(
        "abc",
        contractUri,
        addr2.address
      );
      await tx.wait();
      expect(await upgradedProxy.uri(0)).to.equal("abc0.json");
      await expect(
        upgradedProxy.initializeState("abc", contractUri, addr2.address)
      ).to.be.reverted;
      expect(await upgradedProxy.version()).to.equal("2.0");
    });

    it("should retain the original data storage", async () => {
      expect(await upgradedProxy.balanceOf(owner.address, 0)).to.equal(30);
    });
  });
});
