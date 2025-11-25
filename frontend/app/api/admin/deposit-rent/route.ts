import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tokenId, amount } = await request.json()

    if (!tokenId || !amount) {
      return NextResponse.json(
        { error: 'Missing tokenId or amount' },
        { status: 400 }
      )
    }

    // In production, this would call the relayer service
    // For MVP, we'll return a message indicating the relayer should be used
    return NextResponse.json({
      message: `Rent deposit request received: ${amount} USDC for property ${tokenId}. Use the relayer service to execute this transaction.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


