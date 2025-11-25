// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing (6 decimals like real USDC)
 */
contract MockUSDC is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Mock USDC", "USDC") Ownable(initialOwner) {}

    function decimals() public pure override returns (uint8) {
        return 6; // USDC uses 6 decimals
    }

    /**
     * @dev Mint tokens to any address (for testing)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function - anyone can claim 10,000 USDC for testing
     */
    function faucet() external {
        _mint(msg.sender, 10000 * 10**6); // 10,000 USDC
    }
}
