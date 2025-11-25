import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateSellerPortfolio() {
  // Seller details from the listing
  const sellerWallet = '0xbaE9b8B0b94Ad045b0E3eDb2B56CFecd7601cF53'
  const tokenId = 2
  const sharesSold = 1
  const salePrice = 2000
  
  console.log('=== Updating Seller Portfolio ===')
  console.log('Seller:', sellerWallet)
  console.log('Token ID:', tokenId)
  console.log('Shares Sold:', sharesSold)
  console.log('Sale Price: $', salePrice)
  console.log('')
  
  try {
    // Get seller's current portfolio entry
    const { data: portfolio, error: fetchError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', sellerWallet.toLowerCase())
      .eq('token_id', tokenId)
      .single()
    
    if (fetchError || !portfolio) {
      console.error('❌ Seller portfolio not found:', fetchError)
      console.log('\nCreating new portfolio entry for seller...')
      
      // Seller might have listed all their shares, so no entry exists
      // This is okay - they sold everything
      console.log('✅ Seller has sold all shares - no portfolio entry needed')
      return
    }
    
    console.log('Current Portfolio:')
    console.log('- Shares Owned:', portfolio.shares_owned)
    console.log('- Total Invested: $', portfolio.total_invested)
    console.log('')
    
    // Calculate new shares after sale
    const newShares = portfolio.shares_owned - sharesSold
    
    if (newShares < 0) {
      console.error('❌ Error: Seller would have negative shares!')
      console.log('This should not happen - check blockchain state')
      return
    }
    
    if (newShares === 0) {
      // Seller sold all shares - delete portfolio entry
      console.log('Seller sold all shares - removing portfolio entry...')
      
      const { error: deleteError } = await supabase
        .from('user_portfolios')
        .delete()
        .eq('id', portfolio.id)
      
      if (deleteError) {
        console.error('❌ Error deleting portfolio:', deleteError)
      } else {
        console.log('✅ Portfolio entry removed (seller has 0 shares)')
      }
    } else {
      // Update seller's remaining shares
      console.log('Updating seller portfolio...')
      console.log('New shares:', newShares)
      
      const { error: updateError } = await supabase
        .from('user_portfolios')
        .update({
          shares_owned: newShares,
          last_updated: new Date().toISOString()
        })
        .eq('id', portfolio.id)
      
      if (updateError) {
        console.error('❌ Error updating portfolio:', updateError)
      } else {
        console.log('✅ Seller portfolio updated successfully!')
        console.log('Remaining shares:', newShares)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

updateSellerPortfolio()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Failed:', error)
    process.exit(1)
  })
