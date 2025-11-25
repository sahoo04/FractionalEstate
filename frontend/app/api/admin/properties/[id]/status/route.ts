import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    const propertyId = params.id

    // Validate status
    const validStatuses = ['DRAFT', 'ACTIVE', 'SOLD', 'DELISTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    const updateData = { status }
    const { data, error } = await (supabase as any)
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
      .select()
      .single()

    if (error) {
      console.error('Error updating property status:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ property: data })

  } catch (error: any) {
    console.error('Error in property status API:', error)
    return NextResponse.json(
      { error: 'Failed to update property status', details: error.message },
      { status: 500 }
    )
  }
}
