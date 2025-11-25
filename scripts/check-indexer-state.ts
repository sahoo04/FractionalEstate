import { getIndexerState } from '../indexer/src/database.js';

async function checkIndexerState() {
  try {
    const propertyShareAddress = process.env.PROPERTY_SHARE_CONTRACT_ADDRESS;
    if (!propertyShareAddress) {
      console.error('PROPERTY_SHARE_CONTRACT_ADDRESS not set');
      return;
    }

    const state = await getIndexerState(propertyShareAddress);
    console.log('Indexer State for PropertyShare:');
    console.log(`Last Processed Block: ${state.lastProcessedBlock}`);
    console.log(`Last Processed Time: ${state.lastProcessedTime}`);
  } catch (error) {
    console.error('Error checking indexer state:', error);
  }
}

checkIndexerState();