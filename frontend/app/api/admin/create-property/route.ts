import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, location, totalShares, pricePerShare } = body

    if (!name || !location || !totalShares || !pricePerShare) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In production, this would call the relayer service
    // For now, return instructions
    return NextResponse.json({
      success: true,
      message: 'To create properties on blockchain, run: npm run setup (in contracts directory)',
      instructions: [
        '1. Open terminal in /contracts directory',
        '2. Run: npm run setup',
        '3. This will create properties on-chain',
        '4. Refresh the page to see new properties'
      ],
      propertyDetails: {
        name,
        location,
        totalShares: parseInt(totalShares),
        pricePerShare: parseFloat(pricePerShare)
      }
    })
  } catch (error) {
    console.error('Error in create-property API:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
