"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { CONTRACTS, MARKETPLACE_ABI, USDC_ABI } from "@/lib/contracts";
import { useToast } from "@/contexts/ToastContext";
import { logger } from "@/lib/logger";
import { parseUnits, formatUnits } from "viem";
import { X, Loader2, Coins, DollarSign, AlertCircle } from "lucide-react";

// Global set to track processed transactions across all component instances
// This prevents duplicate processing even if React Strict Mode runs effects twice
const processedTransactions = new Set<string>();

interface Listing {
  id: string;
  listingId: number;
  sellerWallet: string;
  tokenId: number;
  propertyName: string;
  sharesAmount: number;
  pricePerShare: string;
  totalPrice: string;
  status: string;
  createdAt: string;
}

interface MarketplacePurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing | null;
  onSuccess?: () => void;
}

export function MarketplacePurchaseDialog({
  isOpen,
  onClose,
  listing,
  onSuccess,
}: MarketplacePurchaseDialogProps) {
  const { address } = useAccount();
  const { addToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const processedHashRef = useRef<string | null>(null);
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: txError,
  } = useWaitForTransactionReceipt({ hash });

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isOpen,
    },
  });

  // Read USDC allowance
  const { data: usdcAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.Marketplace] : undefined,
    query: {
      enabled: !!address && isOpen,
    },
  });

  // Reset quantity when dialog opens/closes or listing changes
  useEffect(() => {
    if (isOpen && listing) {
      setQuantity(1);
    }
  }, [isOpen, listing]);

  // Handle success - prevent duplicate processing
  useEffect(() => {
    if (!isSuccess || !hash || !listing) return;

    // Check if we've already processed this transaction
    // Use hash as string for comparison
    const hashString: string = typeof hash === 'string' ? hash : (hash ? String(hash) : '');
    if (!hashString) return;
    
    // Check both local ref and global set to prevent duplicates across instances
    if (processedHashRef.current === hashString || processedTransactions.has(hashString)) {
      return;
    }

    // Mark as processed IMMEDIATELY in both local ref and global set
    processedHashRef.current = hashString;
    processedTransactions.add(hashString);

    // Log only once - AFTER marking as processed
    logger.info("Purchase successful", {
      hash: hashString,
      listingId: listing.listingId,
      quantity,
    });

    // Sync with database and wait for completion before calling onSuccess
    fetch("/api/marketplace/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing.listingId,
        buyerWallet: address,
        sellerWallet: listing.sellerWallet,
        tokenId: listing.tokenId,
        sharesAmount: quantity,
        totalPrice: (quantity * parseFloat(listing.pricePerShare)).toString(),
        transactionHash: hashString,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to sync purchase to database");
        }
        return response.json();
      })
      .then(() => {
        // Database sync complete, now update UI
        addToast(
          "success",
          `Successfully purchased ${quantity} share${
            quantity > 1 ? "s" : ""
          }!`
        );
        refetchBalance();
        refetchAllowance();
        // Call onSuccess after database sync completes so parent can refetch with updated data
        onSuccess?.();
        onClose();
      })
      .catch((error) => {
        logger.error("Error syncing purchase to database", error);
        // Still show success and close dialog, but log the error
        addToast(
          "success",
          `Successfully purchased ${quantity} share${
            quantity > 1 ? "s" : ""
          }!`
        );
        refetchBalance();
        refetchAllowance();
        onSuccess?.();
        onClose();
      });
  }, [isSuccess, hash, listing, quantity, address, refetchBalance, refetchAllowance, onSuccess, onClose, addToast]);

  // Reset processed hash when dialog closes or new listing opens
  useEffect(() => {
    if (!isOpen || !listing) {
      // Only clear local ref, keep global set to prevent duplicates across component remounts
      processedHashRef.current = null;
    }
  }, [isOpen, listing]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      logger.error("Write contract error", writeError);
      if (writeError.message?.includes("User rejected")) {
        addToast("error", "Transaction rejected");
      } else {
        addToast("error", writeError.message || "Failed to purchase shares");
      }
    }
  }, [writeError, addToast]);

  useEffect(() => {
    if (txError) {
      logger.error("Transaction error", txError);
      addToast("error", "Transaction failed. Please try again.");
    }
  }, [txError, addToast]);

  if (!isOpen || !listing) return null;

  const maxShares = listing.sharesAmount;
  const pricePerShare = parseFloat(listing.pricePerShare);
  const totalCost = quantity * pricePerShare;
  const totalCostInUSDC = parseUnits(totalCost.toString(), 6);
  const balance = usdcBalance || BigInt(0);
  const allowance = usdcAllowance || BigInt(0);
  const formattedBalance = (Number(balance) / 1e6).toFixed(2);
  const needsApproval = allowance < totalCostInUSDC;
  const hasEnoughBalance = balance >= totalCostInUSDC;

  // Calculate marketplace fee (2.5%)
  const marketplaceFee = totalCost * 0.025;
  const sellerReceives = totalCost - marketplaceFee;

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 0;
    if (num < 1) {
      setQuantity(1);
    } else if (num > maxShares) {
      setQuantity(maxShares);
    } else {
      setQuantity(num);
    }
  };

  const handleApprove = async () => {
    if (!address) return;

    try {
      logger.info("Approving USDC for marketplace purchase", {
        listing: listing.listingId,
        amount: totalCostInUSDC.toString(),
      });

      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: "approve",
        args: [CONTRACTS.Marketplace, totalCostInUSDC],
      });
    } catch (error) {
      logger.error("Error approving USDC", error);
      addToast("error", "Failed to approve USDC spending. Please try again.");
    }
  };

  const handlePurchase = async () => {
    if (!address || !listing) return;

    if (!hasEnoughBalance) {
      addToast(
        "error",
        `Insufficient USDC balance. You need $${totalCost.toFixed(
          2
        )} but only have $${formattedBalance}`
      );
      return;
    }

    if (needsApproval) {
      addToast("error", "Please approve USDC first");
      return;
    }

    try {
      logger.info("Purchasing from marketplace", {
        listingId: listing.listingId,
        quantity,
        totalPrice: totalCostInUSDC.toString(),
      });

      // Check if buying full listing or partial
      if (quantity === maxShares) {
        // Buy full listing using existing purchase function
        writeContract({
          address: CONTRACTS.Marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "purchase",
          args: [BigInt(listing.listingId)],
        });
      } else {
        // Buy partial using purchasePartial function
        writeContract({
          address: CONTRACTS.Marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "purchasePartial",
          args: [BigInt(listing.listingId), BigInt(quantity)],
        });
      }
    } catch (error) {
      logger.error("Error purchasing listing", error);
      addToast("error", "Failed to complete purchase. Please try again.");
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-web3-500 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Purchase Shares
              </h2>
              <p className="text-sm text-gray-600">{listing.propertyName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Listing Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available Shares</span>
              <span className="font-semibold text-gray-900">
                {maxShares.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per Share</span>
              <span className="font-semibold text-gray-900">
                ${pricePerShare.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Number of Shares to Buy
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleQuantityChange((quantity - 1).toString())}
                disabled={quantity <= 1 || isLoading}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl font-bold text-gray-600">−</span>
              </button>
              <input
                type="number"
                min="1"
                max={maxShares}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-3 text-center text-lg font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              />
              <button
                onClick={() => handleQuantityChange((quantity + 1).toString())}
                disabled={quantity >= maxShares || isLoading}
                className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-xl font-bold text-gray-600">+</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              You can buy between 1 and {maxShares} shares
            </p>
          </div>

          {/* Balance Display */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Your USDC Balance
                </span>
              </div>
              <span className="text-lg font-bold text-blue-600">
                ${formattedBalance}
              </span>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gradient-to-br from-primary-50 to-web3-50 rounded-xl p-4 border border-primary-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shares ({quantity})</span>
              <span className="font-semibold text-gray-900">
                ${(quantity * pricePerShare).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Marketplace Fee (2.5%)</span>
              <span className="font-semibold text-gray-900">
                ${marketplaceFee.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-primary-200 flex justify-between">
              <span className="font-bold text-gray-900">Total Cost</span>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent">
                ${totalCost.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              Seller receives: ${sellerReceives.toFixed(2)} (after 2.5% fee)
            </p>
          </div>

          {/* Error Messages */}
          {!hasEnoughBalance && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">Insufficient Balance</p>
                <p>
                  You need ${totalCost.toFixed(2)} USDC but only have $
                  {formattedBalance}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isLoading || !hasEnoughBalance}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-web3-600 to-web3-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <span>🔓 Approve USDC</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={isLoading || !hasEnoughBalance || quantity < 1}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isPending ? "Waiting..." : "Confirming..."}</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-5 h-5" />
                    <span>
                      Buy {quantity} Share{quantity > 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
