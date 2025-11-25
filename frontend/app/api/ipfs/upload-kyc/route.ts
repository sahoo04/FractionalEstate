import { NextRequest, NextResponse } from 'next/server';
import FormDataNode from 'form-data';
import axios from 'axios';

export const runtime = 'nodejs';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

if (!PINATA_JWT) {
  console.error('Missing PINATA_JWT env var');
}

// helper: upload a single web File (from request.formData()) to pinata via REST
async function uploadWebFileToPinata(file: File, fieldName: string) {
  // read file bytes (web File has arrayBuffer)
  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);

  const form = new FormDataNode();
  // append the file buffer — include filename and contentType
  form.append('file', buffer, {
    filename: file.name,
    contentType: (file as any).type || 'application/octet-stream',
  });

  // optional metadata for file organization
  const meta = {
    name: `${fieldName}-${Date.now()}-${file.name}`,
    keyvalues: { field: fieldName },
  };
  form.append('pinataMetadata', JSON.stringify(meta));

  const headers = {
    Authorization: `Bearer ${PINATA_JWT}`,
    ...form.getHeaders(),
  };

  const resp = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 120000,
  });

  return resp.data; // contains IpfsHash, PinSize, Timestamp
}

async function pinJsonToPinata(jsonObj: any) {
  const headers = {
    Authorization: `Bearer ${PINATA_JWT}`,
    'Content-Type': 'application/json',
  };

  const resp = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', jsonObj, {
    headers,
    timeout: 60000,
  });

  return resp.data; // contains IpfsHash, etc.
}

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json({ error: 'Missing Pinata JWT on server' }, { status: 500 });
    }

    const formData = await request.formData();

    // Accept files and metadata
    const idFront = formData.get('idFront') as File | null;
    const idBack = formData.get('idBack') as File | null;
    const addressProof = formData.get('addressProof') as File | null;
    const selfie = formData.get('selfie') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    console.log('Received KYC upload request', {
      hasIdFront: !!idFront,
      hasIdBack: !!idBack,
      hasAddressProof: !!addressProof,
      hasSelfie: !!selfie,
      hasMetadata: !!metadataStr,
    });

    if (!idFront || !addressProof || !selfie || !metadataStr) {
      return NextResponse.json(
        { error: 'Missing required files (idFront, addressProof, selfie, metadata)' },
        { status: 400 }
      );
    }

    const metadata = JSON.parse(metadataStr);

    const uploadedFiles: Array<{ name: string; hash: string; url: string; raw: any }> = [];

    // Upload idFront
    console.log('Uploading ID Front...');
    const idFrontResp = await uploadWebFileToPinata(idFront, 'id_front');
    console.log('ID Front uploaded:', idFrontResp.IpfsHash);
    uploadedFiles.push({
      name: 'id_front',
      hash: idFrontResp.IpfsHash,
      url: `https://${PINATA_GATEWAY}/ipfs/${idFrontResp.IpfsHash}`,
      raw: idFrontResp,
    });

    // Upload idBack if present
    if (idBack) {
      console.log('Uploading ID Back...');
      const idBackResp = await uploadWebFileToPinata(idBack, 'id_back');
      console.log('ID Back uploaded:', idBackResp.IpfsHash);
      uploadedFiles.push({
        name: 'id_back',
        hash: idBackResp.IpfsHash,
        url: `https://${PINATA_GATEWAY}/ipfs/${idBackResp.IpfsHash}`,
        raw: idBackResp,
      });
    }

    // Address proof
    console.log('Uploading Address Proof...');
    const addressResp = await uploadWebFileToPinata(addressProof, 'address_proof');
    console.log('Address Proof uploaded:', addressResp.IpfsHash);
    uploadedFiles.push({
      name: 'address_proof',
      hash: addressResp.IpfsHash,
      url: `https://${PINATA_GATEWAY}/ipfs/${addressResp.IpfsHash}`,
      raw: addressResp,
    });

    // Selfie
    console.log('Uploading Selfie...');
    const selfieResp = await uploadWebFileToPinata(selfie, 'selfie');
    console.log('Selfie uploaded:', selfieResp.IpfsHash);
    uploadedFiles.push({
      name: 'selfie',
      hash: selfieResp.IpfsHash,
      url: `https://${PINATA_GATEWAY}/ipfs/${selfieResp.IpfsHash}`,
      raw: selfieResp,
    });

    // Build KYC metadata JSON
    const kycMetadata = {
      wallet_address: metadata.wallet_address,
      full_name: metadata.full_name,
      id_type: metadata.id_type,
      id_number: metadata.id_number,
      address_proof_type: metadata.address_proof_type,
      uploaded_at: metadata.uploaded_at || new Date().toISOString(),
      files: uploadedFiles.map(f => ({ name: f.name, ipfs: f.hash, url: f.url })),
    };

    // Pin metadata JSON
    console.log('Uploading metadata JSON...');
    const metadataUpload = await pinJsonToPinata(kycMetadata);
    console.log('Metadata uploaded:', metadataUpload.IpfsHash);

    console.log('KYC uploaded successfully', {
      metadataHash: metadataUpload.IpfsHash,
      fileCount: uploadedFiles.length,
    });

    return NextResponse.json({
      success: true,
      ipfsHash: metadataUpload.IpfsHash,
      metadataGateway: `https://${PINATA_GATEWAY}/ipfs/${metadataUpload.IpfsHash}`,
      files: uploadedFiles,
      rawMetadataResp: metadataUpload,
    });
  } catch (err: any) {
    console.error('KYC IPFS upload error:', err?.message ?? err);
    console.error('Error stack:', err?.stack);
    return NextResponse.json(
      {
        error: 'Failed to upload to IPFS',
        details: err?.message ?? String(err),
        fullError: err,
      },
      { status: 500 }
    );
  }
}

