// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./PropertyShare1155.sol";

/**
 * @title Governance
 * @dev Token-weighted voting system for property decisions
 * Simple yes/no proposals with voting power based on share ownership
 */
contract Governance is Ownable {
    PropertyShare1155 public immutable propertyToken;

    // Proposal structure
    struct Proposal {
        uint256 tokenId; // Property token ID
        string description;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
    }

    // Mapping from proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;

    // Mapping from proposal ID => voter address => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Total number of proposals
    uint256 public proposalCount;

    // Voting period (in seconds, default 7 days)
    uint256 public votingPeriod;

    // Minimum voting power required to create a proposal (in shares)
    uint256 public minProposalPower;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed tokenId,
        address indexed proposer,
        string description
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );

    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    event VotingPeriodUpdated(uint256 newPeriod);
    event MinProposalPowerUpdated(uint256 newPower);

    constructor(
        address _propertyToken,
        address initialOwner,
        uint256 _votingPeriod,
        uint256 _minProposalPower
    ) Ownable(initialOwner) {
        propertyToken = PropertyShare1155(_propertyToken);
        votingPeriod = _votingPeriod;
        minProposalPower = _minProposalPower;
        proposalCount = 0;
    }

    /**
     * @dev Create a new proposal
     * @param tokenId Property token ID
     * @param description Proposal description
     * @return proposalId The new proposal ID
     */
    function createProposal(
        uint256 tokenId,
        string memory description
    ) external returns (uint256) {
        // Check proposer has minimum voting power
        uint256 balance = propertyToken.balanceOf(msg.sender, tokenId);
        require(balance >= minProposalPower, "Insufficient voting power");

        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = Proposal({
            tokenId: tokenId,
            description: description,
            proposer: msg.sender,
            yesVotes: 0,
            noVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executed: false,
            passed: false
        });

        emit ProposalCreated(proposalId, tokenId, msg.sender, description);
        return proposalId;
    }

    /**
     * @dev Vote on a proposal
     * @param proposalId Proposal ID
     * @param support true for yes, false for no
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.executed, "Proposal already executed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        // Get voter's share balance (voting power)
        uint256 votingPower = propertyToken.balanceOf(msg.sender, proposal.tokenId);
        require(votingPower > 0, "No shares held");

        // Record vote
        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.yesVotes += votingPower;
        } else {
            proposal.noVotes += votingPower;
        }

        emit VoteCast(proposalId, msg.sender, support, votingPower);
    }

    /**
     * @dev Execute a proposal (anyone can call after voting period)
     * @param proposalId Proposal ID
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp > proposal.endTime, "Voting still active");
        require(!proposal.executed, "Proposal already executed");

        proposal.executed = true;
        proposal.passed = proposal.yesVotes > proposal.noVotes;

        emit ProposalExecuted(proposalId, proposal.passed);
    }

    /**
     * @dev Get proposal details
     * @param proposalId Proposal ID
     * @return Proposal struct
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Update voting period (owner only)
     * @param newPeriod New voting period in seconds
     */
    function setVotingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod > 0, "Period must be greater than 0");
        votingPeriod = newPeriod;
        emit VotingPeriodUpdated(newPeriod);
    }

    /**
     * @dev Update minimum proposal power (owner only)
     * @param newPower New minimum voting power required
     */
    function setMinProposalPower(uint256 newPower) external onlyOwner {
        minProposalPower = newPower;
        emit MinProposalPowerUpdated(newPower);
    }
}







