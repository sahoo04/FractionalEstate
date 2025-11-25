import { createClient } from '@supabase/supabase-js';

async function checkUserData() {
  const supabaseUrl = 'https://phzglkmanavjvsjeonnh.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoemdsa21hbmF2anZzamVvbm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzgwMDM2NSwiZXhwIjoyMDc5Mzc2MzY1fQ.tNpn0B-uDE6_gz9fKxHMtjL4wVPB1f8VSzPzSBi3zNg';

  const supabase = createClient(supabaseUrl, supabaseKey);

  const walletAddress = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53';

  try {
    // Check indexer state
    const { data: indexerState, error: idxError } = await supabase
      .from('indexer_state')
      .select('*')
      .eq('contract_address', '0x1585cF3fc80509920C8A4c9347d189329a6C21D6'.toLowerCase());

    if (idxError) {
      console.error('Error fetching indexer state:', idxError);
    } else {
      console.log('Indexer state:', indexerState);
    }

    // Check properties
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('*')
      .limit(5);

    if (propError) {
      console.error('Error fetching properties:', propError);
    } else {
      console.log('Properties sample:', properties);
    }

    // Check user_portfolios
    const { data: portfolios, error: portError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_wallet', walletAddress);

    if (portError) {
      console.error('Error fetching portfolios:', portError);
    } else {
      console.log('Portfolios for address:', portfolios.length);
      portfolios.forEach(p => console.log(p));
    }

    // Check transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .limit(5);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    } else {
      console.log('Transactions sample:', transactions);
    }

    // Check blockchain_events
    const { data: events, error: eventError } = await supabase
      .from('blockchain_events')
      .select('*')
      .limit(5);

    if (eventError) {
      console.error('Error fetching events:', eventError);
    } else {
      console.log('Events sample:', events);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserData();