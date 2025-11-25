"use client";

interface ProofCardProps {
  proof: {
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
  wallet: string;
}

export function ProofCard({ proof, wallet }: ProofCardProps) {
  const arbiscanUrl = "https://sepolia.arbiscan.io";
  const networkName = "Arbitrum Sepolia";

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Zero-Knowledge Proof</h2>
          <p className="text-gray-600">
            Cryptographic proof of KYC verification stored on-chain
          </p>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
          ✓ Verified
        </div>
      </div>

      <div className="space-y-4">
        {/* Proof Hash */}
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">
            Proof Hash
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
              {proof.hash}
            </code>
            <button
              onClick={() => copyToClipboard(proof.hash)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            SHA256 hash of verification data (PII remains private)
          </p>
        </div>

        {/* Provider */}
        <div>
          <label className="text-sm font-medium text-gray-500 mb-1 block">
            Verification Provider
          </label>
          <p className="text-lg font-medium">{proof.provider}</p>
        </div>

        {/* Verification Timestamp */}
        {proof.verifiedAt && (
          <div>
            <label className="text-sm font-medium text-gray-500 mb-1 block">
              Verified At
            </label>
            <p className="text-lg">
              {new Date(proof.verifiedAt).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              {formatRelativeTime(proof.verifiedAt)}
            </p>
          </div>
        )}

        {/* Transaction Hash */}
        {proof.txHash && (
          <div>
            <label className="text-sm font-medium text-gray-500 mb-1 block">
              Transaction Hash
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
                {proof.txHash}
              </code>
              <a
                href={`${arbiscanUrl}/tx/${proof.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                View on Arbiscan
              </a>
            </div>
          </div>
        )}

        {/* On-Chain Status */}
        {proof.onChain && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                On-Chain Verified
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Proof verified on {networkName} at{" "}
              {formatTimestamp(proof.onChain.timestamp)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Submitted by: {proof.onChain.submittedBy}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
