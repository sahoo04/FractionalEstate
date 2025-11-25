import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, createStorage, fallback } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

// Only include essential wallets to reduce bundle size
// WalletConnect Project ID - get from https://cloud.walletconnect.com
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn(
    "⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. WalletConnect may not work properly."
  );
}

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet],
    },
  ],
  {
    appName: "FractionalStay",
    projectId: walletConnectProjectId || "",
  }
);

// Multiple RPC endpoints with fallback for better reliability
const alchemyRpc =
  process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ||
  "https://arb-sepolia.g.alchemy.com/v2/_dehAHJ6i1FIe7mapiiDs";
const publicRpc = "https://sepolia-rollup.arbitrum.io/rpc";

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors,
  transports: {
    [arbitrumSepolia.id]: fallback([
      http(alchemyRpc, {
        timeout: 30_000,
        retryCount: 3,
        retryDelay: 150,
      }),
      http(publicRpc, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 150,
      }),
    ]),
  },
  ssr: true,
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    key: "fractional-estate-wallet",
  }),
  multiInjectedProviderDiscovery: false,
  batch: {
    multicall: {
      wait: 250,
    },
  },
});
