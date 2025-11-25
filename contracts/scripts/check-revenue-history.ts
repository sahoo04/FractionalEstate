import hre from 'hardhat'

const REVENUE_SPLITTER = '0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A'
const TOKEN_ID = 2

async function checkRevenueHistory() {
  console.log('\n📜 Checking Revenue History...\n')
  
  const revenueSplitter = await hre.ethers.getContractAt('RevenueSplitter', REVENUE_SPLITTER)
  
  // Get PayoutTriggered events (admin calls callPayout)
  console.log('Looking for PayoutTriggered events (callPayout by admin)...\n')
  const payoutFilter = revenueSplitter.filters.PayoutTriggered(TOKEN_ID)
  const payoutEvents = await revenueSplitter.queryFilter(payoutFilter, -10000)
  
  if (payoutEvents.length === 0) {
    console.log('❌ No PayoutTriggered events found!')
    console.log('   (Admin has NOT called callPayout yet)\n')
  } else {
    payoutEvents.forEach((event: any, i: number) => {
      console.log(`${i + 1}. Payout Triggered by Admin:`)
      console.log(`   Total Amount: $${Number(event.args.totalAmount) / 1e6} USDC`)
      console.log(`   Platform Fee: $${Number(event.args.platformFee) / 1e6} USDC`)
      console.log(`   Net to Investors: $${Number(event.args.netAmount) / 1e6} USDC`)
      console.log(`   Block: ${event.blockNumber}`)
      console.log('')
    })
  }
  
  // Get FundsDepositedByManager events
  console.log('\nLooking for FundsDepositedByManager events...\n')
  const depositFilter = revenueSplitter.filters.FundsDepositedByManager(TOKEN_ID)
  const depositEvents = await revenueSplitter.queryFilter(depositFilter, -10000)
  
  if (depositEvents.length === 0) {
    console.log('❌ No FundsDepositedByManager events found!')
  } else {
    depositEvents.forEach((event: any, i: number) => {
      console.log(`${i + 1}. Funds Deposited by Manager:`)
      console.log(`   Amount: $${Number(event.args.amount) / 1e6} USDC`)
      console.log(`   Manager: ${event.args.manager}`)
      console.log(`   Block: ${event.blockNumber}`)
      console.log('')
    })
  }
  
  // Get pending distribution
  const pendingDistribution = await revenueSplitter.getPendingDistribution(TOKEN_ID)
  console.log(`\n⏳ Pending Distribution (not approved yet): $${Number(pendingDistribution) / 1e6} USDC`)
  
  // Get total deposited
  const totalDeposited = await revenueSplitter.totalDeposited(TOKEN_ID)
  console.log(`📊 Total Deposited (approved): $${Number(totalDeposited) / 1e6} USDC`)
}

checkRevenueHistory().catch(console.error)
