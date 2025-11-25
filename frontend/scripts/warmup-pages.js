/**
 * Pre-compile all pages by making requests to them
 * This ensures pages are compiled before users visit them
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

// List of all pages to pre-compile
// Organized by category for better maintainability
const pagesToWarmup = [
  // ============================================
  // PUBLIC PAGES (No auth required)
  // ============================================
  '/',
  '/properties',
  '/marketplace',
  '/register',
  '/kyc',
  
  // ============================================
  // USER PAGES (Auth required)
  // ============================================
  '/dashboard',
  '/ward-boy',
  
  // ============================================
  // SELLER PAGES
  // ============================================
  '/seller/properties',
  '/seller/create-property',
  
  // ============================================
  // ADMIN PAGES
  // ============================================
  '/admin',
  '/admin/login',
  '/admin/dashboard',
  '/admin/overview',
  '/admin/properties',
  '/admin/revenue',
  '/admin/kyc',
  '/admin/users',
  '/admin/analytics',
  
  // ============================================
  // DYNAMIC PAGES (Sample IDs - will compile the route)
  // ============================================
  // Note: These use sample IDs to compile the dynamic route
  // Actual property/wallet pages will compile on first visit
  '/property/1',        // Sample property ID
  '/explorer/0x0000000000000000000000000000000000000000', // Sample wallet
  '/admin/properties/1', // Sample admin property detail
];

// Function to make a request to warmup a page
function warmupPage(path, index, total) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const startTime = Date.now();
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        // Success status codes (200-299, 300-399 for redirects)
        if (status >= 200 && status < 400) {
          console.log(`✅ [${index + 1}/${total}] Pre-compiled: ${path} (${status}) - ${duration}ms`);
          resolve({ path, status, duration, success: true });
        } else {
          console.log(`⚠️  [${index + 1}/${total}] ${path} returned ${status} - ${duration}ms`);
          resolve({ path, status, duration, success: false });
        }
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      // Ignore connection errors - page might not exist yet or server not ready
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        console.log(`⏳ [${index + 1}/${total}] Waiting for: ${path}...`);
        resolve({ path, status: 'pending', duration, success: false });
      } else {
        console.log(`⚠️  [${index + 1}/${total}] Skipped: ${path} (${error.message})`);
        resolve({ path, status: 'error', duration, success: false });
      }
    });

    req.setTimeout(10000, () => {
      req.destroy();
      const duration = Date.now() - startTime;
      console.log(`⏱️  [${index + 1}/${total}] Timeout: ${path} (10s)`);
      resolve({ path, status: 'timeout', duration, success: false });
    });
  });
}

// Wait for server to be ready
function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      attempts++;
      const req = http.get(`${BASE_URL}/`, (res) => {
        console.log('✅ Server is ready!');
        resolve();
      });

      req.on('error', () => {
        if (attempts >= maxAttempts) {
          console.error('❌ Server not ready after 30 attempts');
          reject(new Error('Server not ready'));
        } else {
          setTimeout(checkServer, 1000);
        }
      });
    };

    checkServer();
  });
}

// Main warmup function
async function warmupAllPages() {
  console.log('🔥 Starting page warmup (pre-compilation)...\n');

  try {
    // Wait for server to be ready
    await waitForServer();
    console.log('');

    // Warmup all pages sequentially (with delay to avoid overwhelming server)
    const results = [];
    const total = pagesToWarmup.length;
    
    console.log(`📋 Found ${total} pages to pre-compile\n`);
    
    for (let i = 0; i < pagesToWarmup.length; i++) {
      const path = pagesToWarmup[i];
      const result = await warmupPage(path, i, total);
      results.push(result);
      
      // Small delay between requests to avoid overwhelming the server
      if (i < pagesToWarmup.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Warmup Summary:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.status !== 'pending').length;
    const pending = results.filter(r => r.status === 'pending').length;
    const avgTime = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
    
    console.log(`✅ Successfully compiled: ${successful}/${total} pages`);
    if (failed > 0) {
      console.log(`⚠️  Failed/Skipped: ${failed} pages`);
    }
    if (pending > 0) {
      console.log(`⏳ Pending (will compile on first visit): ${pending} pages`);
    }
    console.log(`⏱️  Average compilation time: ${Math.round(avgTime)}ms`);
    console.log('='.repeat(60));
    console.log('✨ Warmup complete! Pages are ready for users.\n');
  } catch (error) {
    console.error('❌ Warmup failed:', error.message);
    process.exit(1);
  }
}

// Run warmup
if (require.main === module) {
  warmupAllPages();
}

module.exports = { warmupAllPages, pagesToWarmup };

