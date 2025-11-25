import hre from 'hardhat'

const REVENUE_SPLITTER = '0x624D82B44B6790CE3ef88E1de456E918dc77Bf2A'
const TOKEN_ID = 2

async function testCallOutPay() {
  console.log('\n🧪 Testing callOutPay function...\n')
  
  const [admin] = await hre.ethers.getSigners()
  console.log('Admin wallet:', admin.address)
  
  const revenueSplitter = await hre.ethers.getContractAt('RevenueSplitter', REVENUE_SPLITTER)
  
  // Check pending distribution
  const pendingDistribution = await revenueSplitter.getPendingDistribution(TOKEN_ID)
  console.log(`\n📊 Pending Distribution: $${Number(pendingDistribution) / 1e6} USDC`)
  
  if (Number(pendingDistribution) === 0) {
    console.log('\n❌ No pending distribution to approve!')
    console.log('   Manager needs to deposit funds first using depositFunds()')
    return
  }
  
  // Try to call callOutPay
  console.log('\n🔄 Attempting to call callOutPay...')
  
  try {
    const tx = await revenueSplitter.callOutPay(TOKEN_ID, {
      gasLimit: 500000
    })
    console.log('✅ Transaction sent:', tx.hash)
    console.log('⏳ Waiting for confirmation...')
    
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed!')
    console.log('   Gas used:', receipt.gasUsed.toString())
    
    // Check new state
    const newPending = await revenueSplitter.getPendingDistribution(TOKEN_ID)
    const totalDeposited = await revenueSplitter.totalDeposited(TOKEN_ID)
    
    console.log('\n📊 After callOutPay:')
    console.log(`   Pending: $${Number(newPending) / 1e6} USDC`)
    console.log(`   Total Deposited: $${Number(totalDeposited) / 1e6} USDC`)
    
  } catch (error: any) {
    console.error('\n❌ Transaction failed!')
    console.error('Error:', error.message)
    
    if (error.message.includes('No pending')) {
      console.log('\n💡 Hint: No pending distribution found')
    } else if (error.message.includes('Ownable')) {
      console.log('\n💡 Hint: Only admin can call this function')
    }
  }
}

testCallOutPay().catch(console.error)
