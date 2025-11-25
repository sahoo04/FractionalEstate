import { createClient } from '@supabase/supabase-js';

async function checkUserData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase env vars not set');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const walletAddress = '0xbae9b8b0b94ad045b0e3edb2b56cfecd7601cf53';

  try {
    // Check transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_address', walletAddress);

    if (txError) {
      console.error('Error fetching transactions:', txError);
    } else {
      console.log('Transactions for address:', transactions.length);
      transactions.forEach(tx => console.log(tx));
    }

    // Check user_portfolios
    const { data: portfolios, error: portError } = await supabase
      .from('user_portfolios')
      .select('*')
      .eq('user_address', walletAddress);

    if (portError) {
      console.error('Error fetching portfolios:', portError);
    } else {
      console.log('Portfolios for address:', portfolios.length);
      portfolios.forEach(p => console.log(p));
    }

    // Check blockchain_events
    const { data: events, error: eventError } = await supabase
      .from('blockchain_events')
      .select('*')
      .eq('user_address', walletAddress);

    if (eventError) {
      console.error('Error fetching events:', eventError);
    } else {
      console.log('Events for address:', events.length);
      events.forEach(e => console.log(e));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserData();