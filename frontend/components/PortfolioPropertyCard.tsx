"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import {
  CONTRACTS,
  REVENUE_SPLITTER_ABI,
  PROPERTY_SHARE_1155_ABI,
} from "@/lib/contracts";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";
import { getImageUrl } from "@/lib/image-utils";
import { CreateListingForm } from "@/components/CreateListingForm";

interface PropertyCardProps {
  item: {
    token_id: number;
    shares: number;
    total_invested: string;
    current_value: string;
    property?: {
      name?: string;
      location?: string;
      images?: string[];
      price_per_share?: string;
    };
  };
}

export function PortfolioPropertyCard({ item }: PropertyCardProps) {
  const { address } = useAccount();
  const [isClaimingThis, setIsClaimingThis] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Read user's balance of this property shares from blockchain
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "balanceOf",
    args: address ? [address, BigInt(item.token_id)] : undefined,
  });

  // Auto-sync on mount if there's a mismatch
  useEffect(() => {
    const checkAndSync = async () => {
      if (!userBalance || !address) return;

      const blockchainShares = Number(userBalance);
      const dbShares = item.shares;

      // If mismatch detected, sync the database
      if (blockchainShares !== dbShares) {
        console.warn(
          `Share mismatch detected for token ${item.token_id}: DB=${dbShares}, Blockchain=${blockchainShares}`
        );
        await syncPortfolio();
      }
    };

    checkAndSync();
  }, [userBalance, address, item.shares, item.token_id]);

  // Function to sync portfolio with blockchain
  const syncPortfolio = async () => {
    if (!address || !userBalance) return;

    setIsSyncing(true);
    try {
      const response = await fetch("/api/portfolio/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          tokenId: item.token_id,
          shares: Number(userBalance),
        }),
      });

      if (response.ok) {
        console.log("Portfolio synced successfully");
        // Reload the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to sync portfolio:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Read claimable amount for this specific property
  const { data: claimableAmount, refetch: refetchClaimable } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "getClaimableAmount",
    args: address ? [BigInt(item.token_id), address] : undefined,
  });

  // Read pending distribution (not yet approved by admin)
  const { data: pendingDistribution } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "getPendingDistribution",
    args: [BigInt(item.token_id)],
  });

  // Read total deposited for this property
  const { data: totalDeposited } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "totalDeposited",
    args: [BigInt(item.token_id)],
  });

  // Read total supply of shares for this property
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "totalSupply",
    args: [BigInt(item.token_id)],
  });

  // Read total claimed by user for this property
  const { data: totalClaimed } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "totalClaimed",
    args: address ? [BigInt(item.token_id), address] : undefined,
  });

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  // Refetch claimable amount after successful claim
  useEffect(() => {
    if (isTxSuccess) {
      refetchClaimable();
      setIsClaimingThis(false);
    }
  }, [isTxSuccess, refetchClaimable]);

  const handleClaim = async () => {
    if (!address || !claimableAmount || claimableAmount === BigInt(0)) return;

    try {
      setIsClaimingThis(true);
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: "claim",
        args: [BigInt(item.token_id)],
      });
    } catch (error) {
      console.error("Claim error:", error);
      setIsClaimingThis(false);
    }
  };

  const claimableUSDC = claimableAmount
    ? parseFloat(formatUnits(claimableAmount, 6))
    : 0;
  const pendingUSDC = pendingDistribution
    ? parseFloat(formatUnits(pendingDistribution, 6))
    : 0;
  const totalDepositedUSDC = totalDeposited
    ? parseFloat(formatUnits(totalDeposited, 6))
    : 0;
  const totalSupplyShares = totalSupply ? Number(totalSupply) : 0;
  const totalClaimedUSDC = totalClaimed
    ? parseFloat(formatUnits(totalClaimed, 6))
    : 0;

  // Use blockchain balance as source of truth, fallback to database
  const blockchainShares = userBalance ? Number(userBalance) : null;
  const actualShares = blockchainShares ?? item.shares;
  const hasMismatch =
    blockchainShares !== null && blockchainShares !== item.shares;

  // Calculate user's share percentage and portion
  const userShares = actualShares;
  const sharePercentage =
    totalSupplyShares > 0 ? (userShares / totalSupplyShares) * 100 : 0;
  const userPortion = totalDepositedUSDC * (sharePercentage / 100);

  return (
    <div className="group relative border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 hover:-translate-y-1">
      {/* Ownership Badge - Top Left Corner */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg backdrop-blur-sm">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>OWNED</span>
        </div>
      </div>

      {/* Property Image */}
      <Link href={`/property/${item.token_id}`}>
        <div className="h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 relative cursor-pointer overflow-hidden">
          {item.property?.images?.[0] &&
          getImageUrl(item.property.images[0]) ? (
            <img
              src={getImageUrl(item.property.images[0])}
              alt={item.property?.name || "Property"}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          {(!item.property?.images?.[0] ||
            !getImageUrl(item.property.images[0])) && (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 22V12h6v10"
                />
              </svg>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

          {/* Badge for claimable rewards */}
          {claimableUSDC > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <div className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-bold shadow-xl backdrop-blur-sm animate-pulse">
                <DollarSign className="h-4 w-4" />
                <span>${claimableUSDC.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Property Info */}
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/property/${item.token_id}`}
            className="block flex-1 group/title"
          >
            <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 line-clamp-2 group-hover/title:text-primary-600 transition-colors">
              {item.property?.name || `Property #${item.token_id}`}
            </h3>
            {item.property?.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-medium">{item.property.location}</span>
              </div>
            )}
          </Link>

          {/* Manual Sync Button */}
          {hasMismatch && (
            <button
              onClick={syncPortfolio}
              disabled={isSyncing}
              className="flex-shrink-0 p-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync with blockchain"
            >
              <svg
                className={`w-5 h-5 text-amber-600 dark:text-amber-400 ${
                  isSyncing ? "animate-spin" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Investment Details - Enhanced */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
          {hasMismatch && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-amber-600 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Syncing with blockchain...
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Database: {item.shares} shares • Blockchain: {blockchainShares}{" "}
                shares
              </p>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Shares Owned
            </span>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <svg
                  className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                </svg>
              </div>
              <div className="text-right">
                <span className="font-bold text-xl text-gray-900 dark:text-white">
                  {actualShares}
                </span>
                {hasMismatch && (
                  <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">
                    *
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Invested
            </span>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">
              ${parseFloat(item.total_invested).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Current Value
            </span>
            <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
              ${parseFloat(item.current_value).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Revenue Info - Enhanced */}
        <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                <svg
                  className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Claimable Now
              </span>
            </div>
            <span className="font-extrabold text-xl text-emerald-600 dark:text-emerald-400">
              ${claimableUSDC.toFixed(2)}
            </span>
          </div>

          {pendingUSDC > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-lg">
                  <svg
                    className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  Pending Approval
                </span>
              </div>
              <span className="font-bold text-lg text-amber-600 dark:text-amber-400">
                ${pendingUSDC.toFixed(2)}
              </span>
            </div>
          )}

          {/* Revenue Breakdown - Expandable */}
          {totalDepositedUSDC > 0 && totalSupplyShares > 0 && (
            <details className="group">
              <summary className="cursor-pointer flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <svg
                      className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Revenue Breakdown
                  </span>
                </div>
                <svg
                  className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                {/* Share Ownership */}
                <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Your Ownership
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {sharePercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {userShares} shares / {totalSupplyShares} total shares
                    </span>
                  </div>
                </div>

                {/* Total Deposited */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Total Revenue Deposited
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    ${totalDepositedUSDC.toFixed(2)}
                  </span>
                </div>

                {/* Your Portion */}
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Your Portion ({sharePercentage.toFixed(2)}%)
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    ${userPortion.toFixed(2)}
                  </span>
                </div>

                {/* Already Claimed */}
                {totalClaimedUSDC > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                      Already Claimed
                    </span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                      ${totalClaimedUSDC.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Currently Claimable */}
                <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Currently Claimable
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ${claimableUSDC.toFixed(2)}
                  </span>
                </div>

                {/* Diagnostic Info - Show if there's a mismatch */}
                {(userPortion < claimableUSDC * 0.9 ||
                  userPortion > claimableUSDC * 1.1) &&
                  claimableUSDC > 0 && (
                    <div className="pt-2 border-t border-red-200 dark:border-red-800">
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-xs font-bold text-red-800 dark:text-red-300 mb-1">
                          ⚠️ Potential Issue Detected
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                          Your claimable amount (${claimableUSDC.toFixed(2)})
                          doesn't match your calculated portion ($
                          {userPortion.toFixed(2)}). This may indicate:
                        </p>
                        <ul className="text-xs text-red-600 dark:text-red-400 mt-1 ml-4 list-disc space-y-0.5">
                          <li>
                            Total supply mismatch (contract shows{" "}
                            {totalSupplyShares} shares)
                          </li>
                          <li>Accumulated unclaimed from previous periods</li>
                          <li>Contract state needs verification</li>
                        </ul>
                      </div>
                    </div>
                  )}

                {/* Info Note */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    💡 Revenue is split proportionally:{" "}
                    <strong>
                      (Total Deposited × Your Shares) ÷ Total Supply
                    </strong>
                    . Unclaimed amounts stay in the contract until you claim
                    them.
                  </p>
                </div>

                {/* Contract State Debug Info */}
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
                    🔍 View Contract State (Debug)
                  </summary>
                  <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono space-y-1">
                    <div>
                      Total Supply (contract):{" "}
                      <span className="text-blue-600">{totalSupplyShares}</span>{" "}
                      shares
                    </div>
                    <div>
                      Your Balance:{" "}
                      <span className="text-blue-600">{userShares}</span> shares
                    </div>
                    <div>
                      Total Deposited:{" "}
                      <span className="text-blue-600">
                        ${totalDepositedUSDC.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Calculated User Share:{" "}
                      <span className="text-green-600">
                        ${userPortion.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Total Claimed:{" "}
                      <span className="text-gray-600">
                        ${totalClaimedUSDC.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Claimable (contract):{" "}
                      <span className="text-emerald-600">
                        ${claimableUSDC.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-gray-300">
                      Formula: ({totalDepositedUSDC.toFixed(2)} × {userShares})
                      ÷ {totalSupplyShares} = ${userPortion.toFixed(2)}
                    </div>
                  </div>
                </details>
              </div>
            </details>
          )}
        </div>

        {/* Claim Button - Enhanced */}
        {claimableUSDC > 0 && (
          <button
            onClick={handleClaim}
            disabled={isClaimingThis || isTxPending}
            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 group/btn"
          >
            {isClaimingThis || isTxPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Claiming Rewards...</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5 group-hover/btn:animate-bounce" />
                <span>Claim ${claimableUSDC.toFixed(2)} USDC</span>
              </>
            )}
          </button>
        )}

        {claimableUSDC === 0 && pendingUSDC > 0 && (
          <div className="w-full px-5 py-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-2 border-amber-200 dark:border-amber-700 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">💰</span>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300">
                Pending Admin Approval
              </p>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ${pendingUSDC.toFixed(2)} will be available soon
            </p>
          </div>
        )}

        {claimableUSDC === 0 &&
          pendingUSDC === 0 &&
          totalDepositedUSDC === 0 && (
            <div className="w-full px-5 py-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl text-center border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  No Revenue Yet
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Distributions will appear here
              </p>
            </div>
          )}

        {/* List for Sale Button - Enhanced */}
        {userBalance && userBalance > BigInt(0) && (
          <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-5">
            <div className="mb-2 flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider">
                Secondary Market
              </span>
            </div>
            <CreateListingForm
              tokenId={item.token_id}
              propertyName={item.property?.name || `Property #${item.token_id}`}
              userBalance={userBalance}
            />
          </div>
        )}
      </div>
    </div>
  );
}
