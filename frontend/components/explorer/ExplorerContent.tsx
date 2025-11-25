"use client";

import { useState, useEffect } from "react";
import { ProofCard } from "./ProofCard";
import { SBTCard } from "./SBTCard";
import { logger } from "@/lib/logger";

interface ExplorerData {
  verified: boolean;
  wallet: string;
  proof?: {
    hash: string;
    txHash: string | null;
    provider: string;
    verifiedAt: string | null;
    onChain: {
      proofHash: string;
      timestamp: number;
      provider: string;
      submittedBy: string;
    } | null;
  };
  sbt?: {
    tokenId: number | null;
    metadataCID: string | null;
    onChain: {
      tokenId: number;
      owner: string;
      metadataURI: string;
    } | null;
  };
  user?: {
    name: string;
    email: string;
    role: string;
  };
  message?: string;
}

interface ExplorerContentProps {
  wallet: string;
}

export function ExplorerContent({ wallet }: ExplorerContentProps) {
  const [data, setData] = useState<ExplorerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/explorer/${wallet}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch explorer data");
        }

        setData(result);
        logger.info("Explorer data loaded", {
          wallet,
          verified: result.verified,
        });
      } catch (err) {
        logger.error("Error fetching explorer data", err);
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (wallet) {
      fetchData();
    }
  }, [wallet]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading verification data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-500 text-xl mb-4">❌</div>
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.verified) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold mb-2">Not Verified</h1>
            <p className="text-gray-600 mb-4">
              {data?.message ||
                "This wallet has not been verified with ZK-KYC and SBT."}
            </p>
            <p className="text-sm text-gray-500">
              Wallet:{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">{wallet}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">ZK Proof Explorer</h1>
          <p className="text-gray-600">
            View zero-knowledge proof and Soulbound Token verification
          </p>
        </div>

        {/* Wallet Address */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Wallet Address</p>
              <p className="text-lg font-mono">{data.wallet}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.wallet);
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* User Info */}
        {data.user && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">User Information</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{data.user.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{data.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium">{data.user.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* Proof Card */}
        {data.proof && <ProofCard proof={data.proof} wallet={data.wallet} />}

        {/* SBT Card */}
        {data.sbt && <SBTCard sbt={data.sbt} wallet={data.wallet} />}
      </div>
    </div>
  );
}
