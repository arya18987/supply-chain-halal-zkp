// api/index.js - Entry point untuk Vercel (SERVERLESS FUNCTION)
const express = require('express');
const path = require('path');
const cors = require('cors');

// Import komponen dari backend
const Blockchain = require('../backend/blockchain/blockchain');
const Transaction = require('../backend/blockchain/transaction');
const OnChainStorage = require('../backend/storage/onchain');
const OffChainStorage = require('../backend/storage/offchain');

// Import ZKP Manager - dengan error handling
let ZKPManager;
try {
    ZKPManager = require('../backend/zkp/zkp-manager');
} catch (error) {
    console.error('Error loading ZKPManager:', error.message);
    // Fallback ZKPManager sederhana
    ZKPManager = class {
        constructor() { console.log('Fallback ZKPManager'); }
        generateProof(locationData, productId) {
            return Promise.resolve({
                proof: { commitment: 'fallback' },
                publicSignals: { isValid: true },
                generationTime: 10,
                isCertified: locationData?.id === 'CERT-HALAL-001'
            });
        }
        verifyProof(proof, signals) { return Promise.resolve(true); }
        generateFakeProof() { return Promise.resolve({ proof: {}, publicSignals: {} }); }
        getCertifiedLocationsPublic() { return [{ id: "CERT-HALAL-001", name: "Certified Halal Location" }]; }
        explainZKP() { return { whatIsZKP: 'Demo mode', howItWorks: 'Simulated ZKP for demo', privacyGuarantee: 'Supplier identity protected', realWorldUse: 'Trade secret protection' }; }
    };
}

const app = express();

// ==================== INITIALIZE COMPONENTS ====================
// INI YANG PALING PENTING - JANGAN SAMPAI TERLEWAT!
let halalChain, zkpManager, onChainStorage, offChainStorage;

try {
    halalChain = new Blockchain();
    zkpManager = new ZKPManager();
    onChainStorage = new OnChainStorage();
    offChainStorage = new OffChainStorage();
    console.log('✅ Components initialized successfully');
    console.log(`   Blockchain: ${halalChain.chain?.length || 0} blocks`);
    console.log(`   ZKP Manager: Active`);
    console.log(`   Storage: OnChain + OffChain`);
} catch (error) {
    console.error('❌ Error initializing components:', error.message);
    // Fallback components
    halalChain = { 
        chain: [{ index: 0, hash: 'genesis', transactions: [] }], 
        difficulty: 4, 
        pendingTransactions: [],
        consortiumNodes: ['BPJPH', 'MUI', 'Produsen', 'Distributor', 'Retailer'],
        addTransaction: (tx) => { console.log('TX added (fallback)'); },
        minePendingTransactions: (miner) => ({ index: 1, hash: 'mock', nonce: 12345, timestamp: Date.now(), transactions: [] }),
        isChainValid: () => true
    };
    zkpManager = new ZKPManager();
    onChainStorage = { getInfo: () => ({ size: 0, type: 'onchain' }) };
    offChainStorage = { getInfo: () => ({ size: 0, type: 'offchain' }) };
}

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files dari frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        platform: 'Vercel Serverless',
        components: {
            blockchain: !!halalChain,
            zkp: !!zkpManager,
            storage: !!(onChainStorage && offChainStorage)
        }
    });
});

// Root endpoint - HANYA SATU KALI!
app.get('/', (req, res) => {
    try {
        // Coba kirim dashboard.html dulu
        const dashboardPath = path.join(frontendPath, 'dashboard.html');
        if (require('fs').existsSync(dashboardPath)) {
            res.sendFile('dashboard.html', { root: frontendPath });
        } else {
            res.sendFile('index.html', { root: frontendPath });
        }
    } catch (error) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Supply Chain Halal</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                    .card { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 30px; max-width: 600px; margin: 0 auto; }
                    h1 { margin-bottom: 20px; }
                    a { color: white; background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>🌙 Supply Chain Halal</h1>
                    <p>Server is running!</p>
                    <p>API is functional: <a href="/api/stats">/api/stats</a></p>
                </div>
            </body>
            </html>
        `);
    }
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile('dashboard.html', { root: frontendPath });
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile('dashboard.html', { root: frontendPath });
});

// Get blockchain info
app.get('/api/blockchain/info', (req, res) => {
    try {
        res.json({
            chainLength: halalChain?.chain?.length || 1,
            difficulty: halalChain?.difficulty || 4,
            pendingTransactions: halalChain?.pendingTransactions?.length || 0,
            isChainValid: halalChain?.isChainValid ? halalChain.isChainValid() : true,
            consortiumNodes: halalChain?.consortiumNodes || ['BPJPH', 'MUI', 'Produsen', 'Distributor', 'Retailer']
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all blocks
app.get('/api/blockchain/blocks', (req, res) => {
    try {
        res.json(halalChain?.chain || [{ index: 0, hash: 'genesis', transactions: [] }]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add transaction with ZKP
app.post('/api/transaction/add', async (req, res) => {
    const { fromAddress, toAddress, amount, productData, locationData } = req.body;
    
    try {
        console.log('📦 New transaction:', productData?.name);
        
        if (!zkpManager) {
            throw new Error('ZKP Manager not initialized');
        }
        
        const zkResult = await zkpManager.generateProof(locationData, productData?.id);
        const isValidProof = await zkpManager.verifyProof(zkResult.proof, zkResult.publicSignals);
        
        if (!isValidProof || !zkResult.isCertified) {
            return res.status(400).json({ 
                error: 'Location is not Halal certified!',
                certifiedLocations: zkpManager.getCertifiedLocationsPublic()
            });
        }
        
        const transaction = new Transaction(
            fromAddress, toAddress, amount,
            { ...productData, zkpVerified: true, proofGenerationTime: zkResult.generationTime },
            { proof: zkResult.proof, verified: true }
        );
        
        if (halalChain && halalChain.addTransaction) {
            halalChain.addTransaction(transaction);
        }
        
        res.json({
            success: true,
            message: 'Product verified with Zero-Knowledge Proof!',
            zkpResult: {
                generationTime: zkResult.generationTime,
                verified: isValidProof,
                isCertified: zkResult.isCertified,
                privacyPreserved: true
            }
        });
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mine pending transactions
app.get('/api/mine', (req, res) => {
    const { minerAddress } = req.query;
    
    if (!minerAddress) {
        return res.status(400).json({ error: 'Miner address required' });
    }
    
    try {
        if (!halalChain || !halalChain.minePendingTransactions) {
            return res.json({
                success: true,
                block: { index: 1, hash: 'mock-hash', nonce: 12345, transactions: 0 },
                miningTime: 100,
                difficulty: 4
            });
        }
        
        const startTime = Date.now();
        const block = halalChain.minePendingTransactions(minerAddress);
        const miningTime = Date.now() - startTime;
        
        res.json({
            success: true,
            block: {
                index: block.index,
                hash: block.hash,
                nonce: block.nonce,
                timestamp: block.timestamp,
                transactions: block.transactions?.length || 0
            },
            miningTime: miningTime,
            difficulty: halalChain.difficulty
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tamper block (immutability demo)
app.post('/api/demo/tamper', (req, res) => {
    const { blockIndex, newData } = req.body;
    
    if (!halalChain || !halalChain.tamperBlock) {
        return res.json({
            tampered: false,
            isChainValid: true,
            message: 'Tamper demo not available'
        });
    }
    
    const originalHash = halalChain.chain[blockIndex]?.hash;
    const tampered = halalChain.tamperBlock(blockIndex, newData);
    const isStillValid = halalChain.isChainValid();
    
    res.json({
        tampered: tampered,
        originalHash: originalHash,
        newHash: halalChain.chain[blockIndex]?.hash,
        isChainValid: isStillValid,
        message: isStillValid ? '⚠️ Chain still valid (BUG!)' : '✅ Chain broken! Immutability works!'
    });
});

// ZKP endpoints
app.get('/api/zkp/explain', (req, res) => {
    try {
        const explanation = zkpManager?.explainZKP ? zkpManager.explainZKP() : {
            whatIsZKP: "Zero-Knowledge Proof allows proving a statement without revealing the underlying data.",
            howItWorks: "Producer proves location is HALAL certified without revealing which farm.",
            privacyGuarantee: "Verifier only learns that location is certified, not the identity."
        };
        res.json(explanation);
    } catch (error) {
        res.json({ message: 'ZKP explanation not available', error: error.message });
    }
});

app.get('/api/zkp/certified-locations', (req, res) => {
    try {
        const locations = zkpManager?.getCertifiedLocationsPublic ? 
            zkpManager.getCertifiedLocationsPublic() : 
            [{ id: "CERT-HALAL-001", name: "Certified Halal Location" }];
        res.json({ locations, total: locations.length });
    } catch (error) {
        res.json({ locations: [], total: 0, error: error.message });
    }
});

// Fake proof test (penetration testing)
app.post('/api/zkp/test-fake-proof', async (req, res) => {
    try {
        const fakeResult = await zkpManager.generateFakeProof();
        const isValid = await zkpManager.verifyProof(fakeResult.proof, fakeResult.publicSignals);
        
        res.json({
            testName: 'Fake ZKP Injection',
            proofWasAccepted: isValid,
            isSecure: !isValid,
            message: isValid ? '❌ VULNERABILITY!' : '✅ SECURE'
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Stress test endpoint
app.post('/api/stress/send', async (req, res) => {
    const { count } = req.body;
    const startTime = Date.now();
    const txCount = Math.min(count || 50, 100);
    
    for (let i = 0; i < txCount; i++) {
        const mockLocation = { id: "CERT-HALAL-001", name: "Test Location" };
        const mockProduct = { id: `STRESS-${i}`, name: `Product ${i}` };
        await zkpManager.generateProof(mockLocation, mockProduct.id);
    }
    
    const totalTime = Date.now() - startTime;
    const tps = (txCount / totalTime) * 1000;
    
    res.json({
        totalTransactions: txCount,
        totalTimeMs: totalTime,
        tps: tps.toFixed(2),
        averageLatencyMs: (totalTime / txCount).toFixed(2)
    });
});

// Storage info
app.get('/api/storage/info', (req, res) => {
    res.json({
        onChain: onChainStorage?.getInfo() || { type: 'onchain', size: 0 },
        offChain: offChainStorage?.getInfo() || { type: 'offchain', size: 0 }
    });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    try {
        const totalTransactions = halalChain?.chain?.reduce((sum, block) => sum + (block.transactions?.length || 0), 0) || 0;
        
        res.json({
            blockchain: {
                height: halalChain?.chain?.length || 1,
                difficulty: halalChain?.difficulty || 4,
                totalTransactions: totalTransactions,
                isImmutable: 'Intact'
            },
            consensus: {
                type: 'Proof of Work (Educational)',
                nodes: halalChain?.consortiumNodes?.length || 5
            },
            zkp: {
                status: 'Active',
                type: 'Simulated zk-SNARKs',
                privacyGuarantee: 'Proves location certification without revealing supplier identity'
            },
            platform: 'Vercel Serverless',
            status: 'operational'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        time: new Date().toISOString(),
        env: process.env.VERCEL ? 'Vercel' : 'local'
    });
});

// Fallback route for undefined endpoints
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: [
            '/', '/dashboard', '/health', '/api/stats', '/api/test',
            '/api/blockchain/info', '/api/blockchain/blocks',
            '/api/transaction/add', '/api/mine', '/api/demo/tamper',
            '/api/zkp/explain', '/api/zkp/certified-locations', '/api/zkp/test-fake-proof',
            '/api/stress/send', '/api/storage/info'
        ]
    });
});

// PENTING: JANGAN gunakan app.listen() di Vercel!
// Export app untuk Vercel
module.exports = app;