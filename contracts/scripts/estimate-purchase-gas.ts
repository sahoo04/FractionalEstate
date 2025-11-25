const hre = require('hardhat')

async function main() {
  const ethers = hre.ethers
  const tokenId = BigInt(process.env.TOKEN_ID || '1763840475319')
  const shares = BigInt(process.env.SHARES || '10')
  const contractAddress = '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'

  const [caller] = await ethers.getSigners()
  console.log('Caller:', caller.address)

  const PropertyShare1155 = await ethers.getContractAt('PropertyShare1155', contractAddress)

  try {
    console.log('Estimating gas for purchaseShares(', tokenId.toString(), ',', shares.toString(), ')')
    const estimate = await PropertyShare1155.estimateGas.purchaseShares(tokenId, shares, {
      from: caller.address,
    })
    console.log('Estimated gas:', estimate.toString())
  } catch (err) {
    console.error('Estimate failed:', err && err.message ? err.message : err)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
