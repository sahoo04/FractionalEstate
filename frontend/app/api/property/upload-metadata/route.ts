import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

// Pinata configuration
const PINATA_JWT = process.env.PINATA_JWT!;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

// Helper: Upload file to Pinata IPFS
async function uploadFileToPinata(
  file: File,
  metadata: {
    name: string;
    keyvalues: Record<string, string>;
  }
): Promise<{ IpfsHash: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const form = new FormData();
  
  form.append('file', buffer, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  });
  
  form.append('pinataMetadata', JSON.stringify({
    name: metadata.name,
    keyvalues: metadata.keyvalues,
  }));
  
  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    form,
    {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        ...form.getHeaders(),
      },
    }
  );
  
  return { IpfsHash: res.data.IpfsHash };
}

// Helper: Upload JSON to Pinata IPFS
async function uploadJsonToPinata(
  jsonObj: any,
  metadata: {
    name: string;
    keyvalues: Record<string, string>;
  }
): Promise<{ IpfsHash: string }> {
  const body = {
    pinataContent: jsonObj,
    pinataMetadata: {
      name: metadata.name,
      keyvalues: metadata.keyvalues,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  };
  
  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
    }
  );
  
  return { IpfsHash: res.data.IpfsHash };
}

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
        const upload = await uploadFileToPinata(file, {
            name: `${name.replace(/\s+/g, '-')}-image-${i + 1}`,
            keyvalues: {
              propertyName: name,
              fileType: 'property-image',
              index: i.toString(),
            },
        });
        
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
        const upload = await uploadFileToPinata(titleDeed, {
            name: `${name.replace(/\s+/g, '-')}-title-deed`,
            keyvalues: {
              propertyName: name,
              fileType: 'title-deed',
            },
        });
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
        const upload = await uploadFileToPinata(valuationReport, {
            name: `${name.replace(/\s+/g, '-')}-valuation-report`,
            keyvalues: {
              propertyName: name,
              fileType: 'valuation-report',
            },
        });
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
        const upload = await uploadFileToPinata(legalDocuments, {
            name: `${name.replace(/\s+/g, '-')}-legal-documents`,
            keyvalues: {
              propertyName: name,
              fileType: 'legal-documents',
            },
        });
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
      const metadataUpload = await uploadJsonToPinata(metadata, {
          name: `${name.replace(/\s+/g, '-')}-metadata`,
          keyvalues: {
            propertyName: name,
            seller,
            fileType: 'property-metadata',
          },
      });

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
          metadata: `https://${PINATA_GATEWAY}/ipfs/${metadataUpload.IpfsHash}`,
          images: imageHashes.map(hash => `https://${PINATA_GATEWAY}/ipfs/${hash}`),
          documents: Object.entries(documentHashes).reduce((acc, [key, hash]) => ({
            ...acc,
            [key]: `https://${PINATA_GATEWAY}/ipfs/${hash}`,
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
