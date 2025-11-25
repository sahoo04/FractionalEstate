const WALLET = '0x7d5b1d69a839b27bf120363f6c5af6427bc763ea'
const API_URL = `http://localhost:3001/api/users/${WALLET}/portfolio`

async function testApiDirect() {
  console.log('\n🔍 Testing API endpoint directly...')
  console.log(`URL: ${API_URL}`)
  
  try {
    const response = await fetch(API_URL)
    console.log(`\n📊 Status: ${response.status}`)
    console.log(`✅ OK: ${response.ok}`)
    
    const data = await response.json()
    console.log('\n📦 Response Data:')
    console.log(JSON.stringify(data, null, 2))
    
    if (data.portfolio && data.portfolio.length > 0) {
      console.log('\n✅ Portfolio found!')
      console.log(`Properties: ${data.portfolio.length}`)
      console.log(`First property:`, data.portfolio[0])
    } else {
      console.log('\n❌ Portfolio empty!')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  }
}

testApiDirect()
