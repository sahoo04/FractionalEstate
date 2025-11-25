// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ZKRegistry
 * @notice Stores zero-knowledge proof hashes on-chain for KYC verification
 * @dev Only stores hashes, not PII - maintaining privacy while enabling verification
 */
contract ZKRegistry is Ownable {
    struct Proof {
        bytes32 proofHash;
        uint256 timestamp;
        string provider;
        address submittedBy;
    }

    // Mapping from user address to their proof
    mapping(address => Proof) public proofs;

    // Event emitted when a proof is submitted
    event ProofSubmitted(
        address indexed user,
        bytes32 indexed proofHash,
        string provider,
        uint256 timestamp,
        address indexed submittedBy
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Submit a proof hash for a user
     * @param user The address of the user being verified
     * @param proofHash The hash of the zero-knowledge proof
     * @param provider The KYC provider identifier (e.g., "Onfido", "Jumio")
     * @param timestamp The timestamp of verification
     * @dev Only owner (relayer/admin) can call this
     */
    function submitProof(
        address user,
        bytes32 proofHash,
        string calldata provider,
        uint256 timestamp
    ) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(proofHash != bytes32(0), "Invalid proof hash");
        require(bytes(provider).length > 0, "Provider required");

        proofs[user] = Proof({
            proofHash: proofHash,
            timestamp: timestamp,
            provider: provider,
            submittedBy: msg.sender
        });

        emit ProofSubmitted(user, proofHash, provider, timestamp, msg.sender);
    }

    /**
     * @notice Get proof information for a user
     * @param user The address of the user
     * @return proofHash The proof hash
     * @return timestamp The verification timestamp
     * @return provider The KYC provider
     * @return submittedBy The address that submitted the proof
     */
    function getProof(
        address user
    ) external view returns (
        bytes32 proofHash,
        uint256 timestamp,
        string memory provider,
        address submittedBy
    ) {
        Proof memory p = proofs[user];
        return (p.proofHash, p.timestamp, p.provider, p.submittedBy);
    }

    /**
     * @notice Check if a user has a verified proof
     * @param user The address of the user
     * @return Whether the user has a verified proof
     */
    function hasProof(address user) external view returns (bool) {
        return proofs[user].proofHash != bytes32(0);
    }
}




