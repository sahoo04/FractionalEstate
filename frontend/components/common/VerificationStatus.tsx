"use client";

import { SBTBadge } from "./SBTBadge";

interface VerificationStatusProps {
  wallet: string;
  kycStatus: string;
  sbtTokenId?: number | null;
  className?: string;
}

export function VerificationStatus({
  wallet,
  kycStatus,
  sbtTokenId,
  className = "",
}: VerificationStatusProps) {
  const isVerified = kycStatus === "APPROVED" && sbtTokenId;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isVerified
              ? "bg-green-500"
              : kycStatus === "PENDING"
              ? "bg-yellow-500"
              : kycStatus === "REJECTED"
              ? "bg-red-500"
              : "bg-gray-400"
          }`}
        />
        <span className="text-sm font-medium text-gray-700">
          KYC Status: {kycStatus}
        </span>
      </div>

      {isVerified && (
        <SBTBadge wallet={wallet} tokenId={sbtTokenId} verified={true} />
      )}
    </div>
  );
}
