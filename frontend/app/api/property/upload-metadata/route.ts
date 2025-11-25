import { NextRequest, NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

// Initialize Pinata client
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud',
});

interface PropertyMetadata {
  name: string;
  description: string;
  location: string;
  propertyType: string;
  totalShares: number;
  pricePerShare: number;
  expectedReturn: number;
  images: string[]; // IPFS URLs
  documents: {
    titleDeed?: string;
    valuationReport?: string;
    legalDocuments?: string;
  };
  amenities: string[];
  propertyDetails: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    yearBuilt?: number;
  };
  createdAt: string;
  seller: string;
}

/**
 * POST /api/property/upload-metadata
 * Complete property metadata upload flow:
 * 1. Upload property images to IPFS
 * 2. Upload documents to IPFS
 * 3. Create metadata JSON with all IPFS URLs
 * 4. Upload metadata JSON to IPFS
 * 5. Return metadataUri for contract call
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract text fields
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const propertyType = formData.get('propertyType') as string;
    const totalShares = parseInt(formData.get('totalShares') as string);
    const pricePerShare = parseFloat(formData.get('pricePerShare') as string);
    const expectedReturn = parseFloat(formData.get('expectedReturn') as string);
    const amenities = JSON.parse(formData.get('amenities') as string || '[]');
    const propertyDetails = JSON.parse(formData.get('propertyDetails') as string || '{}');
    const seller = formData.get('seller') as string;

    // Extract files
    const propertyImages = formData.getAll('propertyImages') as File[];
    const titleDeed = formData.get('titleDeed') as File | null;
    const valuationReport = formData.get('valuationReport') as File | null;
    const legalDocuments = formData.get('legalDocuments') as File | null;

    console.log('📤 Starting IPFS upload for property:', name);
    console.log('  - Images:', propertyImages.length);
    console.log('  - Title Deed:', !!titleDeed);
    console.log('  - Valuation Report:', !!valuationReport);
    console.log('  - Legal Documents:', !!legalDocuments);

    // ===== STEP 1: Upload Property Images =====
    const imageUrls: string[] = [];
    const imageHashes: string[] = [];
    
    for (let i = 0; i < propertyImages.length; i++) {
      const file = propertyImages[i];
      
      try {
        const upload = await (pinata.upload as any).file(file as any, {
          metadata: {
            name: `${name.replace(/\s+/g, '-')}-image-${i + 1}`,
            keyvalues: {
              propertyName: name,
              fileType: 'property-image',
              index: i.toString(),
            },
          },
        } as any);
        
        const ipfsUrl = `ipfs://${upload.IpfsHash}`;
        imageUrls.push(ipfsUrl);
        imageHashes.push(upload.IpfsHash);
        console.log(`  ✅ Image ${i + 1}/${propertyImages.length} uploaded: ${upload.IpfsHash}`);
      } catch (error) {
        console.error(`  ❌ Failed to upload image ${i + 1}:`, error);
        throw new Error(`Failed to upload image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // ===== STEP 2: Upload Documents =====
    const documents: PropertyMetadata['documents'] = {};
    const documentHashes: { [key: string]: string } = {};
    
    if (titleDeed) {
      try {
        const upload = await (pinata.upload as any).file(titleDeed as any, {
          metadata: {
            name: `${name.replace(/\s+/g, '-')}-title-deed`,
            keyvalues: {
              propertyName: name,
              fileType: 'title-deed',
            },
          },
        } as any);
        documents.titleDeed = `ipfs://${upload.IpfsHash}`;
        documentHashes.titleDeed = upload.IpfsHash;
        console.log('  ✅ Title deed uploaded:', upload.IpfsHash);
      } catch (error) {
        console.error('  ❌ Failed to upload title deed:', error);
        throw new Error(`Failed to upload title deed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (valuationReport) {
      try {
        const upload = await (pinata.upload as any).file(valuationReport as any, {
          metadata: {
            name: `${name.replace(/\s+/g, '-')}-valuation`,
            keyvalues: {
              propertyName: name,
              fileType: 'valuation-report',
            },
          },
        } as any);
        documents.valuationReport = `ipfs://${upload.IpfsHash}`;
        documentHashes.valuationReport = upload.IpfsHash;
        console.log('  ✅ Valuation report uploaded:', upload.IpfsHash);
      } catch (error) {
        console.error('  ❌ Failed to upload valuation report:', error);
        throw new Error(`Failed to upload valuation report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (legalDocuments) {
      try {
        const upload = await (pinata.upload as any).file(legalDocuments as any, {
          metadata: {
            name: `${name.replace(/\s+/g, '-')}-legal-docs`,
            keyvalues: {
              propertyName: name,
              fileType: 'legal-documents',
            },
          },
        } as any);
        documents.legalDocuments = `ipfs://${upload.IpfsHash}`;
        documentHashes.legalDocuments = upload.IpfsHash;
        console.log('  ✅ Legal documents uploaded:', upload.IpfsHash);
      } catch (error) {
        console.error('  ❌ Failed to upload legal documents:', error);
        throw new Error(`Failed to upload legal documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // ===== STEP 3: Create Metadata JSON =====
    const metadata: PropertyMetadata = {
      name,
      description,
      location,
      propertyType,
      totalShares,
      pricePerShare,
      expectedReturn,
      images: imageUrls,
      documents,
      amenities,
      propertyDetails,
      createdAt: new Date().toISOString(),
      seller,
    };

    // ===== STEP 4: Upload Metadata JSON to IPFS =====
    try {
      const metadataUpload = await (pinata.upload as any).json(metadata as any, {
        metadata: {
          name: `${name.replace(/\\s+/g, '-')}-metadata`,
          keyvalues: {
            propertyName: name,
            seller,
            fileType: 'property-metadata',
          },
        },
      } as any);

      const metadataUri = `ipfs://${metadataUpload.IpfsHash}`;
      console.log('  ✅ Metadata JSON uploaded:', metadataUpload.IpfsHash);
      console.log('🎉 IPFS upload complete!');

      // ===== STEP 5: Return Response =====
      return NextResponse.json({
        success: true,
        metadataUri,
        metadataHash: metadataUpload.IpfsHash,
        imageHashes,
        documentHashes,
        // Gateway URLs for preview/verification
        gateway: {
          metadata: `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${metadataUpload.IpfsHash}`,
          images: imageHashes.map(hash => `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${hash}`),
          documents: Object.entries(documentHashes).reduce((acc, [key, hash]) => ({
            ...acc,
            [key]: `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY}/ipfs/${hash}`,
          }), {}),
        },
      });

    } catch (error) {
      console.error('  ❌ Failed to upload metadata JSON:', error);
      throw new Error(`Failed to upload metadata JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Property metadata upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
