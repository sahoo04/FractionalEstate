import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addPurchaseToPortfolio() {
  const buyerWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
  
  // You'll need to provide these details from the marketplace listing
  const listingId = process.env.LISTING_ID || '1' // Change this
  const tokenId = process.env.TOKEN_ID || '1' // Change this
  const sharesAmount = parseInt(process.env.SHARES_AMOUNT || '10') // Change this
  const totalPrice = process.env.TOTAL_PRICE || '100' // Change this
  
  console.log('Adding purchase to portfolio...')
  console.log('Buyer:', buyerWallet)
  console.log('Token ID:', tokenId)
  console.log('Shares:', sharesAmount)
  console.log('Total Price:', totalPrice)
  
  try {
    // Get property details
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('name, price_per_share')
      .eq('token_id', tokenId)
      .single()
    
    if (propError) {
      console.error('Error fetching property:', propError)
      throw propError
    }
    
    console.log('Property found:', property.name)
    
    // Check if buyer already has a portfolio entry
    const { data: existingPortfolio } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', buyerWallet.toLowerCase())
      .eq('token_id', tokenId)
      .single()
    
    if (existingPortfolio) {
      console.log('Updating existing portfolio entry...')
      // Update existing entry
      const newShares = existingPortfolio.shares_owned + sharesAmount
      const newTotalInvested = parseFloat(existingPortfolio.total_invested) + parseFloat(totalPrice)
      
      const { error: updateError } = await supabase
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          total_invested: newTotalInvested.toString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', existingPortfolio.id)
      
      if (updateError) {
        console.error('Error updating portfolio:', updateError)
        throw updateError
      }
      
      console.log('✅ Portfolio updated successfully!')
      console.log('New shares:', newShares)
      console.log('New total invested:', newTotalInvested)
    } else {
      console.log('Creating new portfolio entry...')
      // Create new entry
      const { error: insertError } = await supabase
        .from('user_portfolios')
        .insert({
          user_wallet: buyerWallet.toLowerCase(),
          token_id: parseInt(tokenId),
          property_name: property.name,
          shares_owned: sharesAmount,
          total_invested: totalPrice,
          total_rewards_claimed: '0',
          last_updated: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Error inserting portfolio:', insertError)
        throw insertError
      }
      
      console.log('✅ Portfolio entry created successfully!')
    }
    
    // Update listing status to SOLD
    const { error: listingError } = await supabase
      .from('marketplace_listings')
      .update({
        status: 'SOLD',
        updated_at: new Date().toISOString()
      })
      .eq('listing_id', listingId)
    
    if (listingError) {
      console.warn('Could not update listing status:', listingError)
    } else {
      console.log('✅ Listing marked as SOLD')
    }
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

addPurchaseToPortfolio()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
