// tests/stress-test.js - Versi Stabil
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = 30000; // 30 detik timeout

// Warna untuk console (opsional)
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkServerHealth() {
    log('\n🔍 Checking server health...', 'cyan');
    try {
        const response = await axios.get(`${BASE_URL}/api/stats`, { timeout: 5000 });
        if (response.status === 200) {
            log('✅ Server is running!', 'green');
            return true;
        }
    } catch (error) {
        log('❌ Server is NOT running!', 'red');
        log(`   Error: ${error.message}`, 'yellow');
        log('\n📌 Please start server first in another terminal:', 'cyan');
        log('   npm start', 'yellow');
        return false;
    }
    return false;
}

async function runStressTest() {
    log('\n' + '='.repeat(60), 'cyan');
    log('🚀 STRESS TEST - Supply Chain Halal', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // Check server
    const isServerRunning = await checkServerHealth();
    if (!isServerRunning) {
        log('\n❌ Aborting stress test. Please start server first!', 'red');
        return;
    }
    
    // Test 1: Basic connectivity
    log('\n📊 Test 1: Basic Connectivity', 'yellow');
    try {
        const response = await axios.get(`${BASE_URL}/api/blockchain/info`);
        log(`   ✅ Connected. Chain length: ${response.data.chainLength}`, 'green');
    } catch (error) {
        log(`   ❌ Connection failed: ${error.message}`, 'red');
        return;
    }
    
    // Test 2: Single transaction test
    log('\n📊 Test 2: Single Transaction Test', 'yellow');
    try {
        const singleStart = Date.now();
        const response = await axios.post(`${BASE_URL}/api/transaction/add`, {
            fromAddress: 'Stress-Tester',
            toAddress: 'Consumer',
            amount: 100,
            productData: {
                id: 'STRESS-TEST-001',
                name: 'Stress Test Product',
                timestamp: Date.now()
            },
            locationData: {
                id: 'CERT-HALAL-001',
                name: 'Test Location',
                latitude: -7.9818,
                longitude: 112.6264
            }
        }, { timeout: TIMEOUT });
        
        const latency = Date.now() - singleStart;
        if (response.data.success) {
            log(`   ✅ Single transaction succeeded`, 'green');
            log(`   ⏱️  Latency: ${latency}ms`, 'cyan');
        }
    } catch (error) {
        log(`   ❌ Single transaction failed: ${error.message}`, 'red');
    }
    
    // Test 3: Multiple transactions (sequential)
    log('\n📊 Test 3: Multiple Transactions (Sequential)', 'yellow');
    const txCount = 20; // Reduced for stability
    const sequentialResults = [];
    const seqStart = Date.now();
    
    for (let i = 0; i < txCount; i++) {
        const txStart = Date.now();
        try {
            await axios.post(`${BASE_URL}/api/transaction/add`, {
                fromAddress: `Sequential-Tester-${i}`,
                toAddress: 'Consumer',
                amount: Math.random() * 100,
                productData: {
                    id: `PROD-SEQ-${i}`,
                    name: `Product ${i}`,
                    timestamp: Date.now()
                },
                locationData: {
                    id: 'CERT-HALAL-001',
                    name: 'Test Location'
                }
            }, { timeout: TIMEOUT });
            
            sequentialResults.push({
                index: i,
                latency: Date.now() - txStart,
                success: true
            });
            
            // Progress indicator
            if ((i + 1) % 5 === 0) {
                log(`   Progress: ${i + 1}/${txCount}`, 'cyan');
            }
            
        } catch (error) {
            sequentialResults.push({
                index: i,
                latency: Date.now() - txStart,
                success: false,
                error: error.message
            });
        }
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const seqTotalTime = Date.now() - seqStart;
    const seqSuccess = sequentialResults.filter(r => r.success).length;
    const seqAvgLatency = sequentialResults.filter(r => r.success).reduce((sum, r) => sum + r.latency, 0) / seqSuccess;
    const seqTPS = (seqSuccess / seqTotalTime) * 1000;
    
    log(`\n   📈 Sequential Test Results:`, 'cyan');
    log(`   ✅ Success: ${seqSuccess}/${txCount}`, seqSuccess === txCount ? 'green' : 'yellow');
    log(`   ⏱️  Total Time: ${seqTotalTime}ms`, 'cyan');
    log(`   ⚡ TPS: ${seqTPS.toFixed(2)}`, 'green');
    log(`   📊 Avg Latency: ${seqAvgLatency.toFixed(2)}ms`, 'cyan');
    
    // Test 4: Concurrent requests (limited)
    log('\n📊 Test 4: Concurrent Requests (Limited)', 'yellow');
    const concurrentCount = 5; // Small concurrent to avoid errors
    const concurrencyResults = [];
    const conStart = Date.now();
    
    const concurrentPromises = [];
    for (let i = 0; i < concurrentCount; i++) {
        const promise = axios.post(`${BASE_URL}/api/transaction/add`, {
            fromAddress: `Concurrent-Tester-${i}`,
            toAddress: 'Consumer',
            amount: Math.random() * 100,
            productData: {
                id: `PROD-CON-${i}`,
                name: `Concurrent Product ${i}`,
                timestamp: Date.now()
            },
            locationData: {
                id: 'CERT-HALAL-001',
                name: 'Test Location'
            }
        }, { timeout: TIMEOUT });
        
        const startTime = Date.now();
        concurrentPromises.push(
            promise.then(() => ({
                index: i,
                latency: Date.now() - startTime,
                success: true
            })).catch((error) => ({
                index: i,
                latency: Date.now() - startTime,
                success: false,
                error: error.message
            }))
        );
    }
    
    const concurrentResultsAll = await Promise.all(concurrentPromises);
    const conTotalTime = Date.now() - conStart;
    const conSuccess = concurrentResultsAll.filter(r => r.success).length;
    const conAvgLatency = concurrentResultsAll.filter(r => r.success).reduce((sum, r) => sum + r.latency, 0) / conSuccess;
    const conTPS = (conSuccess / conTotalTime) * 1000;
    
    log(`\n   📈 Concurrent Test Results:`, 'cyan');
    log(`   ✅ Success: ${conSuccess}/${concurrentCount}`, conSuccess === concurrentCount ? 'green' : 'yellow');
    log(`   ⏱️  Total Time: ${conTotalTime}ms`, 'cyan');
    log(`   ⚡ TPS: ${conTPS.toFixed(2)}`, 'green');
    log(`   📊 Avg Latency: ${conAvgLatency.toFixed(2)}ms`, 'cyan');
    
    // Test 5: Mine block to confirm
    log('\n📊 Test 5: Mine Pending Blocks', 'yellow');
    try {
        const mineStart = Date.now();
        const response = await axios.get(`${BASE_URL}/api/mine?minerAddress=Stress-Test-Miner`, { timeout: TIMEOUT });
        const mineTime = Date.now() - mineStart;
        
        if (response.data.success) {
            log(`   ✅ Block #${response.data.block.index} mined!`, 'green');
            log(`   ⏱️  Mining Time: ${mineTime}ms`, 'cyan');
            log(`   🔨 Nonce: ${response.data.block.nonce}`, 'cyan');
        }
    } catch (error) {
        log(`   ❌ Mining failed: ${error.message}`, 'red');
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 STRESS TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`
    ┌─────────────────────────────────────────────────┐
    │  Metric                    | Value              │
    ├─────────────────────────────────────────────────┤
    │  Sequential TPS            | ${seqTPS.toFixed(2)}                │
    │  Sequential Success Rate   | ${((seqSuccess/txCount)*100).toFixed(1)}%                │
    │  Concurrent TPS            | ${conTPS.toFixed(2)}                │
    │  Concurrent Success Rate   | ${((conSuccess/concurrentCount)*100).toFixed(1)}%                │
    │  Avg Latency (Seq)         | ${seqAvgLatency.toFixed(2)}ms              │
    │  Avg Latency (Con)         | ${conAvgLatency.toFixed(2)}ms              │
    └─────────────────────────────────────────────────┘
    `, 'green');
    
    log('✅ Stress test completed!', 'green');
}

// Run the test
runStressTest().catch(error => {
    log(`\n❌ Stress test failed: ${error.message}`, 'red');
    log('\n📌 Troubleshooting:', 'yellow');
    log('   1. Make sure server is running: npm start', 'cyan');
    log('   2. Check if port 3000 is available', 'cyan');
    log('   3. Run in new terminal while server runs', 'cyan');
});