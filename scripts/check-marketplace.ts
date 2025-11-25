import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkListings() {
  console.log('Checking marketplace listings...\n')
  
  try {
    // Get all ACTIVE listings
    const { data: listings, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    if (!listings || listings.length === 0) {
      console.log('No active listings found')
      
      // Check recent SOLD listings
      const { data: soldListings } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'SOLD')
        .order('updated_at', { ascending: false })
        .limit(5)
      
      if (soldListings && soldListings.length > 0) {
        console.log('\n=== Recent SOLD Listings ===')
        soldListings.forEach(listing => {
          console.log(`\nListing ID: ${listing.listing_id}`)
          console.log(`Property: ${listing.property_name}`)
          console.log(`Token ID: ${listing.token_id}`)
          console.log(`Seller: ${listing.seller_wallet}`)
          console.log(`Shares: ${listing.shares_amount}`)
          console.log(`Price per Share: $${listing.price_per_share}`)
          console.log(`Total Price: $${listing.total_price}`)
          console.log(`Status: ${listing.status}`)
          console.log(`Sold at: ${listing.updated_at}`)
        })
      }
      return
    }
    
    console.log(`Found ${listings.length} active listing(s):\n`)
    
    listings.forEach(listing => {
      console.log(`=== Listing ID: ${listing.listing_id} ===`)
      console.log(`Property: ${listing.property_name}`)
      console.log(`Token ID: ${listing.token_id}`)
      console.log(`Seller: ${listing.seller_wallet}`)
      console.log(`Shares Amount: ${listing.shares_amount}`)
      console.log(`Price per Share: $${listing.price_per_share}`)
      console.log(`Total Price: $${listing.total_price}`)
      console.log(`Status: ${listing.status}`)
      console.log(`Created: ${listing.created_at}`)
      console.log('')
    })
    
    // Check if buyer already has portfolio entries
    const buyerWallet = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
    const { data: portfolio } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', buyerWallet.toLowerCase())
    
    console.log(`\n=== Buyer's Current Portfolio ===`)
    console.log(`Wallet: ${buyerWallet}`)
    if (portfolio && portfolio.length > 0) {
      console.log(`Properties: ${portfolio.length}`)
      portfolio.forEach(p => {
        console.log(`\n- ${p.property_name} (Token ID: ${p.token_id})`)
        console.log(`  Shares: ${p.shares_owned}`)
        console.log(`  Total Invested: $${p.total_invested}`)
      })
    } else {
      console.log('No properties in portfolio yet')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkListings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
