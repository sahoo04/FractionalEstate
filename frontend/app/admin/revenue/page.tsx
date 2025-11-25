"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  usePublicClient,
} from "wagmi";
import { isAddress, formatUnits } from "viem";
import { CONTRACTS, REVENUE_SPLITTER_ABI } from "@/lib/contracts";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Clock,
  FileText,
  ExternalLink,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Modal } from "@/components/ui/Modal";

interface PendingDeposit {
  id: string;
  property_id: number;
  property_name: string;
  ward_boy_address: string;
  deposit_month: string;
  gross_rent: string;
  total_miscellaneous: string;
  net_amount: string;
  notes: string;
  bills_metadata: any;
  created_at: string;
  status?: string;
  deposit_tx_hash?: string;
  payout_tx_hash?: string;
  approved_by?: string;
  approved_at?: string;
}

function AdminRevenueContent() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [approvedDeposits, setApprovedDeposits] = useState<PendingDeposit[]>(
    []
  );
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(
    null
  );
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [currentProcessingDeposit, setCurrentProcessingDeposit] =
    useState<PendingDeposit | null>(null);
  const [progressStatus, setProgressStatus] = useState<{
    submittingTransaction: "pending" | "processing" | "completed" | "error";
    confirmingTransaction: "pending" | "processing" | "completed" | "error";
    updatingDatabase: "pending" | "processing" | "completed" | "error";
  }>({
    submittingTransaction: "pending",
    confirmingTransaction: "pending",
    updatingDatabase: "pending",
  });

  const { writeContract, data: txHash, error: writeError } = useWriteContract();
  const {
    isLoading: isTxPending,
    isSuccess: isTxSuccess,
    isError: isTxError,
    error: txError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle transaction success
  useEffect(() => {
    const handleTransactionSuccess = async () => {
      if (isTxSuccess && txHash && processingDepositId) {
        // Update progress: transaction confirmed, now updating database
        setProgressStatus((prev) => ({
          ...prev,
          confirmingTransaction: "completed",
          updatingDatabase: "processing",
        }));

        // Update database after successful transaction
        // Find the deposit to get property_id for bulk update
        const depositToUpdate = pendingDeposits.find(
          (d) => d.id === processingDepositId
        );
        await updateDepositStatus(
          processingDepositId,
          txHash,
          depositToUpdate?.property_id
        );

        // Mark database update as completed
        setProgressStatus((prev) => ({
          ...prev,
          updatingDatabase: "completed",
        }));

        setSuccess("Distribution successful! Deposit approved.");

        // Wait a bit for database to sync, then refresh both lists
        // This ensures the database update is committed before fetching
        setTimeout(async () => {
          console.log("Refreshing deposits lists after approval...");
          await fetchPendingDeposits(); // Refresh pending list
          await fetchApprovedDeposits(); // Refresh approved list
          console.log("Deposits lists refreshed");
        }, 1000); // Delay to ensure DB update is committed and visible

        // Close dialog after showing success
        setTimeout(() => {
          setShowProgressDialog(false);
          setProcessingDepositId(null);
          setCurrentProcessingDeposit(null);
          setProgressStatus({
            submittingTransaction: "pending",
            confirmingTransaction: "pending",
            updatingDatabase: "pending",
          });
          // Final refresh after dialog closes to ensure data is up to date
          setTimeout(() => {
            fetchPendingDeposits();
            fetchApprovedDeposits();
          }, 300);
        }, 2000);

        setTimeout(() => setSuccess(""), 5000);
      }
    };

    handleTransactionSuccess();
  }, [isTxSuccess, txHash, processingDepositId, pendingDeposits]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || "Transaction failed";
      // Handle common errors
      let displayError = "Transaction failed";
      if (errorMessage.includes("user rejected")) {
        displayError = "Transaction rejected by user";
      } else if (errorMessage.includes("insufficient funds")) {
        displayError = "Insufficient funds for gas";
      } else {
        displayError = errorMessage;
      }

      setError(displayError);
      setProgressStatus((prev) => ({
        ...prev,
        submittingTransaction: "error",
      }));
      setShowProgressDialog(false);
      setProcessingDepositId(null);
      setCurrentProcessingDeposit(null);
      setTimeout(() => setError(""), 5000);
    }
  }, [writeError]);

  // Handle transaction errors
  useEffect(() => {
    if (isTxError && txHash) {
      console.error("Transaction failed:", txError);
      setError("Transaction failed on blockchain. Please try again.");
      setProgressStatus((prev) => ({
        ...prev,
        confirmingTransaction: "error",
      }));
      setShowProgressDialog(false);
      setProcessingDepositId(null);
      setCurrentProcessingDeposit(null);
      setTimeout(() => setError(""), 5000);
    }
  }, [isTxError, txError, txHash]);

  // Fetch pending deposits
  useEffect(() => {
    if (isConnected) {
      fetchPendingDeposits();
      fetchApprovedDeposits();
    }
  }, [isConnected]);

  const fetchPendingDeposits = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        setPendingDeposits([]);
        return;
      }

      const { data, error } = await supabase
        .from("rent_deposits")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingDeposits(data || []);
    } catch (err: any) {
      console.error("Error fetching deposits:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedDeposits = async () => {
    try {
      if (!supabase) {
        setApprovedDeposits([]);
        return;
      }

      const { data, error } = await supabase
        .from("rent_deposits")
        .select("*")
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(20); // Last 20 approved deposits

      if (error) {
        console.error("Error fetching approved deposits:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} approved deposits`);
      setApprovedDeposits(data || []);
    } catch (err: any) {
      console.error("Error fetching approved deposits:", err);
      // Don't set empty array on error, keep existing data
    }
  };

  const updateDepositStatus = async (
    depositId: string,
    txHash: `0x${string}`,
    propertyId?: number
  ) => {
    if (!supabase) return;

    try {
      const updateData = {
        status: "approved",
        approved_by: address?.toLowerCase() || null,
        approved_at: new Date().toISOString(),
        payout_tx_hash: txHash as string,
      };

      // If propertyId is provided, update ALL pending deposits for this property
      // This handles the case where multiple deposits exist for the same property
      if (propertyId) {
        const { error } = await supabase
          .from("rent_deposits")
          // @ts-ignore - rent_deposits table not in generated types yet
          .update(updateData)
          .eq("property_id", propertyId)
          .eq("status", "pending");

        if (error) {
          console.error("Database update error:", error);
        }
      } else {
        // Fallback: update single deposit
        const { error } = await supabase
          .from("rent_deposits")
          // @ts-ignore - rent_deposits table not in generated types yet
          .update(updateData)
          .eq("id", depositId);

        if (error) {
          console.error("Database update error:", error);
        }
      }
    } catch (err) {
      console.error("Error updating deposit status:", err);
    }
  };

  const handleCallOutPay = async (deposit: PendingDeposit) => {
    try {
      setError("");
      setSuccess("");

      // Check if there's actually pending distribution on the contract
      // This prevents errors when multiple deposits exist but pending was already processed
      if (publicClient) {
        try {
          const pendingAmount = await publicClient.readContract({
            address: CONTRACTS.RevenueSplitter,
            abi: REVENUE_SPLITTER_ABI,
            functionName: "getPendingDistribution",
            args: [BigInt(deposit.property_id)],
          });

          if (!pendingAmount || pendingAmount === BigInt(0)) {
            setError(
              `No pending distribution found for Property #${deposit.property_id}. This deposit may have already been processed by another deposit, or the ward boy hasn't deposited yet. Please refresh the list.`
            );
            // Refresh the list to sync with blockchain state
            fetchPendingDeposits();
            return;
          }
        } catch (readError) {
          console.error("Error checking pending distribution:", readError);
          // Continue anyway, let the transaction fail if needed
        }
      }

      setProcessingDepositId(deposit.id);
      setCurrentProcessingDeposit(deposit);
      setShowProgressDialog(true);

      // Reset progress status
      setProgressStatus({
        submittingTransaction: "processing",
        confirmingTransaction: "pending",
        updatingDatabase: "pending",
      });

      // Call contract with explicit gas limit
      // Database will be updated in useEffect after transaction success
      writeContract({
        address: CONTRACTS.RevenueSplitter,
        abi: REVENUE_SPLITTER_ABI,
        functionName: "callOutPay",
        args: [BigInt(deposit.property_id)],
        gas: 500000n, // Explicit gas limit for distribution
      });

      // Update progress when transaction is submitted
      setProgressStatus((prev) => ({
        ...prev,
        submittingTransaction: "completed",
        confirmingTransaction: "processing",
      }));
    } catch (err: any) {
      setError(err.message || "Failed to trigger payout");
      setProcessingDepositId(null);
      setCurrentProcessingDeposit(null);
      setProgressStatus((prev) => ({
        ...prev,
        submittingTransaction: "error",
      }));
      setShowProgressDialog(false);
    }
  };

  const formatUSDC = (amount: string) => {
    return (parseInt(amount) / 1e6).toFixed(2);
  };

  // Group deposits by property_id
  const groupedDeposits = React.useMemo(() => {
    const groups: Record<number, PendingDeposit[]> = {};
    pendingDeposits.forEach((deposit) => {
      if (!groups[deposit.property_id]) {
        groups[deposit.property_id] = [];
      }
      groups[deposit.property_id].push(deposit);
    });
    return groups;
  }, [pendingDeposits]);

  // Calculate total net amount for a property
  const getTotalNetAmount = (deposits: PendingDeposit[]) => {
    return deposits.reduce(
      (sum, d) => sum + parseFloat(formatUSDC(d.net_amount)),
      0
    );
  };

  const getStatusIcon = (
    status: "pending" | "processing" | "completed" | "error"
  ) => {
    switch (status) {
      case "pending":
        return (
          <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
        );
      case "processing":
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case "error":
        return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  const getStatusText = (
    status: "pending" | "processing" | "completed" | "error"
  ) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Access Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please connect your wallet to access admin features
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 bg-gradient-to-r from-primary-50 via-white to-web3-50 rounded-2xl shadow-card p-8 border-2 border-primary-200">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-web3-600 bg-clip-text text-transparent mb-2">
          Revenue Management
        </h1>
        <p className="text-gray-700 font-medium">
          Approve rent deposits and manage revenue distributions
        </p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 rounded-2xl shadow-card p-6 border-2 border-yellow-200">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                Pending Deposits
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {pendingDeposits.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl shadow-card p-6 border-2 border-green-200">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                Approved This Month
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {approvedDeposits.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary-50 via-white to-web3-50 rounded-2xl shadow-card p-6 border-2 border-primary-200">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-primary-500 to-web3-500 rounded-2xl shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900">
                $
                {approvedDeposits
                  .reduce(
                    (sum, d) => sum + parseFloat(formatUSDC(d.net_amount)),
                    0
                  )
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm text-red-800 font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-sm text-green-800 font-semibold">{success}</p>
        </div>
      )}

      {/* Progress Dialog */}
      <Modal
        isOpen={showProgressDialog}
        onClose={() => {
          // Only allow closing if all steps are completed or there's an error
          const allCompleted =
            progressStatus.submittingTransaction === "completed" &&
            progressStatus.confirmingTransaction === "completed" &&
            progressStatus.updatingDatabase === "completed";
          const hasError =
            progressStatus.submittingTransaction === "error" ||
            progressStatus.confirmingTransaction === "error" ||
            progressStatus.updatingDatabase === "error";

          if (allCompleted || hasError) {
            setShowProgressDialog(false);
          }
        }}
        title="Processing Payout Distribution"
        description="Please wait while we process the revenue distribution"
        size="md"
        showCloseButton={
          progressStatus.updatingDatabase === "completed" ||
          progressStatus.submittingTransaction === "error" ||
          progressStatus.confirmingTransaction === "error" ||
          progressStatus.updatingDatabase === "error"
        }
      >
        <div className="space-y-4">
          {/* Enhanced Deposit Summary */}
          {currentProcessingDeposit &&
            (() => {
              const allPropertyDeposits = pendingDeposits.filter(
                (d) =>
                  d.property_id === currentProcessingDeposit.property_id &&
                  d.status === "pending"
              );

              // Safety check: if no deposits found, use current deposit
              const depositsToShow =
                allPropertyDeposits.length > 0
                  ? allPropertyDeposits
                  : [currentProcessingDeposit];

              const totalNetAmount = depositsToShow.reduce(
                (sum, d) => sum + parseFloat(formatUSDC(d.net_amount)),
                0
              );
              const isMultiple = depositsToShow.length > 1;

              return (
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 mb-6 shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {currentProcessingDeposit.property_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="font-semibold">
                          Property #{currentProcessingDeposit.property_id}
                        </span>
                        {isMultiple && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-bold">
                            {depositsToShow.length} Deposits
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ${totalNetAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">USDC</p>
                    </div>
                  </div>

                  {/* Individual Deposits List */}
                  {isMultiple ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                        Individual Deposits
                      </p>
                      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                        {depositsToShow.map((deposit, idx) => (
                          <div
                            key={deposit.id}
                            className="p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {deposit.deposit_month}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {new Date(
                                    deposit.created_at
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">
                                  ${formatUSDC(deposit.net_amount)}
                                </p>
                                {deposit.deposit_tx_hash && (
                                  <a
                                    href={`https://sepolia.arbiscan.io/tx/${deposit.deposit_tx_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end mt-1"
                                  >
                                    View TX <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    depositsToShow[0] && (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {depositsToShow[0].deposit_month}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                depositsToShow[0].created_at
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              ${formatUSDC(depositsToShow[0].net_amount)}
                            </p>
                            {depositsToShow[0].deposit_tx_hash && (
                              <a
                                href={`https://sepolia.arbiscan.io/tx/${depositsToShow[0].deposit_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 justify-end mt-1"
                              >
                                View TX <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Info Banner */}
                  {isMultiple && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-yellow-900 mb-1">
                            Processing Multiple Deposits
                          </p>
                          <p className="text-xs text-yellow-800">
                            All {depositsToShow.length} deposits for this
                            property will be processed together in a single
                            transaction. Total amount:{" "}
                            <strong>${totalNetAmount.toFixed(2)} USDC</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Step 1: Submitting Transaction */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.submittingTransaction)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Submitting Transaction
              </h3>
              <p className="text-sm text-gray-600">
                {progressStatus.submittingTransaction === "processing" &&
                  "Sending transaction to blockchain..."}
                {progressStatus.submittingTransaction === "completed" &&
                  "Transaction submitted successfully"}
                {progressStatus.submittingTransaction === "pending" &&
                  "Waiting to start..."}
                {progressStatus.submittingTransaction === "error" &&
                  "Transaction submission failed"}
              </p>
            </div>
          </div>

          {/* Step 2: Confirming Transaction */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.confirmingTransaction)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Confirming Transaction
              </h3>
              <p className="text-sm text-gray-600">
                {progressStatus.confirmingTransaction === "processing" &&
                  "Waiting for blockchain confirmation..."}
                {progressStatus.confirmingTransaction === "completed" &&
                  "Transaction confirmed"}
                {progressStatus.confirmingTransaction === "pending" &&
                  "Waiting for transaction..."}
                {progressStatus.confirmingTransaction === "error" &&
                  "Transaction confirmation failed"}
              </p>
              {txHash &&
                progressStatus.confirmingTransaction === "processing" && (
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                  >
                    View on Arbiscan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
            </div>
          </div>

          {/* Step 3: Updating Database */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {getStatusIcon(progressStatus.updatingDatabase)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Updating Database</h3>
              <p className="text-sm text-gray-600">
                {progressStatus.updatingDatabase === "processing" &&
                  "Updating deposit status..."}
                {progressStatus.updatingDatabase === "completed" &&
                  "Database updated successfully"}
                {progressStatus.updatingDatabase === "pending" &&
                  "Waiting for transaction confirmation..."}
                {progressStatus.updatingDatabase === "error" &&
                  "Database update failed"}
              </p>
            </div>
          </div>

          {/* Success Message */}
          {progressStatus.updatingDatabase === "completed" && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-semibold text-green-800">
                  Payout distribution successful! Revenue has been distributed
                  to shareholders.
                </p>
              </div>
            </div>
          )}

          {/* Distribution Breakdown */}
          {currentProcessingDeposit &&
            progressStatus.updatingDatabase === "completed" &&
            (() => {
              // Calculate total for all deposits of this property
              const allPropertyDeposits = pendingDeposits.filter(
                (d) => d.property_id === currentProcessingDeposit.property_id
              );
              const totalNetAmount = allPropertyDeposits.reduce(
                (sum, d) => sum + parseFloat(formatUSDC(d.net_amount)),
                0
              );
              const platformFee = totalNetAmount * 0.03;
              const shareholderAmount = totalNetAmount - platformFee;

              return (
                <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <h4 className="font-bold text-gray-900 mb-3">
                    Distribution Summary
                    {allPropertyDeposits.length > 1 && (
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({allPropertyDeposits.length} deposits combined)
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">
                        {allPropertyDeposits.length > 1
                          ? "Total Net Amount:"
                          : "Net Amount:"}
                      </span>
                      <span className="font-bold text-gray-900">
                        ${totalNetAmount.toFixed(2)}
                      </span>
                    </div>
                    {allPropertyDeposits.length > 1 && (
                      <div className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200">
                        {allPropertyDeposits.map((d, idx) => (
                          <div key={d.id} className="flex justify-between">
                            <span>Deposit {idx + 1}:</span>
                            <span>${formatUSDC(d.net_amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-700">Platform Fee (3%):</span>
                      <span className="font-bold text-red-600">
                        -${platformFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t-2 border-green-300 pt-2 flex justify-between">
                      <span className="font-bold text-gray-900">
                        For Shareholders:
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        ${shareholderAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Distributions Section */}
        <div className="bg-gradient-to-br from-yellow-50 via-white to-orange-50 rounded-2xl shadow-card p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Pending Distributions
                </h2>
                <p className="text-sm text-gray-600">
                  {Object.keys(groupedDeposits).length} properties,{" "}
                  {pendingDeposits.length} deposits awaiting approval
                </p>
              </div>
            </div>
            <button
              onClick={fetchPendingDeposits}
              className="px-4 py-2 text-sm bg-white border-2 border-yellow-200 text-yellow-700 rounded-xl hover:bg-yellow-50 transition-colors font-semibold"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border-2 border-gray-200">
              <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mb-4" />
              <p className="text-gray-600 font-semibold">Loading deposits...</p>
            </div>
          ) : pendingDeposits.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
              <div className="p-4 bg-yellow-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <p className="text-gray-900 font-bold text-lg mb-2">
                No Pending Distributions
              </p>
              <p className="text-gray-600">All deposits have been processed</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {Object.entries(groupedDeposits).map(([propertyId, deposits]) => {
                const propertyIdNum = parseInt(propertyId);
                const totalNetAmount = getTotalNetAmount(deposits);
                const firstDeposit = deposits[0]; // Use first deposit for property info
                const isProcessing = deposits.some(
                  (d) => processingDepositId === d.id
                );

                return (
                  <PropertyDepositGroup
                    key={propertyId}
                    propertyId={propertyIdNum}
                    deposits={deposits}
                    totalNetAmount={totalNetAmount}
                    isConnected={isConnected}
                    isTxPending={isTxPending}
                    showProgressDialog={showProgressDialog}
                    processingDepositId={processingDepositId}
                    isProcessing={isProcessing}
                    onCallOutPay={handleCallOutPay}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Approved Deposits History */}
        <div className="bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-2xl shadow-card p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Approved History
                </h2>
                <p className="text-sm text-gray-600">
                  {approvedDeposits.length} completed distributions
                </p>
              </div>
            </div>
            <button
              onClick={fetchApprovedDeposits}
              className="px-4 py-2 text-sm bg-white border-2 border-green-200 text-green-600 rounded-xl hover:bg-green-50 transition-colors font-semibold"
            >
              Refresh
            </button>
          </div>

          {approvedDeposits.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-semibold">
                No approved deposits yet
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <div className="space-y-3">
                {approvedDeposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="bg-white border-2 border-green-200 rounded-xl p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-900">
                            {deposit.property_name}
                          </h4>
                          <span className="px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-400 text-white text-xs font-bold rounded-lg shadow-sm">
                            ✓ Approved
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Property #{deposit.property_id} |{" "}
                          {deposit.deposit_month}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                            <span className="text-gray-700 font-semibold">
                              Net Amount:
                            </span>
                            <span className="font-bold text-green-600 text-lg">
                              ${formatUSDC(deposit.net_amount)} USDC
                            </span>
                          </div>
                          {deposit.approved_at && (
                            <div className="flex justify-between p-2 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Approved:</span>
                              <span className="text-gray-900 font-medium">
                                {new Date(deposit.approved_at).toLocaleString()}
                              </span>
                            </div>
                          )}
                          {deposit.payout_tx_hash && (
                            <div className="flex justify-between p-2 bg-blue-50 rounded-lg">
                              <span className="text-gray-600">
                                Transaction:
                              </span>
                              <a
                                href={`https://sepolia.arbiscan.io/tx/${deposit.payout_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold hover:underline"
                              >
                                {deposit.payout_tx_hash.slice(0, 10)}...
                                {deposit.payout_tx_hash.slice(-8)}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper function for formatting USDC
const formatUSDC = (amount: string) => {
  return (parseInt(amount) / 1e6).toFixed(2);
};

// Component for grouped deposits by property
interface PropertyDepositGroupProps {
  propertyId: number;
  deposits: PendingDeposit[];
  totalNetAmount: number;
  isConnected: boolean;
  isTxPending: boolean;
  showProgressDialog: boolean;
  processingDepositId: string | null;
  isProcessing: boolean;
  onCallOutPay: (deposit: PendingDeposit) => void;
}

function PropertyDepositGroup({
  propertyId,
  deposits,
  totalNetAmount,
  isConnected,
  isTxPending,
  showProgressDialog,
  processingDepositId,
  isProcessing,
  onCallOutPay,
}: PropertyDepositGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const firstDeposit = deposits[0];

  // Read pending distribution from contract for this property
  const {
    data: contractPendingAmount,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "getPendingDistribution",
    args: [BigInt(propertyId)],
    query: {
      enabled: !!isConnected,
      refetchInterval: 15000, // Refetch every 15 seconds
    },
  });

  const handleRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      await refetchStatus();
    } catch (error) {
      console.error("Error refreshing status:", error);
    } finally {
      setTimeout(() => setIsRefreshingStatus(false), 1000);
    }
  };

  const hasPendingDistribution =
    contractPendingAmount && contractPendingAmount > BigInt(0);
  const pendingAmountUSDC = contractPendingAmount
    ? parseFloat(formatUnits(contractPendingAmount, 6))
    : 0;
  const platformFee = totalNetAmount * 0.03;
  const shareholderAmount = totalNetAmount - platformFee;

  // Calculate difference between database total and contract pending
  const dbTotalUSDC = totalNetAmount;
  const contractTotalUSDC = pendingAmountUSDC;
  const amountDifference = Math.abs(dbTotalUSDC - contractTotalUSDC);
  const hasMismatch = amountDifference > 0.01; // More than 1 cent difference

  return (
    <div className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:shadow-lg transition-all">
      {/* Header with Property Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">
              {firstDeposit.property_name}
            </h3>
            <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-xl shadow-md">
              Property #{propertyId}
            </span>
            {deposits.length > 1 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                {deposits.length} Deposits
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 font-mono">
            <span className="font-semibold">Ward Boy:</span>{" "}
            {firstDeposit.ward_boy_address.slice(0, 6)}...
            {firstDeposit.ward_boy_address.slice(-4)}
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              Total Pending Amount
            </p>
            <p className="text-2xl font-bold text-blue-600">
              ${totalNetAmount.toFixed(2)} USDC
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">After Distribution:</p>
            <p className="text-lg font-bold text-green-600">
              ${shareholderAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              (Platform Fee: ${platformFee.toFixed(2)})
            </p>
          </div>
        </div>

        {/* Contract Status Checker - Enhanced */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Blockchain Status Check
            </span>
            <button
              onClick={handleRefreshStatus}
              disabled={isRefreshingStatus || isLoadingStatus}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
            >
              {isRefreshingStatus || isLoadingStatus ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Refresh
                </>
              )}
            </button>
          </div>

          {/* Status Card */}
          <div
            className={`p-4 rounded-lg border-2 ${
              isLoadingStatus
                ? "bg-gray-50 border-gray-300"
                : hasPendingDistribution
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {isLoadingStatus ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                <span className="text-sm text-gray-700">
                  Checking contract status...
                </span>
              </div>
            ) : isStatusError ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    Error Reading Contract
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Could not fetch status from blockchain. Please check your
                    connection.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Contract Pending Amount */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {hasPendingDistribution ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="text-sm font-semibold text-gray-700">
                      Contract Pending Amount:
                    </span>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      hasPendingDistribution ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {hasPendingDistribution
                      ? `$${pendingAmountUSDC.toFixed(2)} USDC`
                      : "$0.00"}
                  </span>
                </div>

                {/* Database vs Contract Comparison */}
                <div className="border-t-2 border-gray-200 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Database Total:</span>
                    <span className="font-semibold text-gray-900">
                      ${dbTotalUSDC.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Contract Pending:</span>
                    <span className="font-semibold text-gray-900">
                      ${contractTotalUSDC.toFixed(2)} USDC
                    </span>
                  </div>
                  {hasMismatch && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-yellow-800">
                            Amount Mismatch Detected
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Difference: ${amountDifference.toFixed(2)} USDC.
                            This may indicate:
                          </p>
                          <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-0.5">
                            <li>
                              Some deposits haven't been sent to contract yet
                            </li>
                            <li>
                              Contract has already processed some deposits
                            </li>
                            <li>Network delay in syncing</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Messages */}
                {!hasPendingDistribution && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-red-800">
                          No Pending Distribution on Contract
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          All deposits for Property #{propertyId} have already
                          been processed and distributed. These database records
                          may need to be updated.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {hasPendingDistribution && !hasMismatch && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-semibold text-green-800">
                        ✓ Status Verified: Database and contract amounts match
                      </p>
                    </div>
                  </div>
                )}

                {hasPendingDistribution && hasMismatch && (
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800">
                          Partial Match
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Contract has ${contractTotalUSDC.toFixed(2)} pending,
                          but database shows ${dbTotalUSDC.toFixed(2)}. Only the
                          contract amount will be processed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Deposits List */}
      {deposits.length > 1 && (
        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-between transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">
              {isExpanded ? "Hide" : "Show"} Individual Deposits (
              {deposits.length})
            </span>
            <span
              className={`transform transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {isExpanded && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {deposits.map((deposit, index) => (
                <div
                  key={deposit.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Deposit #{index + 1} - {deposit.deposit_month}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        ${formatUSDC(deposit.net_amount)}
                      </p>
                      {deposit.deposit_tx_hash && (
                        <a
                          href={`https://sepolia.arbiscan.io/tx/${deposit.deposit_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View TX
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single Deposit Info (if only one) */}
      {deposits.length === 1 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-gray-900">
                {deposits[0].deposit_month}
              </p>
              <p className="text-xs text-gray-600">
                {new Date(deposits[0].created_at).toLocaleDateString()}
              </p>
            </div>
            {deposits[0].deposit_tx_hash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${deposits[0].deposit_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View Deposit TX
              </a>
            )}
          </div>
        </div>
      )}

      {/* Warning Message for Multiple Deposits */}
      {deposits.length > 1 && (
        <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-800">
              <p className="font-semibold mb-1">
                ⚠️ Multiple Deposits Detected
              </p>
              <p>
                This property has {deposits.length} pending deposits. Clicking
                "Call Out Pay" will process
                <strong> ALL {deposits.length} deposits</strong> for Property #
                {propertyId} at once. Total amount:{" "}
                <strong>${totalNetAmount.toFixed(2)} USDC</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Single Call Out Pay Button */}
      <button
        onClick={() => onCallOutPay(firstDeposit)}
        disabled={
          isTxPending ||
          showProgressDialog ||
          isProcessing ||
          !hasPendingDistribution ||
          isLoadingStatus ||
          isStatusError
        }
        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center justify-center gap-2 font-bold"
      >
        {isTxPending || (isProcessing && showProgressDialog) ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Call Out Pay & Distribute{" "}
            {deposits.length > 1 && `(${deposits.length} deposits)`}
          </>
        )}
      </button>
    </div>
  );
}

// Separate component for pending deposit card to use hooks properly
interface PendingDepositCardProps {
  deposit: PendingDeposit;
  isConnected: boolean;
  isTxPending: boolean;
  showProgressDialog: boolean;
  processingDepositId: string | null;
  onCallOutPay: (deposit: PendingDeposit) => void;
}

function PendingDepositCard({
  deposit,
  isConnected,
  isTxPending,
  showProgressDialog,
  processingDepositId,
  onCallOutPay,
}: PendingDepositCardProps) {
  // Read pending distribution from contract for this property
  const { data: contractPendingAmount } = useReadContract({
    address: CONTRACTS.RevenueSplitter,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "getPendingDistribution",
    args: [BigInt(deposit.property_id)],
    query: {
      enabled: !!isConnected,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  });

  const netAmount = parseFloat(formatUSDC(deposit.net_amount));
  const platformFee = netAmount * 0.03;
  const shareholderAmount = netAmount - platformFee;

  const hasPendingDistribution =
    contractPendingAmount && contractPendingAmount > BigInt(0);
  const pendingAmountUSDC = contractPendingAmount
    ? parseFloat(formatUnits(contractPendingAmount, 6))
    : 0;

  return (
    <div className="bg-white border-2 border-yellow-200 rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {deposit.property_name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-semibold">Property ID:</span>{" "}
            {deposit.property_id} | {deposit.deposit_month}
          </p>
          <p className="text-sm text-gray-600 font-mono mt-1">
            <span className="font-semibold">Ward Boy:</span>{" "}
            {deposit.ward_boy_address.slice(0, 6)}...
            {deposit.ward_boy_address.slice(-4)}
          </p>
        </div>
        <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold rounded-xl shadow-md">
          Pending
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-blue-200 rounded-lg">
              <FileText className="w-4 h-4 text-blue-700" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">
              Financial Breakdown
            </h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Gross Rent:</span>
              <span className="font-bold text-gray-900">
                ${formatUSDC(deposit.gross_rent)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Misc. Fees:</span>
              <span className="font-bold text-red-600">
                -${formatUSDC(deposit.total_miscellaneous)}
              </span>
            </div>
            <div className="border-t-2 border-blue-300 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">Net Amount:</span>
              <span className="font-bold text-blue-600 text-lg">
                ${netAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-200 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-700" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">After Approval</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Platform Fee (3%):</span>
              <span className="font-bold text-gray-900">
                -${platformFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t-2 border-green-300 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">For Shareholders:</span>
              <span className="font-bold text-green-600 text-lg">
                ${shareholderAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {deposit.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="font-bold text-gray-700">Notes: </span>
          <span className="text-gray-600">{deposit.notes}</span>
        </div>
      )}

      {deposit.bills_metadata && deposit.bills_metadata.length > 0 && (
        <div className="mb-4 p-2 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700 font-semibold">
            📎 {deposit.bills_metadata.length} bill(s) attached
          </p>
        </div>
      )}

      {/* Contract Pending Distribution Status */}
      <div
        className={`mb-4 p-3 rounded-lg border-2 ${
          hasPendingDistribution
            ? "bg-blue-50 border-blue-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasPendingDistribution ? (
              <CheckCircle className="w-5 h-5 text-blue-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-semibold text-gray-700">
              Contract Pending Distribution:
            </span>
          </div>
          <span
            className={`text-sm font-bold ${
              hasPendingDistribution ? "text-blue-600" : "text-red-600"
            }`}
          >
            {hasPendingDistribution
              ? `$${pendingAmountUSDC.toFixed(2)} USDC`
              : "$0.00 (Already Processed)"}
          </span>
        </div>
        {!hasPendingDistribution && (
          <p className="text-xs text-red-600 mt-2">
            ⚠️ This deposit may have already been processed by another deposit
            for the same property. The contract has no pending distribution for
            Property #{deposit.property_id}.
          </p>
        )}
      </div>

      <button
        onClick={() => onCallOutPay(deposit)}
        disabled={
          isTxPending ||
          showProgressDialog ||
          processingDepositId === deposit.id ||
          !hasPendingDistribution
        }
        className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:shadow-lg disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center justify-center gap-2 font-bold"
      >
        {isTxPending ||
        (processingDepositId === deposit.id && showProgressDialog) ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Call Out Pay & Distribute
          </>
        )}
      </button>
    </div>
  );
}

export default function AdminRevenuePage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]} redirectTo="/dashboard">
      <AdminRevenueContent />
    </ProtectedRoute>
  );
}
