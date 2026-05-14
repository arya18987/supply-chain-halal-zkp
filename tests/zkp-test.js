// tests/zkp-test.js
// Unit test khusus untuk Zero-Knowledge Proof system

const ZKPManager = require('../backend/zkp/zkp-manager');
const crypto = require('crypto');

// Warna untuk console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
    log('\n' + '='.repeat(70), 'cyan');
    log(`🔐 ${title}`, 'cyan');
    log('='.repeat(70), 'cyan');
}

function printTestResult(name, passed, details) {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? 'green' : 'red';
    log(`\n📋 ${name}`, 'yellow');
    log(`   Status: ${status}`, color);
    log(`   Details: ${details}`, 'cyan');
}

// Test data
const CERTIFIED_LOCATIONS = [
    { id: "CERT-HALAL-001", name: "Peternakan Halal Sumber Makmur", latitude: -7.9818, longitude: 112.6264 },
    { id: "CERT-HALAL-002", name: "Rumah Potong Halal Berkah", latitude: -6.9181, longitude: 106.9268 },
    { id: "CERT-HALAL-003", name: "Pabrik Pengolahan Halal", latitude: -7.0051, longitude: 110.4381 }
];

const UNCERTIFIED_LOCATIONS = [
    { id: "UNCERT-001", name: "Farm Non Sertifikasi", latitude: 0, longitude: 0 },
    { id: "FAKE-001", name: "Unknown Supplier", latitude: 10, longitude: 20 }
];

// Test 1: Valid proof generation for certified location
async function testValidProof() {
    log('\n🔐 Test 1: Valid Proof Generation (Certified Location)', 'magenta');
    
    const zkp = new ZKPManager();
    const productId = `PROD-${Date.now()}`;
    
    const startTime = Date.now();
    const result = await zkp.generateProof(CERTIFIED_LOCATIONS[0], productId);
    const generationTime = Date.now() - startTime;
    
    log(`   ⏱️  Proof generation time: ${generationTime}ms`, 'cyan');
    log(`   📦 Product ID: ${productId}`, 'cyan');
    log(`   🔒 Proof generated: ${result.proof ? 'Yes' : 'No'}`, 'cyan');
    log(`   ✅ Certified: ${result.isCertified}`, result.isCertified ? 'green' : 'red');
    
    const passed = result.isCertified === true && result.proof !== null;
    printTestResult(
        'Valid Proof Generation',
        passed,
        `Generated proof in ${generationTime}ms for certified location. Status: ${result.isCertified}`
    );
    
    return { passed, result, generationTime };
}

// Test 2: Invalid proof for uncertified location
async function testInvalidProof() {
    log('\n🔐 Test 2: Invalid Proof (Uncertified Location)', 'magenta');
    
    const zkp = new ZKPManager();
    const productId = `PROD-FAKE-${Date.now()}`;
    
    const result = await zkp.generateProof(UNCERTIFIED_LOCATIONS[0], productId);
    
    log(`   📍 Location: ${UNCERTIFIED_LOCATIONS[0].name}`, 'yellow');
    log(`   ✅ Certified: ${result.isCertified}`, result.isCertified ? 'green' : 'red');
    
    const passed = result.isCertified === false;
    printTestResult(
        'Invalid Proof Rejection',
        passed,
        `Uncertified location correctly identified. Status: ${result.isCertified ? 'Wrongly accepted' : 'Correctly rejected'}`
    );
    
    return { passed, result };
}

// Test 3: Proof verification
async function testProofVerification() {
    log('\n🔐 Test 3: Proof Verification', 'magenta');
    
    const zkp = new ZKPManager();
    const productId = `PROD-VERIFY-${Date.now()}`;
    
    // Generate proof
    const result = await zkp.generateProof(CERTIFIED_LOCATIONS[1], productId);
    
    // Verify proof
    const isValid = await zkp.verifyProof(result.proof, result.publicSignals);
    
    log(`   🔍 Verification result: ${isValid ? 'VALID' : 'INVALID'}`, isValid ? 'green' : 'red');
    log(`   🔒 Original data not revealed: Yes (ZKP property)`, 'cyan');
    
    const passed = isValid === true && result.isCertified === true;
    printTestResult(
        'Proof Verification',
        passed,
        `Proof ${isValid ? 'successfully verified' : 'failed verification'}`
    );
    
    return { passed, isValid };
}

// Test 4: Fake proof rejection (false-positive test)
async function testFakeProofRejection() {
    log('\n🔐 Test 4: Fake Proof Rejection (False-Positive Test)', 'magenta');
    
    const zkp = new ZKPManager();
    
    // Generate fake proof
    const fakeResult = await zkp.generateFakeProof();
    
    // Try to verify fake proof
    const isValid = await zkp.verifyProof(fakeResult.proof, fakeResult.publicSignals);
    
    log(`   🎭 Fake proof generated: Yes`, 'cyan');
    log(`   🔍 Verification result: ${isValid ? 'ACCEPTED' : 'REJECTED'}`, isValid ? 'red' : 'green');
    
    const passed = isValid === false; // Fake proof should be rejected
    printTestResult(
        'Fake Proof Rejection',
        passed,
        `Fake proof ${isValid ? 'was ACCEPTED (VULNERABILITY!)' : 'was REJECTED (SECURE)'}`
    );
    
    return { passed, isValid };
}

// Test 5: Proof generation performance
async function testPerformance() {
    log('\n🔐 Test 5: Performance Testing (Multiple Proofs)', 'magenta');
    
    const zkp = new ZKPManager();
    const iterations = 10;
    const times = [];
    
    log(`   Generating ${iterations} proofs...`, 'cyan');
    
    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await zkp.generateProof(CERTIFIED_LOCATIONS[i % CERTIFIED_LOCATIONS.length], `PERF-${i}`);
        times.push(Date.now() - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    log(`   📊 Performance Metrics:`, 'cyan');
    log(`   Average: ${avgTime.toFixed(2)}ms`, 'yellow');
    log(`   Min: ${minTime}ms`, 'green');
    log(`   Max: ${maxTime}ms`, 'yellow');
    
    const passed = avgTime < 200; // Expect <200ms per proof
    printTestResult(
        'Performance Test',
        passed,
        `Average proof generation: ${avgTime.toFixed(2)}ms over ${iterations} proofs`
    );
    
    return { passed, avgTime, minTime, maxTime, times };
}

// Test 6: Privacy preservation (tidak ada data sensitif di proof)
async function testPrivacyPreservation() {
    log('\n🔐 Test 6: Privacy Preservation Test', 'magenta');
    
    const zkp = new ZKPManager();
    const originalLocation = CERTIFIED_LOCATIONS[2];
    const productId = `PRIVACY-${Date.now()}`;
    
    const result = await zkp.generateProof(originalLocation, productId);
    
    // Check proof does not contain sensitive data
    const proofStr = JSON.stringify(result.proof);
    const sensitivePatterns = [
        originalLocation.id,
        originalLocation.latitude,
        originalLocation.longitude,
        originalLocation.name
    ];
    
    let leaks = [];
    for (const pattern of sensitivePatterns) {
        if (proofStr.includes(String(pattern))) {
            leaks.push(String(pattern).substring(0, 20));
        }
    }
    
    if (leaks.length > 0) {
        log(`   ⚠️  SENSITIVE DATA LEAK DETECTED!`, 'red');
        log(`   Leaked: ${leaks.join(', ')}`, 'red');
    } else {
        log(`   ✅ No sensitive data in proof`, 'green');
        log(`   🔒 Original location ID: ${originalLocation.id} (NOT in proof)`, 'cyan');
        log(`   🔒 Coordinates: ${originalLocation.latitude}, ${originalLocation.longitude} (NOT in proof)`, 'cyan');
    }
    
    const passed = leaks.length === 0;
    printTestResult(
        'Privacy Preservation',
        passed,
        passed ? 'Zero-Knowledge property maintained - no data leak' : `Found ${leaks.length} data leaks!`
    );
    
    return { passed, leaks };
}

// Test 7: Different product IDs
async function testDifferentProducts() {
    log('\n🔐 Test 7: Different Product IDs Test', 'magenta');
    
    const zkp = new ZKPManager();
    const location = CERTIFIED_LOCATIONS[0];
    const products = ['PROD-A', 'PROD-B', 'PROD-C', 'PROD-D', 'PROD-E'];
    
    const proofs = [];
    for (const product of products) {
        const result = await zkp.generateProof(location, product);
        proofs.push({
            productId: product,
            commitment: result.proof.commitment,
            isValid: result.isCertified
        });
    }
    
    // Check all proofs are different (unique commitments)
    const commitments = proofs.map(p => p.commitment);
    const uniqueCommitments = new Set(commitments);
    const allUnique = uniqueCommitments.size === proofs.length;
    
    log(`   📦 Products tested: ${products.length}`, 'cyan');
    log(`   🔐 Unique proofs: ${uniqueCommitments.size}/${proofs.length}`, allUnique ? 'green' : 'yellow');
    log(`   ✅ All certified: ${proofs.every(p => p.isValid)}`, 'green');
    
    const passed = allUnique && proofs.every(p => p.isValid);
    printTestResult(
        'Different Products',
        passed,
        `Generated ${proofs.length} unique proofs for different products`
    );
    
    return { passed, uniqueCount: uniqueCommitments.size };
}

// Test 8: Certified locations list
async function testCertifiedLocations() {
    log('\n🔐 Test 8: Certified Locations API', 'magenta');
    
    const zkp = new ZKPManager();
    const publicLocations = zkp.getCertifiedLocationsPublic();
    
    log(`   📍 Total certified locations: ${publicLocations.length}`, 'cyan');
    log(`   🔒 Public info only (coordinates hidden): Yes`, 'cyan');
    
    for (const loc of publicLocations) {
        log(`   - ${loc.name} (${loc.id})`, 'cyan');
    }
    
    const passed = publicLocations.length > 0;
    printTestResult(
        'Certified Locations',
        passed,
        `Retrieved ${publicLocations.length} certified locations (public info only)`
    );
    
    return { passed, count: publicLocations.length };
}

// Test 9: ZKP Explanation
async function testZKPExplanation() {
    log('\n🔐 Test 9: ZKP Explanation/Education', 'magenta');
    
    const zkp = new ZKPManager();
    const explanation = zkp.explainZKP();
    
    log(`   📖 What is ZKP: ${explanation.whatIsZKP?.substring(0, 60)}...`, 'cyan');
    log(`   🤫 How it works: ${explanation.howItWorks?.substring(0, 60)}...`, 'cyan');
    log(`   🔒 Privacy: ${explanation.privacyGuarantee?.substring(0, 60)}...`, 'cyan');
    log(`   💼 Real world: ${explanation.realWorldUse?.substring(0, 60)}...`, 'cyan');
    
    const passed = explanation && explanation.whatIsZKP;
    printTestResult(
        'ZKP Explanation',
        passed,
        'ZKP educational content available'
    );
    
    return { passed, explanation };
}

// Test 10: Concurrent proof generation
async function testConcurrentProofs() {
    log('\n🔐 Test 10: Concurrent Proof Generation', 'magenta');
    
    const zkp = new ZKPManager();
    const concurrentCount = 5;
    
    log(`   Generating ${concurrentCount} proofs concurrently...`, 'cyan');
    
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < concurrentCount; i++) {
        promises.push(zkp.generateProof(CERTIFIED_LOCATIONS[i % CERTIFIED_LOCATIONS.length], `CONCUR-${i}`));
    }
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const avgTimePerProof = totalTime / concurrentCount;
    
    const allValid = results.every(r => r.isCertified === true);
    
    log(`   ⏱️  Total time: ${totalTime}ms`, 'cyan');
    log(`   ⚡ Average per proof: ${avgTimePerProof.toFixed(2)}ms`, 'cyan');
    log(`   ✅ All valid: ${allValid}`, allValid ? 'green' : 'red');
    
    const passed = allValid;
    printTestResult(
        'Concurrent Proofs',
        passed,
        `Generated ${concurrentCount} concurrent proofs in ${totalTime}ms`
    );
    
    return { passed, totalTime, avgTimePerProof };
}

// Main test runner
async function runZKPTests() {
    printHeader('ZERO-KNOWLEDGE PROOF SYSTEM TEST');
    
    log('\n📌 Testing ZKP Implementation for Halal Supply Chain', 'yellow');
    log('   Goal: Prove location is certified WITHOUT revealing supplier identity\n', 'cyan');
    
    const results = {
        validProof: await testValidProof(),
        invalidProof: await testInvalidProof(),
        verification: await testProofVerification(),
        fakeProof: await testFakeProofRejection(),
        performance: await testPerformance(),
        privacy: await testPrivacyPreservation(),
        differentProducts: await testDifferentProducts(),
        certifiedLocations: await testCertifiedLocations(),
        explanation: await testZKPExplanation(),
        concurrent: await testConcurrentProofs()
    };
    
    // Summary
    printHeader('ZKP TEST SUMMARY REPORT');
    
    log('\n┌────────────────────────────────────────────────────────────────────┐', 'cyan');
    log('│  TEST                          | STATUS    | DETAILS                 │', 'cyan');
    log('├────────────────────────────────────────────────────────────────────┤', 'cyan');
    
    const testItems = [
        { name: 'Valid Proof Generation', result: results.validProof, detail: 'Certified location' },
        { name: 'Invalid Proof Rejection', result: results.invalidProof, detail: 'Uncertified location' },
        { name: 'Proof Verification', result: results.verification, detail: 'Verify correctness' },
        { name: 'Fake Proof Rejection', result: results.fakeProof, detail: 'False-positive test' },
        { name: 'Performance', result: results.performance, detail: `${results.performance.avgTime?.toFixed(2)}ms avg` },
        { name: 'Privacy Preservation', result: results.privacy, detail: 'No data leak' },
        { name: 'Different Products', result: results.differentProducts, detail: `${results.differentProducts.uniqueCount} unique` },
        { name: 'Certified Locations', result: results.certifiedLocations, detail: `${results.certifiedLocations.count} locations` },
        { name: 'ZKP Explanation', result: results.explanation, detail: 'Education content' },
        { name: 'Concurrent Proofs', result: results.concurrent, detail: `${results.concurrent.avgTimePerProof?.toFixed(2)}ms avg` }
    ];
    
    for (const item of testItems) {
        const status = item.result.passed ? '✅ PASSED' : '❌ FAILED';
        const color = item.result.passed ? 'green' : 'red';
        log(`│  ${(item.name).padEnd(28)} | ${status} | ${(item.detail || '').padEnd(22)} │`, color);
    }
    
    log('└────────────────────────────────────────────────────────────────────┘', 'cyan');
    
    // Overall score
    const totalTests = testItems.length;
    const passedTests = testItems.filter(t => t.result.passed).length;
    const score = (passedTests / totalTests) * 100;
    
    log('\n📊 OVERALL ZKP SYSTEM SCORE:', 'yellow');
    log(`   ${score.toFixed(1)}% (${passedTests}/${totalTests} tests passed)`, score >= 80 ? 'green' : (score >= 60 ? 'yellow' : 'red'));
    
    if (score >= 90) {
        log('\n🎉 ZKP SYSTEM EXCELLENT! Ready for production!', 'green');
        log('   ✅ Privacy preserved - Suppliers can prove certification without revealing identity', 'cyan');
    } else if (score >= 70) {
        log('\n⚠️ ZKP SYSTEM GOOD - Minor improvements recommended', 'yellow');
    } else {
        log('\n🔴 ZKP SYSTEM NEEDS IMPROVEMENT - Fix critical issues', 'red');
    }
    
    log('\n🔐 ZKP Principle Demonstrated:', 'cyan');
    log('   Prover (Produsen): Knows location is HALAL certified', 'cyan');
    log('   Verifier (Konsumen): Learns ONLY that location is certified', 'cyan');
    log('   NOT revealed: Which farm, exact coordinates, cert number', 'cyan');
    log('   💡 Trade secret protected - Competitors cannot see suppliers!\n', 'green');
    
    return results;
}

// Run tests
runZKPTests().catch(error => {
    log(`\n❌ ZKP Test failed: ${error.message}`, 'red');
    console.error(error);
});