// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyShare1155.sol";

/**
 * @title RevenueSplitter
 * @dev Distributes rent revenue proportionally to property share holders
 * Uses pull model with ward boy management system:
 * 1. Admin assigns ward boy for each property
 * 2. Ward boy deposits net amount (after miscellaneous fees)
 * 3. Admin triggers payout distribution (3% platform fee + shareholder distribution)
 * 4. Shareholders claim their portion
 */
contract RevenueSplitter is Ownable {
    using SafeERC20 for IERC20;

    // USDC token address (Arbitrum Sepolia)
    IERC20 public immutable usdc;
    PropertyShare1155 public immutable propertyToken;

    // Mapping from token ID to total amount deposited and distributed
    mapping(uint256 => uint256) public totalDeposited;

    // Mapping from token ID => holder address => total claimed
    mapping(uint256 => mapping(address => uint256)) public totalClaimed;

    // Platform fee (basis points, e.g., 300 = 3%)
    uint256 public platformFeeBps;
    address public feeRecipient;

    // Property managers (ward boys) assigned by admin
    mapping(uint256 => address) public propertyManagers;
    
    // Pending distributions - funds deposited by ward boy but not yet distributed
    mapping(uint256 => uint256) public pendingDistribution;

    // Events
    event PropertyManagerAssigned(uint256 indexed tokenId, address indexed manager);
    event PropertyManagerRemoved(uint256 indexed tokenId, address indexed manager);
    
    event FundsDepositedByManager(
        uint256 indexed tokenId,
        address indexed manager,
        uint256 netAmount,
        uint256 grossRent,
        uint256 miscellaneousFee
    );
    
    event PayoutTriggered(
        uint256 indexed tokenId,
        uint256 grossAmount,
        uint256 platformFee,
        uint256 netForDistribution
    );

    event RewardClaimed(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 amount
    );

    event PlatformFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    constructor(
        address _usdc,
        address _propertyToken,
        address initialOwner,
        uint256 _platformFeeBps,
        address _feeRecipient
    ) Ownable(initialOwner) {
        require(_platformFeeBps <= 1000, "Fee cannot exceed 10%");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        usdc = IERC20(_usdc);
        propertyToken = PropertyShare1155(_propertyToken);
        platformFeeBps = _platformFeeBps;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Assign a property manager (ward boy) for a property
     * Only admin can assign
     * @param tokenId Property token ID
     * @param manager Address of the ward boy
     */
    function assignPropertyManager(uint256 tokenId, address manager) external onlyOwner {
        require(manager != address(0), "Invalid manager address");
        require(propertyToken.totalSupply(tokenId) > 0, "Property does not exist");
        
        propertyManagers[tokenId] = manager;
        emit PropertyManagerAssigned(tokenId, manager);
    }

    /**
     * @dev Remove a property manager (ward boy) for a property
     * Only admin can remove
     * @param tokenId Property token ID
     */
    function removePropertyManager(uint256 tokenId) external onlyOwner {
        address manager = propertyManagers[tokenId];
        require(manager != address(0), "No manager assigned");
        
        propertyManagers[tokenId] = address(0);
        emit PropertyManagerRemoved(tokenId, manager);
    }

    /**
     * @dev Ward boy deposits net rent amount after deducting miscellaneous fees
     * Only the assigned property manager can deposit for their property
     * @param tokenId Property token ID
     * @param netAmount Net amount after miscellaneous fees (6 decimals USDC)
     * @param grossRent Original gross rent collected (for tracking)
     * @param miscellaneousFee Miscellaneous fees deducted (for tracking)
     */
    function depositRentByManager(
        uint256 tokenId,
        uint256 netAmount,
        uint256 grossRent,
        uint256 miscellaneousFee
    ) external {
        require(propertyManagers[tokenId] == msg.sender, "Only assigned manager can deposit");
        require(netAmount > 0, "Net amount must be greater than 0");
        require(grossRent >= netAmount + miscellaneousFee, "Invalid amounts");
        require(propertyToken.totalSupply(tokenId) > 0, "Property does not exist");

        // Transfer net amount from ward boy to contract
        usdc.safeTransferFrom(msg.sender, address(this), netAmount);

        // Add to pending distribution (not yet available for claims)
        pendingDistribution[tokenId] += netAmount;

        emit FundsDepositedByManager(tokenId, msg.sender, netAmount, grossRent, miscellaneousFee);
    }

    /**
     * @dev Admin triggers payout - deducts platform fee and distributes to shareholders
     * Only admin can trigger this
     * @param tokenId Property token ID
     */
    function callOutPay(uint256 tokenId) external onlyOwner {
        uint256 pendingAmount = pendingDistribution[tokenId];
        require(pendingAmount > 0, "No pending distribution");
        require(propertyToken.totalSupply(tokenId) > 0, "Property does not exist");

        // Calculate platform fee (3% or configured percentage)
        uint256 platformFee = (pendingAmount * platformFeeBps) / 10000;
        uint256 netForDistribution = pendingAmount - platformFee;

        // Send platform fee to fee recipient
        if (platformFee > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, platformFee);
        }

        // Move from pending to deposited (now available for shareholder claims)
        totalDeposited[tokenId] += netForDistribution;
        pendingDistribution[tokenId] = 0;

        emit PayoutTriggered(tokenId, pendingAmount, platformFee, netForDistribution);
    }

    /**
     * @dev Deprecated: Old deposit function kept for backward compatibility
     * Use depositRentByManager instead
     */
    function depositRent(
        uint256 tokenId, 
        uint256 grossRent, 
        uint256 maintenanceExpenses
    ) external onlyOwner {
        require(grossRent > 0, "Gross rent must be greater than 0");
        require(maintenanceExpenses < grossRent, "Maintenance cannot exceed gross rent");

        // Calculate net amount after maintenance
        uint256 netBeforeFee = grossRent - maintenanceExpenses;

        // Transfer net amount from company
        usdc.safeTransferFrom(msg.sender, address(this), netBeforeFee);

        // Calculate platform fee on net amount
        uint256 platformFee = (netBeforeFee * platformFeeBps) / 10000;
        uint256 netForDistribution = netBeforeFee - platformFee;

        // Send platform fee to fee recipient
        if (platformFee > 0 && feeRecipient != address(0)) {
            usdc.safeTransfer(feeRecipient, platformFee);
        }

        // Update total deposited for shareholders (directly distributed)
        totalDeposited[tokenId] += netForDistribution;

        // Verify property exists
        uint256 totalSupply = propertyToken.totalSupply(tokenId);
        require(totalSupply > 0, "No shares minted for this property");
    }

    /**
     * @dev Claim rewards for a specific property
     * @param tokenId Property token ID
     */
    function claim(uint256 tokenId) external {
        uint256 balance = propertyToken.balanceOf(msg.sender, tokenId);
        require(balance > 0, "No shares held");

        uint256 totalSupply = propertyToken.totalSupply(tokenId);
        require(totalSupply > 0, "No shares minted");

        // Calculate user's share of total deposited
        uint256 userShare = (totalDeposited[tokenId] * balance) / totalSupply;
        
        // Subtract what they've already claimed
        uint256 claimable = userShare - totalClaimed[tokenId][msg.sender];
        
        require(claimable > 0, "No rewards to claim");

        // Update claimed amount
        totalClaimed[tokenId][msg.sender] = userShare;

        // Transfer USDC to holder
        usdc.safeTransfer(msg.sender, claimable);

        emit RewardClaimed(tokenId, msg.sender, claimable);
    }

    /**
     * @dev Get claimable amount for a holder
     * @param tokenId Property token ID
     * @param holder Address of the holder
     * @return claimable amount in USDC
     */
    function getClaimableAmount(uint256 tokenId, address holder) external view returns (uint256) {
        uint256 balance = propertyToken.balanceOf(holder, tokenId);
        if (balance == 0 || propertyToken.totalSupply(tokenId) == 0) {
            return 0;
        }

        uint256 totalSupply = propertyToken.totalSupply(tokenId);
        uint256 userShare = (totalDeposited[tokenId] * balance) / totalSupply;
        uint256 alreadyClaimed = totalClaimed[tokenId][holder];

        if (userShare > alreadyClaimed) {
            return userShare - alreadyClaimed;
        }
        return 0;
    }

    /**
     * @dev Get pending distribution amount for a property (not yet available for claims)
     * @param tokenId Property token ID
     * @return pending amount waiting for admin to trigger payout
     */
    function getPendingDistribution(uint256 tokenId) external view returns (uint256) {
        return pendingDistribution[tokenId];
    }

    /**
     * @dev Check if an address is the manager for a property
     * @param tokenId Property token ID
     * @param account Address to check
     * @return true if account is the assigned manager
     */
    function isPropertyManager(uint256 tokenId, address account) external view returns (bool) {
        return propertyManagers[tokenId] == account;
    }

    /**
     * @dev Update platform fee (owner only)
     * @param newFeeBps New fee in basis points
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
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


