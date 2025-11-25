"use client";

import React, { useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useChainId,
} from "wagmi";
import { CONTRACTS, USDC_ABI } from "@/lib/contracts";
import { useToast } from "@/contexts/ToastContext";
import { logger } from "@/lib/logger";
import { arbitrumSepolia } from "wagmi/chains";
import { Coins, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface MintUSDCButtonProps {
  variant?: "default" | "compact" | "inline";
  showBalance?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function MintUSDCButton({
  variant = "default",
  showBalance = false,
  onSuccess,
  className = "",
}: MintUSDCButtonProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { addToast } = useToast();
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

  // Read USDC balance to refetch after mint
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Only show on testnet (Arbitrum Sepolia)
  const isTestnet = chainId === arbitrumSepolia.id;
  const isDisabled = !isConnected || isPending || isConfirming || !isTestnet;

  const handleMint = () => {
    if (!address || !isConnected) {
      addToast("error", "Please connect your wallet first");
      return;
    }

    if (!isTestnet) {
      addToast("error", "Faucet is only available on testnet");
      return;
    }

    try {
      logger.info("Minting USDC from faucet", { address });
      writeContract({
        address: CONTRACTS.USDC,
        abi: USDC_ABI,
        functionName: "faucet",
        args: [],
      });
    } catch (error: any) {
      logger.error("Error calling faucet", error);
      addToast("error", error.message || "Failed to mint USDC");
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      logger.info("USDC minted successfully", { hash, address });
      addToast("success", "Successfully minted 10,000 test USDC!");
      refetchBalance();
      onSuccess?.();
    }
  }, [isSuccess, hash, address, refetchBalance, onSuccess, addToast]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      logger.error("Write contract error", writeError);
      if (writeError.message?.includes("User rejected")) {
        addToast("error", "Transaction rejected");
      } else {
        addToast("error", writeError.message || "Failed to mint USDC");
      }
    }
  }, [writeError, addToast]);

  useEffect(() => {
    if (txError) {
      logger.error("Transaction error", txError);
      addToast("error", "Transaction failed. Please try again.");
    }
  }, [txError, addToast]);

  // Don't show on mainnet
  if (!isTestnet) {
    return null;
  }

  const formattedBalance = usdcBalance
    ? (Number(usdcBalance) / 1e6).toFixed(2)
    : "0.00";
  const isLoading = isPending || isConfirming;

  // Compact variant (for dropdowns, small spaces)
  if (variant === "compact") {
    return (
      <button
        onClick={handleMint}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg"
        } ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Minting...</span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4" />
            <span>Mint Test USDC</span>
          </>
        )}
      </button>
    );
  }

  // Inline variant (for text links)
  if (variant === "inline") {
    return (
      <button
        onClick={handleMint}
        disabled={isDisabled}
        className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
          isDisabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-green-600 hover:text-green-700"
        } ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Minting...</span>
          </>
        ) : (
          <>
            <Coins className="w-3 h-3" />
            <span>Mint Test USDC</span>
          </>
        )}
      </button>
    );
  }

  // Default variant (full button with balance display)
  return (
    <div className={`space-y-2 ${className}`}>
      {showBalance && (
        <div className="text-sm text-gray-600">
          Current Balance:{" "}
          <span className="font-semibold text-gray-900">
            ${formattedBalance} USDC
          </span>
        </div>
      )}
      <button
        onClick={handleMint}
        disabled={isDisabled}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all ${
          isDisabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5"
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>
              {isPending
                ? "Waiting for wallet..."
                : "Confirming transaction..."}
            </span>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle className="w-5 h-5" />
            <span>Minted Successfully!</span>
          </>
        ) : (
          <>
            <Coins className="w-5 h-5" />
            <span>Mint 10,000 Test USDC</span>
          </>
        )}
      </button>
      <p className="text-xs text-gray-500 text-center">
        Get test tokens for free on Arbitrum Sepolia testnet
      </p>
    </div>
  );
}
