// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UserRegistry
 * @notice Manages user roles and KYC verification for the FractionalEstate platform
 */
contract UserRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    enum Role {
        NONE,      // 0 - Not registered
        CLIENT,    // 1 - Investor/Buyer
        SELLER,    // 2 - Property Owner
        ADMIN      // 3 - Platform Admin
    }
    
    enum KYCStatus {
        NONE,      // 0 - No KYC submitted
        PENDING,   // 1 - KYC submitted, awaiting review
        APPROVED,  // 2 - KYC approved
        REJECTED   // 3 - KYC rejected
    }
    
    struct UserProfile {
        Role role;
        KYCStatus kycStatus;
        string name;
        string email;
        string documentHash; // IPFS hash of KYC documents
        bool exists;
    }
    
    // Mappings
    mapping(address => UserProfile) public users;
    mapping(address => string) public rejectionReasons;
    
    // Events
    event UserRegistered(address indexed user, Role role, string name);
    event KYCSubmitted(address indexed user, string documentHash);
    event KYCApproved(address indexed user, address indexed admin);
    event KYCRejected(address indexed user, address indexed admin, string reason);
    event RoleUpdated(address indexed user, Role oldRole, Role newRole);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Register deployer as admin
        users[msg.sender] = UserProfile({
            role: Role.ADMIN,
            kycStatus: KYCStatus.APPROVED,
            name: "Platform Admin",
            email: "",
            documentHash: "",
            exists: true
        });
    }
    
    // ============ User Registration ============
    
    /**
     * @notice Register as a client/investor
     */
    function registerAsClient(string memory _name, string memory _email) external {
        require(!users[msg.sender].exists, "User already registered");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_email).length > 0, "Email required");
        
        users[msg.sender] = UserProfile({
            role: Role.CLIENT,
            kycStatus: KYCStatus.NONE,
            name: _name,
            email: _email,
            documentHash: "",
            exists: true
        });
        
        emit UserRegistered(msg.sender, Role.CLIENT, _name);
    }
    
    /**
     * @notice Register as a seller/property owner
     */
    function registerAsSeller(
        string memory _name, 
        string memory _email,
        string memory _businessName
    ) external {
        require(!users[msg.sender].exists, "User already registered");
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_email).length > 0, "Email required");
        
        // Store business name in name field for sellers
        string memory fullName = string(abi.encodePacked(_name, " - ", _businessName));
        
        users[msg.sender] = UserProfile({
            role: Role.SELLER,
            kycStatus: KYCStatus.NONE,
            name: fullName,
            email: _email,
            documentHash: "",
            exists: true
        });
        
        emit UserRegistered(msg.sender, Role.SELLER, fullName);
    }
    
    // ============ KYC Management ============
    
    /**
     * @notice Submit KYC documents
     * @param _documentHash IPFS hash of KYC documents
     */
    function submitKYC(string memory _documentHash) external {
        require(users[msg.sender].exists, "User not registered");
        require(bytes(_documentHash).length > 0, "Document hash required");
        require(
            users[msg.sender].kycStatus != KYCStatus.APPROVED,
            "KYC already approved"
        );
        
        users[msg.sender].documentHash = _documentHash;
        users[msg.sender].kycStatus = KYCStatus.PENDING;
        
        emit KYCSubmitted(msg.sender, _documentHash);
    }
    
    /**
     * @notice Approve user KYC (admin only)
     */
    function approveKYC(address _user) external onlyRole(ADMIN_ROLE) {
        require(users[_user].exists, "User not registered");
        require(
            users[_user].kycStatus == KYCStatus.PENDING,
            "KYC not pending"
        );
        
        users[_user].kycStatus = KYCStatus.APPROVED;
        delete rejectionReasons[_user]; // Clear any previous rejection reason
        
        emit KYCApproved(_user, msg.sender);
    }
    
    /**
     * @notice Reject user KYC (admin only)
     */
    function rejectKYC(address _user, string memory _reason) external onlyRole(ADMIN_ROLE) {
        require(users[_user].exists, "User not registered");
        require(
            users[_user].kycStatus == KYCStatus.PENDING,
            "KYC not pending"
        );
        require(bytes(_reason).length > 0, "Rejection reason required");
        
        users[_user].kycStatus = KYCStatus.REJECTED;
        rejectionReasons[_user] = _reason;
        
        emit KYCRejected(_user, msg.sender, _reason);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a new admin
     */
    function addAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_admin != address(0), "Invalid address");
        _grantRole(ADMIN_ROLE, _admin);
        
        if (!users[_admin].exists) {
            users[_admin] = UserProfile({
                role: Role.ADMIN,
                kycStatus: KYCStatus.APPROVED,
                name: "Admin",
                email: "",
                documentHash: "",
                exists: true
            });
        } else {
            Role oldRole = users[_admin].role;
            users[_admin].role = Role.ADMIN;
            users[_admin].kycStatus = KYCStatus.APPROVED;
            emit RoleUpdated(_admin, oldRole, Role.ADMIN);
        }
    }
    
    /**
     * @notice Remove admin role
     */
    function removeAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_admin != msg.sender, "Cannot remove self");
        _revokeRole(ADMIN_ROLE, _admin);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get user role
     */
    function getUserRole(address _user) external view returns (Role) {
        return users[_user].role;
    }
    
    /**
     * @notice Get KYC status
     */
    function getKYCStatus(address _user) external view returns (KYCStatus) {
        return users[_user].kycStatus;
    }
    
    /**
     * @notice Get full user profile
     */
    function getUserProfile(address _user) external view returns (
        Role role,
        KYCStatus kycStatus,
        string memory name,
        string memory email,
        string memory documentHash,
        bool exists
    ) {
        UserProfile memory profile = users[_user];
        return (
            profile.role,
            profile.kycStatus,
            profile.name,
            profile.email,
            profile.documentHash,
            profile.exists
        );
    }
    
    /**
     * @notice Check if user is registered
     */
    function isRegistered(address _user) external view returns (bool) {
        return users[_user].exists;
    }
    
    /**
     * @notice Check if user KYC is approved
     */
    function isKYCApproved(address _user) external view returns (bool) {
        return users[_user].kycStatus == KYCStatus.APPROVED;
    }
    
    /**
     * @notice Get rejection reason
     */
    function getRejectionReason(address _user) external view returns (string memory) {
        return rejectionReasons[_user];
    }
    
    /**
     * @notice Check if address is admin
     */
    function isAdmin(address _user) external view returns (bool) {
        return hasRole(ADMIN_ROLE, _user);
    }
}
