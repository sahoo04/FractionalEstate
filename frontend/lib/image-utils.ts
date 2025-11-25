/**
 * Image utility functions for handling IPFS and regular URLs
 */

const IPFS_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud'

/**
 * Convert any image reference to a proper URL
 * Handles IPFS URLs, hashes, and regular URLs
 */
export function getImageUrl(image: string | undefined | null): string {
  if (!image) return ''
  
  // If it's already a full HTTP/HTTPS URL, return it
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }
  
  // If it's an IPFS URL (ipfs://...), convert to gateway URL
  if (image.startsWith('ipfs://')) {
    const hash = image.replace('ipfs://', '')
    return `https://${IPFS_GATEWAY}/ipfs/${hash}`
  }
  
  // If it's just a CID/hash (starts with Qm or bafy), add gateway
  if (image.startsWith('Qm') || image.startsWith('bafy')) {
    return `https://${IPFS_GATEWAY}/ipfs/${image}`
  }
  
  // Otherwise, it might be just a filename (no valid URL)
  return ''
}

/**
 * Get multiple image URLs from an array
 */
export function getImageUrls(images: string[] | undefined | null): string[] {
  if (!images || !Array.isArray(images)) return []
  
  return images
    .map(getImageUrl)
    .filter(url => url !== '')
}

/**
 * Validate if an image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get fallback placeholder image
 */
export function getPlaceholderImage(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E'
}
