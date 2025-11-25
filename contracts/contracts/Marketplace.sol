// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyShare1155.sol";

/**
 * @title Marketplace
 * @dev Secondary market for trading property shares
 * Fixed-price listings with USDC payment
 */
contract Marketplace is ERC1155Holder, Ownable {
    using SafeERC20 for IERC20;

    // USDC token address
    IERC20 public immutable usdc;
    PropertyShare1155 public immutable propertyToken;

    // Listing structure
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 amount; // Number of shares
        uint256 pricePerShare; // Price in USDC (6 decimals)
        bool active;
    }

    // Mapping from listing ID to Listing
    mapping(uint256 => Listing) public listings;

    // Total number of listings
    uint256 public listingCount;

    // Marketplace fee (basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFeeBps;
    address public feeRecipient;

    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 pricePerShare
    );

    event ListingCancelled(uint256 indexed listingId);

    event PurchaseExecuted(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 tokenId,
        uint256 amount,
        uint256 totalPrice
    );

    event MarketplaceFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    constructor(
        address _usdc,
        address _propertyToken,
        address initialOwner,
        uint256 _marketplaceFeeBps,
        address _feeRecipient
    ) Ownable(initialOwner) {
        usdc = IERC20(_usdc);
        propertyToken = PropertyShare1155(_propertyToken);
        marketplaceFeeBps = _marketplaceFeeBps;
        feeRecipient = _feeRecipient;
        listingCount = 0;
    }

    /**
     * @dev Create a new listing
     * @param tokenId Property token ID
     * @param amount Number of shares to sell
     * @param pricePerShare Price per share in USDC (6 decimals)
     */
    function createListing(
        uint256 tokenId,
        uint256 amount,
        uint256 pricePerShare
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(pricePerShare > 0, "Price must be greater than 0");

        // Check seller has enough shares
        uint256 balance = propertyToken.balanceOf(msg.sender, tokenId);
        require(balance >= amount, "Insufficient shares");

        // Transfer tokens to marketplace (escrow)
        propertyToken.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        listingCount++;
        uint256 listingId = listingCount;

        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            amount: amount,
            pricePerShare: pricePerShare,
            active: true
        });

        emit ListingCreated(listingId, msg.sender, tokenId, amount, pricePerShare);
    }

    /**
     * @dev Cancel an active listing
     * @param listingId Listing ID to cancel
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");

        listing.active = false;

        // Return tokens to seller
        propertyToken.safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId,
            listing.amount,
            ""
        );

        emit ListingCancelled(listingId);
    }

    /**
     * @dev Purchase shares from a listing
     * @param listingId Listing ID to purchase from
     */
    function purchase(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");

        uint256 totalPrice = listing.amount * listing.pricePerShare;
        
        // Calculate marketplace fee
        uint256 feeAmount = (totalPrice * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = totalPrice - feeAmount;

        // Transfer USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), totalPrice);

        // Send fee to fee recipient
        if (feeAmount > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, feeAmount);
        }

        // Send payment to seller
        usdc.safeTransfer(listing.seller, sellerAmount);

        // Transfer tokens to buyer
        propertyToken.safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            listing.amount,
            ""
        );

        // Mark listing as inactive
        listing.active = false;

        emit PurchaseExecuted(
            listingId,
            msg.sender,
            listing.seller,
            listing.tokenId,
            listing.amount,
            totalPrice
        );
    }

    /**
     * @dev Purchase partial shares from a listing
     * @param listingId Listing ID to purchase from
     * @param amount Number of shares to purchase (must be <= listing.amount)
     */
    function purchasePartial(uint256 listingId, uint256 amount) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= listing.amount, "Amount exceeds available shares");

        uint256 totalPrice = amount * listing.pricePerShare;
        
        // Calculate marketplace fee
        uint256 feeAmount = (totalPrice * marketplaceFeeBps) / 10000;
        uint256 sellerAmount = totalPrice - feeAmount;

        // Transfer USDC from buyer
        usdc.safeTransferFrom(msg.sender, address(this), totalPrice);

        // Send fee to fee recipient
        if (feeAmount > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, feeAmount);
        }

        // Send payment to seller
        usdc.safeTransfer(listing.seller, sellerAmount);

        // Transfer tokens to buyer
        propertyToken.safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            amount,
            ""
        );

        // Update listing amount (reduce by purchased amount)
        listing.amount -= amount;

        // If all shares are purchased, mark listing as inactive
        if (listing.amount == 0) {
            listing.active = false;
        }

        emit PurchaseExecuted(
            listingId,
            msg.sender,
            listing.seller,
            listing.tokenId,
            amount,
            totalPrice
        );
    }

    /**
     * @dev Get listing details
     * @param listingId Listing ID
     * @return Listing struct
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @dev Update marketplace fee (owner only)
     * @param newFeeBps New fee in basis points
     */
    function setMarketplaceFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        marketplaceFeeBps = newFeeBps;
        emit MarketplaceFeeUpdated(newFeeBps);
    }

    /**
     * @dev Update fee recipient (owner only)
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }
}







