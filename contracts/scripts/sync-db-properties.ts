import { ethers } from "hardhat";

/**
 * Sync database properties with actual on-chain tokenIds
 * This script checks all properties on blockchain and updates database with correct tokenIds
 */
async function main() {
  const PropertyShare1155 = await ethers.getContractAt(
    'PropertyShare1155',
    '0x7406C24Ac3e4D38b7477345C51a6528A70dd9c8b'
  )
  
  console.log('🔍 Fetching all properties from blockchain...\n')
  
  // Get total property count
  const propertyCount = await PropertyShare1155.propertyCount()
  console.log('Total properties on-chain:', propertyCount.toString())
  
  if (propertyCount === 0n) {
    console.log('\n❌ No properties found on blockchain')
    process.exit(0)
  }
  
  // Fetch all properties (tokenIds are sequential: 1, 2, 3, ...)
  const properties = []
  
  for (let tokenId = 1; tokenId <= Number(propertyCount); tokenId++) {
    try {
      const property = await PropertyShare1155.getProperty(tokenId)
      
      if (property.exists) {
        const totalSupply = await PropertyShare1155.totalSupply(tokenId)
        
        properties.push({
          tokenId: tokenId,
          name: property.name || 'Unknown',
          location: property.location || 'Unknown',
          seller: property.seller,
          pricePerShare: ethers.formatUnits(property.pricePerShare, 6),
          totalShares: property.totalShares.toString(),
          sharesSold: totalSupply.toString(),
          sharesAvailable: (property.totalShares - totalSupply).toString(),
        })
        
        console.log(`\n✅ Property ${tokenId}:`)
        console.log(`   Name: ${property.name}`)
        console.log(`   Location: ${property.location}`)
        console.log(`   Seller: ${property.seller}`)
        console.log(`   Price/Share: ${ethers.formatUnits(property.pricePerShare, 6)} USDC`)
        console.log(`   Shares: ${totalSupply}/${property.totalShares}`)
      }
    } catch (error: any) {
      console.log(`\n⏩ TokenId ${tokenId}: ${error.message}`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total valid properties: ${properties.length}`)
  console.log('\nTo update your database, run this SQL:')
  console.log('='.repeat(60))
  
  if (properties.length > 0) {
    console.log('\n-- Update database with correct tokenIds')
    console.log('-- Match by seller wallet and property name\n')
    
    for (const prop of properties) {
      console.log(`-- Property: ${prop.name}`)
      console.log(`UPDATE properties`)
      console.log(`SET token_id = '${prop.tokenId}'`)
      console.log(`WHERE LOWER(seller_wallet) = LOWER('${prop.seller}')`)
      console.log(`  AND name LIKE '%${prop.name.slice(0, 20)}%';`)
      console.log()
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('💡 Or manually update in Supabase dashboard:')
    console.log('   1. Go to Supabase Table Editor')
    console.log('   2. Open "properties" table')
    console.log('   3. Find rows with wrong token_id (timestamps like 1763840475319)')
    console.log('   4. Update token_id to the correct value shown above')
    console.log('='.repeat(60))
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
