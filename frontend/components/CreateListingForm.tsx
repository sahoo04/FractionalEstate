"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from "wagmi";
import {
  CONTRACTS,
  MARKETPLACE_ABI,
  PROPERTY_SHARE_1155_ABI,
} from "@/lib/contracts";
import { logger } from "@/lib/logger";
import {
  extractListingIdFromReceipt,
  extractListingIdWithRetry,
} from "@/lib/contract-events";
import {
  X,
  Store,
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";

interface CreateListingFormProps {
  tokenId: number;
  propertyName: string;
  userBalance: bigint;
  pricePerShareMarket?: number;
  onSuccess?: () => void;
}

export function CreateListingForm({
  tokenId,
  propertyName,
  userBalance,
  pricePerShareMarket,
  onSuccess,
}: CreateListingFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [amount, setAmount] = useState("");
  const [pricePerShare, setPricePerShare] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [extractedListingId, setExtractedListingId] = useState<number | null>(
    null
  );
  const [syncingToDatabase, setSyncingToDatabase] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: CONTRACTS.PropertyShare1155,
    abi: PROPERTY_SHARE_1155_ABI,
    functionName: "isApprovedForAll",
    args: [address!, CONTRACTS.Marketplace],
    query: {
      enabled: !!address,
    },
  });

  // Refetch approval status after transaction confirms
  useEffect(() => {
    if (isSuccess && !isApproved) {
      // Approval transaction succeeded, refetch approval status
      setTimeout(() => {
        refetchApproval();
      }, 1000);
    }
  }, [isSuccess, isApproved, refetchApproval]);

  // Extract listingId and sync to database after successful listing creation
  useEffect(() => {
    if (
      isSuccess &&
      hash &&
      receipt &&
      publicClient &&
      address &&
      amount &&
      pricePerShare
    ) {
      const extractAndSync = async () => {
        try {
          logger.info(
            "✅ Transaction confirmed, extracting listingId and syncing to database",
            { txHash: hash }
          );

          // Method 1: Try extracting from current receipt first (fast)
          let listingId = extractListingIdFromReceipt(receipt as any);

          // Method 2: If failed, retry with fresh receipt fetch
          if (!listingId && hash) {
            logger.warn(
              "⚠️ Initial extraction failed, trying with retry mechanism"
            );
            listingId = await extractListingIdWithRetry(hash, publicClient, 3);
          }

          if (!listingId) {
            logger.warn(
              "⚠️ Could not extract listingId from transaction receipt"
            );
            // Still close form
            setTimeout(() => {
              setShowForm(false);
              setAmount("");
              setPricePerShare("");
              onSuccess?.();
            }, 2000);
            return;
          }

          const listingIdNum = Number(listingId);
          setExtractedListingId(listingIdNum);
          logger.info("✅ ListingId extracted successfully", {
            listingId: listingIdNum,
          });

          // Sync to database directly from blockchain (indexer may not be running)
          setSyncingToDatabase(true);
          try {
            logger.info("🔄 Syncing listing from blockchain to database", {
              listingId: listingIdNum,
            });

            // Read listing data from blockchain and sync to database
            const response = await fetch(
              "/api/marketplace/sync-from-blockchain",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  listingId: listingIdNum,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              logger.info("✅ Listing synced to database successfully", {
                listingId: listingIdNum,
              });
              console.log("✅ Listing synced to database:", data);
            } else {
              const errorData = await response.text();
              logger.error("❌ Failed to sync listing to database", {
                status: response.status,
                error: errorData,
                listingId: listingIdNum,
              });
              console.error(
                "❌ Failed to sync listing:",
                response.status,
                errorData
              );
            }
          } catch (error) {
            logger.error("❌ Error syncing listing to database", error, {
              listingId: listingIdNum,
            });
            console.error("❌ Error syncing listing to database:", error);
          } finally {
            setSyncingToDatabase(false);
            // Close form after showing success message
            setTimeout(() => {
              setShowForm(false);
              setAmount("");
              setPricePerShare("");
              setExtractedListingId(null);
              onSuccess?.();
            }, 2000);
          }
        } catch (error) {
          logger.error("❌ Error extracting listingId", error);
          setSyncingToDatabase(false);
          setTimeout(() => {
            setShowForm(false);
            setAmount("");
            setPricePerShare("");
            onSuccess?.();
          }, 2000);
        }
      };

      extractAndSync();
    }
  }, [
    isSuccess,
    hash,
    receipt,
    publicClient,
    address,
    amount,
    pricePerShare,
    tokenId,
    propertyName,
    onSuccess,
  ]);

  const handleApprove = async () => {
    if (!address) return;

    try {
      writeContract({
        address: CONTRACTS.PropertyShare1155,
        abi: PROPERTY_SHARE_1155_ABI,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.Marketplace, true],
      });
    } catch (error) {
      logger.error("Error approving marketplace", error, { tokenId, address });
    }
  };

  const handleCreateListing = async () => {
    if (!address || !amount || !pricePerShare) return;

    // Force refetch approval status before creating listing
    const { data: currentApproval } = await refetchApproval();

    // Verify approval before attempting to create listing
    if (!currentApproval) {
      alert("Please approve the marketplace first");
      return;
    }

    // Verify user has enough shares
    if (BigInt(amount) > userBalance) {
      alert(
        `You only have ${userBalance.toString()} shares but trying to list ${amount}`
      );
      return;
    }

    try {
      // Price per share should be in USDC (6 decimals)
      const priceInUsdc = BigInt(Math.floor(parseFloat(pricePerShare) * 1e6));

      writeContract({
        address: CONTRACTS.Marketplace,
        abi: MARKETPLACE_ABI,
        functionName: "createListing",
        args: [BigInt(tokenId), BigInt(amount), priceInUsdc],
        account: address,
      });
    } catch (error) {
      logger.error("Error creating listing", error, {
        tokenId,
        amount,
        pricePerShare,
        address,
      });
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
      >
        <Store className="h-4 w-4 group-hover:scale-110 transition-transform" />
        List for Sale
      </button>
    );
  }

  if (!mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={() => setShowForm(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 overflow-hidden border border-purple-200 dark:border-purple-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-8 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>

            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">List Shares for Sale</h3>
                <p className="text-purple-100 text-sm mt-0.5">{propertyName}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Available Shares Info */}
            <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available Shares
                </span>
              </div>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {Number(userBalance)}
              </span>
            </div>

            {/* Number of Shares Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                Number of Shares to Sell
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={Number(userBalance)}
                  min="1"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-lg font-semibold"
                  placeholder="Enter amount"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Max: {Number(userBalance)}
                </div>
              </div>
            </div>

            {/* Price per Share Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Price per Share (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={pricePerShare}
                  onChange={(e) => setPricePerShare(e.target.value)}
                  step="0.01"
                  min="0.01"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
              {pricePerShare && parseFloat(pricePerShare) > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  = {(parseFloat(pricePerShare) * 1e6).toLocaleString()} USDC (6
                  decimals)
                </p>
              )}
            </div>

            {/* Total Value Display */}
            {amount && pricePerShare && (
              <div className="relative p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl border-2 border-purple-200 dark:border-purple-700 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-indigo-600/5"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                      Total Listing Value
                    </div>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      $
                      {(parseFloat(amount) * parseFloat(pricePerShare)).toFixed(
                        2
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {amount} shares × ${parseFloat(pricePerShare).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-600/10 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isApproved ? (
                <>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                      You need to approve the marketplace contract to list your
                      shares for sale. This is a one-time approval.
                    </p>
                  </div>
                  <button
                    onClick={handleApprove}
                    disabled={isPending || isConfirming}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    {isPending || isConfirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Approving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Approve Marketplace
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCreateListing}
                  disabled={
                    !amount || !pricePerShare || isPending || isConfirming
                  }
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Listing...
                    </>
                  ) : (
                    <>
                      <Store className="h-5 w-5" />
                      Create Listing
                    </>
                  )}
                </button>
              )}

              {/* Success/Loading Message */}
              {(isSuccess || syncingToDatabase) && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    {syncingToDatabase ? (
                      <>
                        <Loader2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-spin flex-shrink-0" />
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          Syncing to database...
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                          Listing created successfully!
                        </span>
                      </>
                    )}
                  </div>
                  {extractedListingId && !syncingToDatabase && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 ml-8">
                      Listing ID: #{extractedListingId} • Synced to database
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
