// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PropertyShare1155
 * @dev ERC-1155 contract for fractional real estate ownership
 * Each token ID represents a unique property
 * Supply represents the number of shares available for that property
 */
contract PropertyShare1155 is ERC1155URIStorage, Ownable {
    // USDC token address
    IERC20 public immutable usdc;
    
    // Mapping from token ID to property metadata
    struct Property {
        string name;
        string location;
        uint256 totalShares;
        uint256 pricePerShare; // Price in USDC (6 decimals)
        address seller; // Property seller/owner
        bool exists;
    }

    // Mapping from token ID to Property struct
    mapping(uint256 => Property) public properties;

    // Track total number of properties
    uint256 public propertyCount;

    // Track total supply per token ID
    mapping(uint256 => uint256) private _totalSupply;

    // Events
    event PropertyCreated(
        uint256 indexed tokenId,
        string name,
        string location,
        uint256 totalShares,
        uint256 pricePerShare
    );

    event SharesMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 amount
    );

    event SharesPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );

    constructor(
        address initialOwner,
        address _usdc
    ) ERC1155("") Ownable(initialOwner) {
        propertyCount = 0;
        usdc = IERC20(_usdc);
    }

    /**
     * @dev Create a new property and mint initial shares
     * @param name Property name
     * @param location Property location
     * @param totalShares Total number of shares for this property
     * @param pricePerShare Price per share in USDC (6 decimals)
     * @param metadataUri Metadata URI for the property
     * @param initialOwner Address to receive initial shares
     * @param initialAmount Initial shares to mint
     * @return tokenId The new property token ID
     */
    function createProperty(
        string memory name,
        string memory location,
        uint256 totalShares,
        uint256 pricePerShare,
        string memory metadataUri,
        address initialOwner,
        uint256 initialAmount
    ) external returns (uint256) {
        require(totalShares > 0, "Total shares must be greater than 0");
        require(initialAmount <= totalShares, "Initial amount exceeds total shares");

        propertyCount++;
        uint256 tokenId = propertyCount;

        properties[tokenId] = Property({
            name: name,
            location: location,
            totalShares: totalShares,
            pricePerShare: pricePerShare,
            seller: msg.sender,
            exists: true
        });

        _setURI(tokenId, metadataUri);

        if (initialAmount > 0) {
            _mint(initialOwner, tokenId, initialAmount, "");
            _totalSupply[tokenId] = initialAmount;
        }

        emit PropertyCreated(tokenId, name, location, totalShares, pricePerShare);
        emit SharesMinted(tokenId, initialOwner, initialAmount);

        return tokenId;
    }

    /**
     * @dev Mint additional shares for an existing property
     * @param to Address to receive the shares
     * @param tokenId Property token ID
     * @param amount Number of shares to mint
     */
    function mintShares(
        address to,
        uint256 tokenId,
        uint256 amount
    ) external onlyOwner {
        require(properties[tokenId].exists, "Property does not exist");
        require(
            _totalSupply[tokenId] + amount <= properties[tokenId].totalShares,
            "Exceeds total shares"
        );

        _mint(to, tokenId, amount, "");
        _totalSupply[tokenId] += amount;
        emit SharesMinted(tokenId, to, amount);
    }

    /**
     * @dev Purchase shares with USDC - PUBLIC FUNCTION
     * @param tokenId Property token ID
     * @param amount Number of shares to purchase
     */
    function purchaseShares(
        uint256 tokenId,
        uint256 amount
    ) external {
        require(properties[tokenId].exists, "Property does not exist");
        require(amount > 0, "Amount must be greater than 0");
        require(
            _totalSupply[tokenId] + amount <= properties[tokenId].totalShares,
            "Exceeds total shares"
        );

        // Calculate total price
        uint256 totalPrice = properties[tokenId].pricePerShare * amount;

        // Transfer USDC from buyer to seller
        require(
            usdc.transferFrom(msg.sender, properties[tokenId].seller, totalPrice),
            "USDC transfer failed"
        );

        // Mint shares to buyer
        _mint(msg.sender, tokenId, amount, "");
        _totalSupply[tokenId] += amount;

        emit SharesPurchased(tokenId, msg.sender, amount, totalPrice);
    }

    /**
     * @dev Get property information
     * @param tokenId Property token ID
     * @return Property struct
     */
    function getProperty(uint256 tokenId) external view returns (Property memory) {
        require(properties[tokenId].exists, "Property does not exist");
        return properties[tokenId];
    }

    /**
     * @dev Get total supply for a token ID
     * @param tokenId Property token ID
     * @return Total supply of shares for this property
     */
    function totalSupply(uint256 tokenId) public view returns (uint256) {
        return _totalSupply[tokenId];
    }

    /**
     * @dev Override to include property existence check
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(properties[tokenId].exists, "Property does not exist");
        return super.uri(tokenId);
    }

    /**
     * @dev Override _update to track total supply
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        super._update(from, to, ids, values);
        
        for (uint256 i = 0; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 value = values[i];
            
            if (from == address(0)) {
                // Minting
                _totalSupply[id] += value;
            }
            if (to == address(0)) {
                // Burning
                _totalSupply[id] -= value;
            }
        }
    }
}


