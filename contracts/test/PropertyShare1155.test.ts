import { expect } from "chai";
import { ethers } from "hardhat";
import { PropertyShare1155 } from "../typechain-types";

describe("PropertyShare1155", function () {
  let propertyToken: PropertyShare1155;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const PropertyShare1155Factory = await ethers.getContractFactory("PropertyShare1155");
    propertyToken = await PropertyShare1155Factory.deploy(owner.address);
    await propertyToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await propertyToken.owner()).to.equal(owner.address);
    });

    it("Should start with zero properties", async function () {
      expect(await propertyToken.propertyCount()).to.equal(0);
    });
  });

  describe("Property Creation", function () {
    it("Should create a new property", async function () {
      const tx = await propertyToken.createProperty(
        "Test Property",
        "Test Location",
        1000,
        ethers.parseUnits("100", 6),
        "https://example.com/metadata",
        owner.address,
        100
      );
      await tx.wait();

      expect(await propertyToken.propertyCount()).to.equal(1);
      
      const property = await propertyToken.getProperty(1);
      expect(property.name).to.equal("Test Property");
      expect(property.location).to.equal("Test Location");
      expect(property.totalShares).to.equal(1000);
      expect(property.pricePerShare).to.equal(ethers.parseUnits("100", 6));
    });

    it("Should mint initial shares to owner", async function () {
      await propertyToken.createProperty(
        "Test Property",
        "Test Location",
        1000,
        ethers.parseUnits("100", 6),
        "https://example.com/metadata",
        owner.address,
        100
      );

      const balance = await propertyToken.balanceOf(owner.address, 1);
      expect(balance).to.equal(100);
    });

    it("Should revert if non-owner tries to create property", async function () {
      await expect(
        propertyToken.connect(user1).createProperty(
          "Test Property",
          "Test Location",
          1000,
          ethers.parseUnits("100", 6),
          "https://example.com/metadata",
          owner.address,
          100
        )
      ).to.be.revertedWithCustomError(propertyToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await propertyToken.createProperty(
        "Test Property",
        "Test Location",
        1000,
        ethers.parseUnits("100", 6),
        "https://example.com/metadata",
        owner.address,
        100
      );
    });

    it("Should allow owner to mint additional shares", async function () {
      await propertyToken.mintShares(user1.address, 1, 50);
      const balance = await propertyToken.balanceOf(user1.address, 1);
      expect(balance).to.equal(50);
    });

    it("Should revert if minting exceeds total shares", async function () {
      await expect(
        propertyToken.mintShares(owner.address, 1, 1000) // Already has 100, trying to mint 1000 more
      ).to.be.revertedWith("Exceeds total shares");
    });
  });
});


