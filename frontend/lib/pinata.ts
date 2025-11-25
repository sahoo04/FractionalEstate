/**
 * Pinata IPFS Integration for Bill/Document Storage
 * Used to upload ward boy bills and receipts to IPFS
 */

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'

export interface PinataUploadResponse {
  IpfsHash: string
  PinSize: number
  Timestamp: string
  isDuplicate?: boolean
}

export interface BillFile {
  file: File
  category: 'electricity' | 'water' | 'gas' | 'repairs' | 'cleaning' | 'other'
  description: string
}

/**
 * Upload a single file to Pinata IPFS
 */
export async function uploadFileToPinata(file: File): Promise<PinataUploadResponse> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT token not configured')
  }

  const formData = new FormData()
  formData.append('file', file)

  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      fileType: file.type,
      fileSize: file.size.toString(),
    }
  })
  formData.append('pinataMetadata', metadata)

  const options = JSON.stringify({
    cidVersion: 1,
  })
  formData.append('pinataOptions', options)

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload to Pinata')
    }

    const data: PinataUploadResponse = await response.json()
    return data
  } catch (error) {
    console.error('Pinata upload error:', error)
    throw error
  }
}

/**
 * Upload multiple files to Pinata IPFS
 * Returns array of IPFS hashes with metadata
 */
export async function uploadMultipleFilesToPinata(
  files: BillFile[]
): Promise<Array<{
  ipfsHash: string
  category: string
  description: string
  fileName: string
  fileSize: number
  fileType: string
}>> {
  const uploadPromises = files.map(async ({ file, category, description }) => {
    const result = await uploadFileToPinata(file)
    return {
      ipfsHash: result.IpfsHash,
      category,
      description,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    }
  })

  return Promise.all(uploadPromises)
}

/**
 * Upload JSON data to Pinata (for storing rent deposit details)
 */
export async function uploadJSONToPinata(
  data: any,
  name: string
): Promise<PinataUploadResponse> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT token not configured')
  }

  const body = {
    pinataContent: data,
    pinataMetadata: {
      name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        type: 'rent-deposit-metadata',
      }
    },
    pinataOptions: {
      cidVersion: 1,
    }
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload JSON to Pinata')
    }

    const data: PinataUploadResponse = await response.json()
    return data
  } catch (error) {
    console.error('Pinata JSON upload error:', error)
    throw error
  }
}

/**
 * Get IPFS URL for a hash
 */
export function getIPFSUrl(hash: string): string {
  return `https://${PINATA_GATEWAY}/ipfs/${hash}`
}

/**
 * Validate file before upload
 */
export function validateBillFile(file: File): { valid: boolean; error?: string } {
  // Max file size: 10MB
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed. Use JPG, PNG, WEBP, or PDF' }
  }

  return { valid: true }
}

/**
 * Batch validate multiple files
 */
export function validateMultipleBillFiles(files: File[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (files.length === 0) {
    return { valid: false, errors: ['No files selected'] }
  }

  if (files.length > 20) {
    return { valid: false, errors: ['Maximum 20 files allowed per upload'] }
  }

  files.forEach((file, index) => {
    const validation = validateBillFile(file)
    if (!validation.valid) {
      errors.push(`File ${index + 1} (${file.name}): ${validation.error}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file icon based on type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  return '📎'
}
