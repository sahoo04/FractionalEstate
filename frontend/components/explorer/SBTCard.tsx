"use client";

interface SBTCardProps {
  sbt: {
    tokenId: number | null;
    metadataCID: string | null;
    onChain: {
      tokenId: number;
      owner: string;
      metadataURI: string;
    } | null;
  };
  wallet: string;
}

export function SBTCard({ sbt, wallet }: SBTCardProps) {
  const arbiscanUrl = "https://sepolia.arbiscan.io";
  const networkName = "Arbitrum Sepolia";

  const getMetadataUrl = () => {
    if (sbt.onChain?.metadataURI) {
      return sbt.onChain.metadataURI.replace(
        "ipfs://",
        "https://gateway.pinata.cloud/ipfs/"
      );
    }
    if (sbt.metadataCID) {
      return `https://gateway.pinata.cloud/ipfs/${sbt.metadataCID}`;
    }
    return null;
  };

  const metadataUrl = getMetadataUrl();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Soulbound Token (SBT)</h2>
          <p className="text-gray-600">
            Non-transferable identity token representing verified status
          </p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
          🪙 SBT
        </div>
      </div>

      <div className="space-y-4">
        {/* Token ID */}
        {(sbt.tokenId || sbt.onChain?.tokenId) && (
          <div>
            <label className="text-sm font-medium text-gray-500 mb-1 block">
              Token ID
            </label>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                #{sbt.onChain?.tokenId || sbt.tokenId}
              </p>
              <a
                href={`${arbiscanUrl}/token/${
                  process.env.NEXT_PUBLIC_IDENTITY_SBT_ADDRESS
                }?a=${sbt.onChain?.tokenId || sbt.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                View on Arbiscan
              </a>
            </div>
          </div>
        )}

        {/* Metadata CID */}
        {sbt.metadataCID && (
          <div>
            <label className="text-sm font-medium text-gray-500 mb-1 block">
              Metadata IPFS CID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
                {sbt.metadataCID}
              </code>
              {metadataUrl && (
                <a
                  href={metadataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  View Metadata
                </a>
              )}
            </div>
          </div>
        )}

        {/* SBT Properties */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Token Properties</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                Soulbound (Non-transferable)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                ZK-KYC Verified Identity
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                Permanently linked to wallet
              </span>
            </div>
          </div>
        </div>

        {/* On-Chain Status */}
        {sbt.onChain && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                On-Chain Verified
              </span>
            </div>
            <p className="text-xs text-gray-500">
              SBT verified on {networkName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Owner: {sbt.onChain.owner}
            </p>
          </div>
        )}

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Soulbound Tokens (SBTs) cannot be transferred
            or sold. They are permanently tied to your wallet and represent your
            verified identity on the FractionalStay platform.
          </p>
        </div>
      </div>
    </div>
  );
}
