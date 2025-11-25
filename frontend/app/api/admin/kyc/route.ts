import { NextRequest, NextResponse } from 'next/server'

// Get all pending KYC submissions
export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch from database
    // For now, return mock data
    const mockSubmissions = [
      {
        id: '1',
        address: '0x1234...5678',
        name: 'John Doe',
        email: 'john@example.com',
        documentHash: 'ipfs://Qm...',
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        idType: 'Aadhar',
        proofType: 'Utility Bill'
      },
      {
        id: '2',
        address: '0xabcd...efgh',
        name: 'Jane Smith',
        email: 'jane@example.com',
        documentHash: 'ipfs://Qm...',
        status: 'PENDING',
        submittedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        idType: 'Passport',
        proofType: 'Bank Statement'
      }
    ]

    return NextResponse.json({
      submissions: mockSubmissions,
      total: mockSubmissions.length
    })
  } catch (error) {
    console.error('KYC list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KYC submissions' },
      { status: 500 }
    )
  }
}
