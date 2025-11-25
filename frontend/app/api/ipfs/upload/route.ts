import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import FormData from 'form-data'

export const runtime = 'nodejs'

// ENV
const PINATA_JWT = process.env.PINATA_JWT!
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'

// Upload a single File (Browser File) → Pinata IPFS
async function uploadWebFile(file: File, fieldName: string) {
  const buffer = Buffer.from(await file.arrayBuffer())

  const form = new FormData()
  form.append("file", buffer, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream'
  })
  form.append("pinataMetadata", JSON.stringify({
    name: `${fieldName}-${Date.now()}-${file.name}`,
    keyvalues: { field: fieldName }
  }))

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    { headers: { Authorization: `Bearer ${PINATA_JWT}`, ...form.getHeaders() } }
  )

  return {
    ipfsHash: res.data.IpfsHash,
    ipfsUrl: `ipfs://${res.data.IpfsHash}`,
    gatewayUrl: `https://${GATEWAY}/ipfs/${res.data.IpfsHash}`,
    timestamp: res.data.Timestamp
  }
}

// Upload JSON → Pinata
async function uploadJson(jsonObj: any) {
  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    jsonObj,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`
      }
    }
  )
  return {
    ipfsHash: res.data.IpfsHash,
    ipfsUrl: `ipfs://${res.data.IpfsHash}`,
    gatewayUrl: `https://${GATEWAY}/ipfs/${res.data.IpfsHash}`,
    timestamp: res.data.Timestamp
  }
}

// POST: Upload single file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const result = await uploadWebFile(file, 'single-file')
    
    return NextResponse.json({
      success: true,
      ipfsHash: result.ipfsHash,
      ipfsUrl: result.ipfsUrl,
      gatewayUrl: result.gatewayUrl,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error('IPFS upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload to IPFS', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// PUT: Upload multiple files
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Upload all files to IPFS
    const uploadPromises = files.map((file, index) => uploadWebFile(file, `file-${index}`))
    const uploads = await Promise.all(uploadPromises)
    
    // Return array of IPFS hashes
    return NextResponse.json({
      success: true,
      files: uploads.map((upload, index) => ({
        filename: files[index].name,
        ipfsHash: upload.ipfsHash,
        ipfsUrl: upload.ipfsUrl,
        gatewayUrl: upload.gatewayUrl,
        timestamp: upload.timestamp,
      }))
    })
  } catch (error) {
    console.error('Multiple IPFS upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files to IPFS', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// PATCH: Upload JSON metadata
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON data' },
        { status: 400 }
      )
    }

    const result = await uploadJson(body)
    
    return NextResponse.json({
      success: true,
      ipfsHash: result.ipfsHash,
      ipfsUrl: result.ipfsUrl,
      gatewayUrl: result.gatewayUrl,
      timestamp: result.timestamp,
    })
  } catch (error) {
    console.error('JSON IPFS upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload JSON to IPFS', details: (error as Error).message },
      { status: 500 }
    )
  }
}
