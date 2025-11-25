import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Submit KYC documents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      wallet_address,
      full_name,
      date_of_birth,
      nationality,
      address,
      city,
      state,
      pincode,
      id_type,
      id_number,
      address_proof_type,
      document_hash,
      status = 'PENDING'
    } = body
    
    if (!wallet_address || !full_name || !document_hash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Map id_type to document_type enum
    const documentTypeMap: Record<string, string> = {
      'passport': 'PASSPORT',
      'aadhar': 'ID_CARD',
      'dl': 'DRIVER_LICENSE'
    }
    const document_type = documentTypeMap[id_type] || 'ID_CARD'

    const supabase = createClient()
    if (!supabase) {
      console.error('Supabase not configured')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Check if KYC already exists - check both columns
    const normalizedAddress = wallet_address.toLowerCase()
    const { data: existingKYC } = await (supabase as any)
      .from('kyc_documents')
      .select('id, status, wallet_address, user_wallet')
      .or(`user_wallet.eq.${normalizedAddress},wallet_address.eq.${normalizedAddress}`)
      .maybeSingle()

    if (existingKYC) {
      // Update existing KYC
      const { data, error } = await (supabase as any)
        .from('kyc_documents')
        .update({
          document_type,
          full_name,
          date_of_birth,
          nationality,
          address,
          city,
          state,
          pincode,
          id_type,
          id_number,
          address_proof_type,
          document_hash,
          status,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .or(`user_wallet.eq.${normalizedAddress},wallet_address.eq.${normalizedAddress}`)
        .select()
        .single()

      if (error) {
        console.error('Error updating KYC:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return NextResponse.json(
          { 
            error: 'Failed to update KYC',
            details: error.message,
            hint: error.hint,
            code: error.code
          },
          { status: 500 }
        )
      }

      // Update user's kyc_status
      await (supabase as any)
        .from('users')
        .update({ kyc_status: status })
        .eq('wallet_address', wallet_address.toLowerCase())

      return NextResponse.json({
        success: true,
        message: 'KYC updated successfully',
        kyc: data
      })
    }

    // Insert new KYC
    const { data, error } = await (supabase as any)
      .from('kyc_documents')
      .insert({
        user_wallet: wallet_address.toLowerCase(), // Old column name
        wallet_address: wallet_address.toLowerCase(), // New column name
        document_type,
        full_name,
        date_of_birth,
        nationality,
        address,
        city,
        state,
        pincode,
        id_type,
        id_number,
        address_proof_type,
        document_hash,
        status,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting KYC:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { 
          error: 'Failed to save KYC',
          details: error.message,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      )
    }

    // Update user's kyc_status
    await (supabase as any)
      .from('users')
      .update({ kyc_status: status })
      .eq('wallet_address', wallet_address.toLowerCase())

    return NextResponse.json({
      success: true,
      message: 'KYC submitted successfully',
      documentHash: document_hash,
      status: 'PENDING',
      kyc: data
    })
  } catch (error) {
    console.error('KYC submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit KYC', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// Get KYC status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Fetch from database
    const { data, error } = await (supabase as any)
      .from('kyc_documents')
      .select('*')
      .eq('user_wallet', address.toLowerCase())
      .single()

    if (error || !data) {
      return NextResponse.json({
        exists: false,
        status: 'NOT_SUBMITTED'
      })
    }

    return NextResponse.json({
      exists: true,
      status: data.status,
      kyc: data
    })
  } catch (error) {
    console.error('KYC fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KYC status' },
      { status: 500 }
    )
  }
}
