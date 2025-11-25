// Upload a single file to IPFS
export async function uploadFileToIPFS(file: File): Promise<{
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  gatewayUrl?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data;
  } catch (error) {
    console.error("IPFS upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Upload multiple files to IPFS
export async function uploadMultipleFilesToIPFS(files: File[]): Promise<{
  success: boolean;
  files?: Array<{
    filename: string;
    ipfsHash: string;
    ipfsUrl: string;
    gatewayUrl: string;
  }>;
  error?: string;
}> {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch("/api/ipfs/upload", {
      method: "PUT",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data;
  } catch (error) {
    console.error("Multiple IPFS upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Upload JSON metadata to IPFS
export async function uploadJSONToIPFS(data: any): Promise<{
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  gatewayUrl?: string;
  error?: string;
}> {
  try {
    const response = await fetch("/api/ipfs/upload", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    return result;
  } catch (error) {
    console.error("JSON IPFS upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Get IPFS content via gateway URL
export function getIPFSUrl(ipfsHash: string, gateway?: string): string {
  const defaultGateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  const selectedGateway = gateway || defaultGateway;

  // Remove ipfs:// prefix if present
  const hash = ipfsHash.replace("ipfs://", "");

  return `https://${selectedGateway}/ipfs/${hash}`;
}

// Upload property documents (images + docs) and create metadata
export async function uploadPropertyDocuments(data: {
  images: File[];
  titleDeed?: File;
  valuationReport?: File;
  taxClearance?: File;
  propertyData: any;
}): Promise<{
  success: boolean;
  metadataHash?: string;
  metadataUrl?: string;
  error?: string;
}> {
  try {
    // 1. Upload all images
    const imageUploads = await uploadMultipleFilesToIPFS(data.images);
    if (!imageUploads.success) {
      throw new Error("Failed to upload images");
    }

    // 2. Upload documents
    const documents: any = {};

    if (data.titleDeed) {
      const titleDeedUpload = await uploadFileToIPFS(data.titleDeed);
      if (titleDeedUpload.success) {
        documents.titleDeed = titleDeedUpload.ipfsUrl;
      }
    }

    if (data.valuationReport) {
      const valuationUpload = await uploadFileToIPFS(data.valuationReport);
      if (valuationUpload.success) {
        documents.valuationReport = valuationUpload.ipfsUrl;
      }
    }

    if (data.taxClearance) {
      const taxUpload = await uploadFileToIPFS(data.taxClearance);
      if (taxUpload.success) {
        documents.taxClearance = taxUpload.ipfsUrl;
      }
    }

    // 3. Create metadata JSON
    const metadata = {
      ...data.propertyData,
      images: imageUploads.files?.map((f) => f.ipfsUrl) || [],
      documents,
      uploadedAt: new Date().toISOString(),
    };

    // 4. Upload metadata JSON
    const metadataUpload = await uploadJSONToIPFS(metadata);
    if (!metadataUpload.success) {
      throw new Error("Failed to upload metadata");
    }

    return {
      success: true,
      metadataHash: metadataUpload.ipfsHash,
      metadataUrl: metadataUpload.ipfsUrl,
    };
  } catch (error) {
    console.error("Property documents upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Upload KYC documents
export async function uploadKYCDocuments(data: {
  idFront?: File;
  idBack?: File;
  addressProof?: File;
  selfie?: File;
  kycData: any;
}): Promise<{
  success: boolean;
  documentHash?: string;
  documentUrl?: string;
  error?: string;
}> {
  try {
    const documents: any = {};

    // Upload all KYC documents
    if (data.idFront) {
      const upload = await uploadFileToIPFS(data.idFront);
      if (upload.success) documents.idFront = upload.ipfsUrl;
    }

    if (data.idBack) {
      const upload = await uploadFileToIPFS(data.idBack);
      if (upload.success) documents.idBack = upload.ipfsUrl;
    }

    if (data.addressProof) {
      const upload = await uploadFileToIPFS(data.addressProof);
      if (upload.success) documents.addressProof = upload.ipfsUrl;
    }

    if (data.selfie) {
      const upload = await uploadFileToIPFS(data.selfie);
      if (upload.success) documents.selfie = upload.ipfsUrl;
    }

    // Create KYC metadata JSON
    const kycMetadata = {
      ...data.kycData,
      documents,
      submittedAt: new Date().toISOString(),
    };

    // Upload metadata
    const metadataUpload = await uploadJSONToIPFS(kycMetadata);
    if (!metadataUpload.success) {
      throw new Error("Failed to upload KYC metadata");
    }

    return {
      success: true,
      documentHash: metadataUpload.ipfsHash,
      documentUrl: metadataUpload.ipfsUrl,
    };
  } catch (error) {
    console.error("KYC documents upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Upload SBT metadata to IPFS
 * Creates a metadata JSON for Soulbound Token with verification details
 */
export async function uploadSBTMetadata(data: {
  walletAddress: string;
  name: string;
  email: string;
  verifiedAt: string;
  provider: string;
  proofHash: string;
}): Promise<{
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  gatewayUrl?: string;
  error?: string;
}> {
  try {
    // Create SBT metadata JSON following ERC721 metadata standard
    const metadata = {
      name: `FractionalStay Identity - ${data.name}`,
      description: `ZK-KYC Verified Identity Soulbound Token for ${data.walletAddress}`,
      image: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG", // Placeholder image
      external_url: `https://fractionalstay.com/explorer/${data.walletAddress}`,
      attributes: [
        {
          trait_type: "Verification Status",
          value: "ZK-KYC Verified",
        },
        {
          trait_type: "Verification Provider",
          value: data.provider,
        },
        {
          trait_type: "Verified At",
          value: data.verifiedAt,
        },
        {
          trait_type: "Proof Hash",
          value: data.proofHash,
        },
        {
          trait_type: "Identity Type",
          value: "Soulbound Token (Non-transferable)",
        },
      ],
      properties: {
        walletAddress: data.walletAddress,
        name: data.name,
        email: data.email,
        verifiedAt: data.verifiedAt,
        provider: data.provider,
        proofHash: data.proofHash,
      },
    };

    // Upload to IPFS
    const uploadResult = await uploadJSONToIPFS(metadata);

    return uploadResult;
  } catch (error) {
    console.error("SBT metadata upload error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}
