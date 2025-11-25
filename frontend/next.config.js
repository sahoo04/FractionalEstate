/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimize bundle size
  swcMinify: true,
  
  // Reduce console spam
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  images: {
    domains: ['ipfs.io', 'gateway.pinata.cloud'],
  },
  
  // Optimize for production
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@headlessui/react', 'wagmi', 'viem'],
  },
  
  webpack: (config, { isServer, webpack }) => {
    // Polyfill for localStorage on server-side
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'node-localstorage': false,
      }
    }
    
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'pino-pretty': false,
        'lokijs': false,
        'fs': false,
        'net': false,
        'tls': false,
        'crypto': false,
        'stream': false,
        'http': false,
        'https': false,
        'zlib': false,
        'encoding': false,
        'bufferutil': false,
        'utf-8-validate': false,
      }
    }
    
    // Ignore large optional dependencies and warnings
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(lokijs|@solana|bufferutil|utf-8-validate)$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /@react-native-async-storage\/async-storage/,
        contextRegExp: /@metamask\/sdk/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /pino-pretty/,
        contextRegExp: /pino/,
      })
    )
    
    // Disable chunk splitting for middleware (fixes exports error)
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      }
    } else {
      // Optimize chunk splitting for client only
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'async', // Changed from 'all' to 'async'
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'async',
              test: /node_modules/,
              priority: 20,
            },
            // Wagmi + Web3 libraries
            web3: {
              name: 'web3',
              test: /[\\/]node_modules[\\/](wagmi|viem|@rainbow-me|@tanstack)[\\/]/,
              chunks: 'async',
              priority: 30,
            },
          },
        },
      }
    }
    
    // Reduce webpack verbosity and suppress module warnings
    config.stats = 'errors-warnings'
    config.infrastructureLogging = {
      level: 'error',
    }
    
    // Suppress specific module warnings
    config.ignoreWarnings = [
      { module: /@react-native-async-storage/ },
      { module: /pino-pretty/ },
      { message: /Can't resolve '@react-native-async-storage/ },
      { message: /Can't resolve 'pino-pretty'/ },
    ]
    
    return config
  },
  
  // Suppress hydration warnings and remove console in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize CSS
  optimizeFonts: true,
}

module.exports = nextConfig


