"use client";

import Link from "next/link";

interface SBTBadgeProps {
  wallet: string;
  tokenId?: number | null;
  verified?: boolean;
  showLink?: boolean;
  className?: string;
}

export function SBTBadge({
  wallet,
  tokenId,
  verified = true,
  showLink = true,
  className = "",
}: SBTBadgeProps) {
  if (!verified) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
        <span>🪙</span>
        <span>ZK-KYC Verified</span>
        {tokenId && <span className="text-xs opacity-75">#{tokenId}</span>}
        <span className="text-xs opacity-75">SBT</span>
      </div>
      {showLink && (
        <Link
          href={`/explorer/${wallet}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
        >
          View Proof
        </Link>
      )}
    </div>
  );
}
