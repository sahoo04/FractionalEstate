/**
 * Script to upload KYC SBT badge image and metadata to IPFS
 * Run this to get the IPFS hash for the SBT image
 */

const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const PINATA_JWT = process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT

if (!PINATA_JWT) {
  console.error('❌ Please set PINATA_JWT in .env.local')
  process.exit(1)
}

async function uploadToIPFS(filePath, filename) {
  const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
  
  const formData = new FormData()
  const fileStream = fs.createReadStream(filePath)
  formData.append('file', fileStream, { filename })
  
  const metadata = JSON.stringify({
    name: filename,
  })
  formData.append('pinataMetadata', metadata)

  try {
    const response = await axios.post(url, formData, {
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        ...formData.getHeaders()
      }
    })

    return response.data.IpfsHash
  } catch (error) {
    console.error('Error uploading to IPFS:', error.response?.data || error.message)
    throw error
  }
}

async function uploadMetadata(metadata) {
  const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
  
  try {
    const response = await axios.post(url, metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      }
    })

    return response.data.IpfsHash
  } catch (error) {
    console.error('Error uploading metadata:', error.response?.data || error.message)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting KYC SBT Badge upload to IPFS...\n')

  // Step 1: Upload SVG image
  console.log('📤 Uploading badge image...')
  const imageHash = await uploadToIPFS(
    path.join(__dirname, '../public/kyc-sbt-badge.svg'),
    'kyc-sbt-badge.svg'
  )
  console.log('✅ Image uploaded!')
  console.log(`   IPFS Hash: ${imageHash}`)
  console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${imageHash}\n`)

  // Step 2: Create and upload metadata
  console.log('📤 Uploading metadata...')
  const metadata = {
    name: "FractionalStay Identity Badge",
    description: "Verified KYC Identity - Soulbound Token (Non-Transferable). This badge represents successful identity verification on the FractionalStay platform.",
    image: `ipfs://${imageHash}`,
    attributes: [
      {
        "trait_type": "Verification Status",
        "value": "KYC Approved"
      },
      {
        "trait_type": "Badge Type",
        "value": "Identity SBT"
      },
      {
        "trait_type": "Platform",
        "value": "FractionalStay"
      },
      {
        "trait_type": "Blockchain",
        "value": "Arbitrum Sepolia"
      },
      {
        "trait_type": "Transferable",
        "value": "No"
      },
      {
        "trait_type": "Verification Provider",
        "value": "FractionalStay KYC"
      }
    ],
    properties: {
      category: "Identity",
      type: "Soulbound Token",
      verified: true,
      issued_by: "FractionalStay Platform"
    }
  }

  const metadataHash = await uploadMetadata(metadata)
  console.log('✅ Metadata uploaded!')
  console.log(`   IPFS Hash: ${metadataHash}`)
  console.log(`   Gateway URL: https://gateway.pinata.cloud/ipfs/${metadataHash}\n`)

  // Step 3: Display results
  console.log('🎉 Upload Complete!\n')
  console.log('📋 Summary:')
  console.log('─────────────────────────────────────────────────────')
  console.log(`Image IPFS:    ipfs://${imageHash}`)
  console.log(`Metadata IPFS: ipfs://${metadataHash}`)
  console.log('─────────────────────────────────────────────────────\n')
  
  console.log('📝 Next Steps:')
  console.log('1. Use this metadata URI when minting SBTs:')
  console.log(`   ipfs://${metadataHash}`)
  console.log('2. Update your KYC approval API to use this URI')
  console.log('3. Test by approving a KYC application\n')

  // Save to file for reference
  const output = {
    imageHash,
    metadataHash,
    imageUrl: `ipfs://${imageHash}`,
    metadataUrl: `ipfs://${metadataHash}`,
    gatewayUrls: {
      image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
      metadata: `https://gateway.pinata.cloud/ipfs/${metadataHash}`
    }
  }

  fs.writeFileSync(
    path.join(__dirname, '../kyc-sbt-ipfs-hashes.json'),
    JSON.stringify(output, null, 2)
  )
  console.log('💾 IPFS hashes saved to: kyc-sbt-ipfs-hashes.json')
}

main().catch(console.error)
