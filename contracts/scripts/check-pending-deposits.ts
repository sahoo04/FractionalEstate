import hre from 'hardhat'

const REVENUE_SPLITTER = '0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A'
const TOKEN_ID = 2

async function checkPendingDeposits() {
  console.log('\n💰 Checking Pending Deposits...\n')
  
  const revenueSplitter = await hre.ethers.getContractAt('RevenueSplitter', REVENUE_SPLITTER)
  
  // Check pending distribution
  const pendingDistribution = await revenueSplitter.getPendingDistribution(TOKEN_ID)
  console.log(`⏳ Pending Distribution: $${Number(pendingDistribution) / 1e6} USDC`)
  
  // Check total deposited
  const totalDeposited = await revenueSplitter.totalDeposited(TOKEN_ID)
  console.log(`📊 Total Deposited (Approved): $${Number(totalDeposited) / 1e6} USDC`)
  
  // Check if ward boy is assigned
  const wardBoy = await revenueSplitter.propertyManagers(TOKEN_ID, 0).catch(() => null)
  if (wardBoy) {
    console.log(`\n👤 Ward Boy 0: ${wardBoy}`)
  } else {
    console.log('\n❌ No ward boy assigned!')
  }
  
  // Get FundsDepositedByManager events
  console.log('\n📜 Recent Deposit Events:')
  const depositFilter = revenueSplitter.filters.FundsDepositedByManager(TOKEN_ID)
  const depositEvents = await revenueSplitter.queryFilter(depositFilter, -5000)
  
  if (depositEvents.length === 0) {
    console.log('❌ No deposit events found!')
  } else {
    depositEvents.forEach((event: any, i: number) => {
      console.log(`\n${i + 1}. Deposit:`)
      console.log(`   Amount: $${Number(event.args.amount) / 1e6} USDC`)
      console.log(`   Manager: ${event.args.manager}`)
      console.log(`   Block: ${event.blockNumber}`)
      console.log(`   TX: ${event.transactionHash}`)
    })
  }
  
  // Get PayoutTriggered events
  console.log('\n\n📜 Recent Payout Events:')
  const payoutFilter = revenueSplitter.filters.PayoutTriggered(TOKEN_ID)
  const payoutEvents = await revenueSplitter.queryFilter(payoutFilter, -5000)
  
  if (payoutEvents.length === 0) {
    console.log('❌ No payout events found!')
  } else {
    payoutEvents.forEach((event: any, i: number) => {
      console.log(`\n${i + 1}. Payout:`)
      console.log(`   Total: $${Number(event.args.totalAmount) / 1e6} USDC`)
      console.log(`   Net: $${Number(event.args.netAmount) / 1e6} USDC`)
      console.log(`   Block: ${event.blockNumber}`)
    })
  }
  
  console.log('\n\n💡 Summary:')
  if (Number(pendingDistribution) > 0) {
    console.log('✅ Pending distribution exists - Admin can call callOutPay()')
  } else if (depositEvents.length > 0) {
    console.log('⚠️  Deposits found but pending = 0')
    console.log('   This means deposits were already approved/distributed')
  } else {
    console.log('❌ No deposits found - Ward boy needs to call depositFunds()')
  }
}

checkPendingDeposits().catch(console.error)
