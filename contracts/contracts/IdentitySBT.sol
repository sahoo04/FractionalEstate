// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentitySBT
 * @notice Soulbound Token (SBT) - Non-transferable ERC721 for KYC-verified identity
 * @dev Once minted, tokens cannot be transferred or approved, ensuring identity permanence
 */
contract IdentitySBT is ERC721, Ownable {
    uint256 private _nextTokenId;
    
    // Mapping from user address to their SBT token ID
    mapping(address => uint256) public sbtOf;
    
    // Mapping from token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;

    // Events
    event SbtMinted(
        address indexed user,
        uint256 indexed tokenId,
        string metadataURI
    );
    event MetadataUpdate(uint256 indexed tokenId);

    constructor(
        address initialOwner
    ) ERC721("FractionalStay Identity", "FSID") Ownable(initialOwner) {}

    /**
     * @notice Mint a Soulbound Token to a user
     * @param to The address to mint the SBT to
     * @param metadataURI The IPFS URI for the token metadata
     * @return tokenId The ID of the minted token
     * @dev Only owner (relayer/admin) can call this
     * @dev Each address can only have one SBT
     */
    function mintSBT(
        address to,
        string calldata metadataURI
    ) external onlyOwner returns (uint256) {
        require(to != address(0), "Invalid address");
        require(sbtOf[to] == 0, "Address already has SBT");

        uint256 tokenId = ++_nextTokenId;
        _mint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        sbtOf[to] = tokenId;

        emit SbtMinted(to, tokenId, metadataURI);
        return tokenId;
    }

    /**
     * @notice Override _update to prevent transfers (soulbound)
     * In OpenZeppelin v5, _update signature is (address to, uint256 tokenId, address auth)
     * Returns the previous owner address (from)
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        // Get the current owner (will be address(0) if minting)
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }
        
        // Block all transfers - revert on any transfer attempt
        revert("SBT: non-transferable");
    }

    /**
     * @notice Set the token URI for a token
     * @param tokenId The token ID
     * @param _tokenURI The URI to set
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal {
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @notice Update token URI (only owner can call)
     * @param tokenId The token ID
     * @param newTokenURI The new URI to set
     * @dev Useful for fixing metadata issues or updating to new IPFS gateways
     */
    function updateTokenURI(uint256 tokenId, string calldata newTokenURI) external onlyOwner {
        _requireOwned(tokenId);
        _setTokenURI(tokenId, newTokenURI);
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Get the token URI for a token
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory _tokenURI = _tokenURIs[tokenId];
        
        // If URI is set, return it
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        // Otherwise return empty string
        return "";
    }

    /**
     * @notice Disable approval function (soulbound)
     */
    function approve(address, uint256) public pure override {
        revert("SBT: non-transferable");
    }

    /**
     * @notice Disable setApprovalForAll function (soulbound)
     */
    function setApprovalForAll(address, bool) public pure override {
        revert("SBT: non-transferable");
    }

    /**
     * @notice Get the owner of a token (for reverse lookup)
     * @param tokenId The token ID
     * @return The owner address
     */
    function getTokenOwner(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }

    /**
     * @notice Check if an address has an SBT
     * @param user The address to check
     * @return Whether the address has an SBT
     */
    function hasSBT(address user) external view returns (bool) {
        return sbtOf[user] != 0;
    }
}
