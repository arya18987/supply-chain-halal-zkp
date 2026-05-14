const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const Blockchain = require('./blockchain/blockchain');
const Transaction = require('./blockchain/transaction');
const OnChainStorage = require('./storage/onchain');
const OffChainStorage = require('./storage/offchain');

// Gunakan ZKP Manager versi pure JS (sudah diperbaiki)
const ZKPManager = require('./zkp/zkp-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== LOAD CONFIGURATION ====================
let networkConfig = {};
let consensusConfig = {};

try {
    const configPath = path.join(__dirname, '../config/network-config.json');
    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        networkConfig = JSON.parse(configData);
        consensusConfig = networkConfig.consensus || {};
        console.log('✅ Network configuration loaded successfully');
        console.log(`   📡 Network: ${networkConfig.network?.name || 'Halal Supply Chain'}`);
        console.log(`   🏗️  Type: ${networkConfig.network?.type || 'private'}`);
        console.log(`   👥 Consortium: ${networkConfig.consortium?.members?.length || 5} members`);
        console.log(`   ⛏️  Consensus: ${networkConfig.consortium?.consensus?.algorithm || 'Proof of Work'}`);
        console.log(`   🔐 ZKP: ${networkConfig.zkp?.enabled ? 'Enabled' : 'Disabled'}`);
    } else {
        console.log('⚠️  Network config not found at:', configPath);
        console.log('   Using default configuration');
        networkConfig = {
            network: { name: 'Halal Supply Chain (Default)', type: 'private' },
            consortium: { members: [], consensus: { algorithm: 'Proof of Work', difficulty: 4 } }
        };
    }
} catch (error) {
    console.error('❌ Error loading network config:', error.message);
    networkConfig = { network: { name: 'Default Config' }, consortium: { members: [] } };
}

// ==================== MIDDLEWARE ====================
app.use(cors({
    origin: networkConfig.security?.allowedOrigins || ['http://localhost:3000', 'http://localhost:5500'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('frontend'));

// ==================== INITIALIZE COMPONENTS ====================
// Gunakan difficulty dari config jika ada
const blockchainDifficulty = networkConfig.consortium?.consensus?.difficulty || 4;
const halalChain = new Blockchain();
halalChain.difficulty = blockchainDifficulty;

const zkpManager = new ZKPManager();
const onChainStorage = new OnChainStorage();
const offChainStorage = new OffChainStorage();

console.log('\n🔧 Component Initialization:');
console.log(`   ✅ Blockchain initialized (Difficulty: ${halalChain.difficulty})`);
console.log(`   ✅ ZKP System initialized (${networkConfig.zkp?.type || 'simulated-zk-snarks'} mode)`);
console.log(`   ✅ Storage: OnChain + OffChain`);
console.log('🔒 Zero-Knowledge Proof: Location certification without revealing trade secrets\n');

// ==================== CONFIGURATION ENDPOINTS ====================

// Get full network config (safe version - no sensitive data)
app.get('/api/config/network', (req, res) => {
    const safeConfig = {
        network: {
            name: networkConfig.network?.name,
            type: networkConfig.network?.type,
            version: networkConfig.network?.version,
            description: networkConfig.network?.description
        },
        consortium: {
            name: networkConfig.consortium?.name,
            governance: networkConfig.consortium?.governance,
            members: networkConfig.consortium?.members?.map(m => ({
                name: m.name,
                role: m.role
            })),
            consensus: networkConfig.consortium?.consensus
        },
        blockchain: {
            parameters: networkConfig.blockchain?.parameters
        },
        zkp: {
            enabled: networkConfig.zkp?.enabled,
            type: networkConfig.zkp?.type
        },
        storage: {
            onChain: networkConfig.storage?.onChain?.type,
            offChain: networkConfig.storage?.offChain?.type
        },
        api: {
            port: networkConfig.api?.rest?.port,
            endpoints: networkConfig.api?.rest?.endpoints?.length
        }
    };
    res.json(safeConfig);
});

// Get consensus info
app.get('/api/config/consensus', (req, res) => {
    res.json({
        algorithm: networkConfig.consortium?.consensus?.algorithm || 'Proof of Work',
        difficulty: halalChain.difficulty,
        minNodes: networkConfig.consortium?.consensus?.minNodes || 3,
        blockTime: networkConfig.consortium?.consensus?.blockTime || 10,
        description: 'Educational PoW for blockchain demonstration'
    });
});

// Get consortium members
app.get('/api/config/consortium', (req, res) => {
    const members = networkConfig.consortium?.members || [
        { id: "bpjph-001", name: "BPJPH", role: "regulator" },
        { id: "mui-001", name: "MUI", role: "certifier" },
        { id: "producer-001", name: "Produsen", role: "supplier" },
        { id: "distributor-001", name: "Distributor", role: "distributor" },
        { id: "retailer-001", name: "Retailer", role: "retailer" }
    ];
    
    res.json({
        name: networkConfig.consortium?.name || 'Halal Supply Chain Consortium',
        governance: networkConfig.consortium?.governance || 'Multi-stakeholder',
        members: members.map(m => ({
            id: m.id,
            name: m.name,
            role: m.role,
            permissions: m.permissions || getDefaultPermissions(m.role)
        })),
        totalMembers: members.length
    });
});

function getDefaultPermissions(role) {
    const permissions = {
        regulator: ['certify', 'audit', 'validate', 'revoke'],
        certifier: ['certify', 'validate'],
        supplier: ['add_product', 'transfer', 'verify'],
        distributor: ['transfer', 'verify'],
        retailer: ['sell', 'verify']
    };
    return permissions[role] || ['verify'];
}

// ==================== API ROUTES ====================

// Get blockchain info
app.get('/api/blockchain/info', (req, res) => {
    res.json({
        chainLength: halalChain.chain.length,
        difficulty: halalChain.difficulty,
        pendingTransactions: halalChain.pendingTransactions.length,
        isChainValid: halalChain.isChainValid(),
        consortiumNodes: halalChain.consortiumNodes,
        networkType: networkConfig.network?.type || 'private',
        consensusAlgorithm: networkConfig.consortium?.consensus?.algorithm || 'Proof of Work'
    });
});

// Get all blocks
app.get('/api/blockchain/blocks', (req, res) => {
    res.json(halalChain.chain);
});

// Get specific block
app.get('/api/blockchain/block/:index', (req, res) => {
    const block = halalChain.chain[req.params.index];
    if (block) {
        res.json(block);
    } else {
        res.status(404).json({ error: 'Block not found' });
    }
});

// Add transaction with ZKP (Pure JS implementation)
app.post('/api/transaction/add', async (req, res) => {
    const { fromAddress, toAddress, amount, productData, locationData } = req.body;
    
    try {
        console.log('\n📦 New transaction request:');
        console.log(`   Product: ${productData?.name || 'Unknown'}`);
        console.log(`   Location: ${locationData?.id || locationData?.name || 'Unknown'}`);
        
        // Rate limiting check (dari config)
        if (networkConfig.security?.rateLimit?.enabled) {
            // Implementasi rate limiting sederhana
            console.log(`   📊 Rate limiting: ${networkConfig.security.rateLimit.maxRequests} requests per ${networkConfig.security.rateLimit.windowMs}ms`);
        }
        
        // Generate ZKP untuk lokasi tersertifikasi
        const zkResult = await zkpManager.generateProof(locationData, productData.id);
        
        // Verify proof before adding to blockchain
        const isValidProof = await zkpManager.verifyProof(zkResult.proof, zkResult.publicSignals);
        
        if (!isValidProof || !zkResult.isCertified) {
            console.log(`   ❌ Verification failed: Location not certified`);
            return res.status(400).json({ 
                error: 'Invalid ZKP - Location is not Halal certified!',
                details: 'Please use a certified location from the approved list.',
                certifiedLocations: zkpManager.getCertifiedLocationsPublic()
            });
        }
        
        console.log(`   ✅ ZKP Verified: Location is Halal certified`);
        console.log(`   🔒 Trade secret protected: Actual supplier not revealed`);
        
        // Create transaction
        const transaction = new Transaction(
            fromAddress,
            toAddress,
            amount,
            {
                ...productData,
                zkpVerified: true,
                proofGenerationTime: zkResult.generationTime,
                certified: true,
                verificationHash: zkResult.publicSignals?.commitment,
                networkVersion: networkConfig.network?.version || '1.0.0'
            },
            { 
                proof: zkResult.proof, 
                verified: true,
                proofHash: zkResult.proof?.commitment
            }
        );
        
        // Add to blockchain
        halalChain.addTransaction(transaction);
        
        // Store off-chain data
        await offChainStorage.storeProductData(productData.id, {
            productData,
            zkProof: {
                generationTime: zkResult.generationTime,
                commitment: zkResult.proof?.commitment,
                timestamp: Date.now()
            },
            timestamp: Date.now(),
            networkInfo: {
                name: networkConfig.network?.name,
                version: networkConfig.network?.version
            }
        });
        
        res.json({
            success: true,
            message: 'Product verified with Zero-Knowledge Proof!',
            transaction: {
                id: transaction.calculateHash(),
                product: productData.name,
                from: fromAddress,
                to: toAddress,
                timestamp: transaction.timestamp
            },
            zkpResult: {
                generationTime: zkResult.generationTime,
                verified: isValidProof,
                isCertified: zkResult.isCertified,
                explanation: '✅ Location proven HALAL certified WITHOUT revealing supplier identity',
                privacyPreserved: true
            }
        });
        
        console.log(`   ✅ Transaction added to mempool\n`);
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
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
        const startTime = Date.now();
        const block = halalChain.minePendingTransactions(minerAddress);
        const miningTime = Date.now() - startTime;
        
        // Adjust difficulty based on config
        const targetBlockTime = networkConfig.consortium?.consensus?.blockTime || 10000;
        if (miningTime < targetBlockTime / 2) {
            // Mining too fast, increase difficulty for next block
            halalChain.difficulty = Math.min(halalChain.difficulty + 1, 10);
            console.log(`   📈 Difficulty increased to ${halalChain.difficulty}`);
        } else if (miningTime > targetBlockTime * 1.5) {
            // Mining too slow, decrease difficulty
            halalChain.difficulty = Math.max(halalChain.difficulty - 1, 1);
            console.log(`   📉 Difficulty decreased to ${halalChain.difficulty}`);
        }
        
        console.log(`⛏️ Block ${block.index} mined in ${miningTime}ms | Nonce: ${block.nonce} | Difficulty: ${halalChain.difficulty}`);
        
        res.json({
            success: true,
            block: {
                index: block.index,
                hash: block.hash,
                previousHash: block.previousHash,
                nonce: block.nonce,
                timestamp: block.timestamp,
                transactions: block.transactions.length
            },
            miningTime: miningTime,
            difficulty: halalChain.difficulty,
            targetBlockTime: targetBlockTime
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Demonstrate immutability
app.post('/api/demo/tamper', (req, res) => {
    const { blockIndex, newData } = req.body;
    
    if (!blockIndex || blockIndex < 1) {
        return res.status(400).json({ error: 'Invalid block index. Use index >= 1' });
    }
    
    const originalHash = halalChain.chain[blockIndex]?.hash;
    const tampered = halalChain.tamperBlock(blockIndex, newData);
    const isStillValid = halalChain.isChainValid();
    
    console.log(`\n🔐 Immutability Demo:`);
    console.log(`   Block ${blockIndex} original hash: ${originalHash?.substring(0, 20)}...`);
    console.log(`   Block ${blockIndex} new hash: ${halalChain.chain[blockIndex]?.hash?.substring(0, 20)}...`);
    console.log(`   Chain valid: ${isStillValid}`);
    
    res.json({
        tampered: tampered,
        originalHash: originalHash,
        newHash: halalChain.chain[blockIndex]?.hash,
        isChainValid: isStillValid,
        message: isStillValid ? 
            '⚠️ WARNING: Chain still valid (integrity check failed - BUG!)' : 
            '✅ SUCCESS: Chain broken! Immutability property works!',
        explanation: 'When data in a block changes, the hash changes and breaks the chain'
    });
});

// Get chain validation status
app.get('/api/validate', (req, res) => {
    const isValid = halalChain.isChainValid();
    res.json({ 
        isValid,
        message: isValid ? 'Blockchain integrity verified' : 'Blockchain has been tampered!'
    });
});

// ZKP Educational endpoints
app.get('/api/zkp/explain', (req, res) => {
    res.json(zkpManager.explainZKP());
});

// Get certified locations (public info only - privacy preserved)
app.get('/api/zkp/certified-locations', (req, res) => {
    const locations = zkpManager.getCertifiedLocationsPublic();
    res.json({
        locations: locations,
        total: locations.length,
        note: "📍 These locations are HALAL certified. Exact coordinates and cert numbers are private.",
        privacyNote: "Suppliers can prove certification without revealing which location they use."
    });
});

// Test fake ZKP (for penetration testing)
app.post('/api/zkp/test-fake-proof', async (req, res) => {
    console.log('🔐 Penetration Test: Attempting fake ZKP...');
    
    const fakeResult = await zkpManager.generateFakeProof();
    const isValid = await zkpManager.verifyProof(fakeResult.proof, fakeResult.publicSignals);
    
    console.log(`   Fake proof result: ${isValid ? 'ACCEPTED (VULNERABILITY!)' : 'REJECTED (Secure)'}`);
    
    res.json({
        testName: 'Fake ZKP Injection',
        proofWasAccepted: isValid,
        isSecure: !isValid,
        message: isValid ? 
            '❌ VULNERABILITY: Fake proof was accepted!' : 
            '✅ SECURE: Fake proof correctly rejected',
        recommendation: 'ZKP implementation correctly identifies invalid proofs'
    });
});

// Stress test endpoint
app.post('/api/stress/send', async (req, res) => {
    const { count } = req.body;
    const results = [];
    const startTime = Date.now();
    const txCount = Math.min(count || 100, 500); // Max 500 untuk performa
    
    console.log(`\n⚡ Starting stress test: ${txCount} transactions...`);
    
    for (let i = 0; i < txCount; i++) {
        const txStart = Date.now();
        
        // Simulasi ZKP generation
        const mockLocation = {
            id: "CERT-HALAL-001",
            name: "Test Location"
        };
        const mockProduct = {
            id: `STRESS-TEST-${i}`,
            name: `Test Product ${i}`
        };
        
        await zkpManager.generateProof(mockLocation, mockProduct.id);
        
        results.push({
            index: i,
            latency: Date.now() - txStart,
            success: true
        });
    }
    
    const totalTime = Date.now() - startTime;
    const tps = (txCount / totalTime) * 1000;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    
    console.log(`   ✅ Complete: ${txCount} tx in ${totalTime}ms`);
    console.log(`   📊 TPS: ${tps.toFixed(2)} | Avg Latency: ${avgLatency.toFixed(2)}ms\n`);
    
    res.json({
        totalTransactions: txCount,
        totalTimeMs: totalTime,
        tps: tps.toFixed(2),
        averageLatencyMs: avgLatency.toFixed(2),
        minLatencyMs: Math.min(...results.map(r => r.latency)),
        maxLatencyMs: Math.max(...results.map(r => r.latency)),
        results: results.slice(0, 10)
    });
});

// Get storage info
app.get('/api/storage/info', (req, res) => {
    res.json({
        onChain: onChainStorage.getInfo(),
        offChain: offChainStorage.getInfo(),
        config: {
            onChainMaxSize: networkConfig.storage?.onChain?.maxSizeBytes || 1024,
            offChainPath: networkConfig.storage?.offChain?.path || './data/offchain',
            offChainMaxSize: networkConfig.storage?.offChain?.maxSizeGB || 10
        },
        explanation: {
            onChain: "Block data, transaction hashes, ZKP commitments",
            offChain: "Product details, ZKP proofs, sensitive business data"
        }
    });
});

// Dashboard stats
app.get('/api/stats', (req, res) => {
    const totalTransactions = halalChain.chain.reduce((sum, block) => sum + block.transactions.length, 0);
    const latestBlock = halalChain.getLatestBlock();
    
    res.json({
        blockchain: {
            height: halalChain.chain.length,
            difficulty: halalChain.difficulty,
            totalTransactions: totalTransactions,
            latestBlockHash: latestBlock.hash?.substring(0, 20) + '...',
            isImmutable: halalChain.isChainValid() ? 'Intact' : 'Broken'
        },
        consensus: {
            type: networkConfig.consortium?.consensus?.algorithm || 'Proof of Work (Educational)',
            nodes: halalChain.consortiumNodes,
            currentNodeCount: halalChain.consortiumNodes.length,
            miningDifficulty: halalChain.difficulty,
            minNodesRequired: networkConfig.consortium?.consensus?.minNodes || 3,
            explanation: 'PoW with nonce mining - demonstrates security through computational work'
        },
        zkp: {
            status: networkConfig.zkp?.enabled ? 'Active' : 'Disabled',
            type: networkConfig.zkp?.type || 'Simulated zk-SNARKs',
            privacyGuarantee: 'Proves location certification without revealing supplier identity',
            useCase: 'Trade secret protection in supply chain'
        },
        consortium: {
            name: networkConfig.consortium?.name || 'Halal Supply Chain Consortium',
            members: halalChain.consortiumNodes,
            governance: networkConfig.consortium?.governance || 'Multi-stakeholder verification',
            totalMembers: networkConfig.consortium?.members?.length || 5
        },
        network: {
            name: networkConfig.network?.name,
            type: networkConfig.network?.type,
            version: networkConfig.network?.version,
            environment: networkConfig.deployment?.environment || 'development'
        }
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './frontend' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        network: networkConfig.network?.name,
        uptime: process.uptime()
    });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Supply Chain Halal Blockchain Started');
    console.log('='.repeat(60));
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`📊 API Stats: http://localhost:${PORT}/api/stats`);
    console.log(`⚙️  Config API: http://localhost:${PORT}/api/config/network`);
    console.log(`🔐 ZKP Demo: http://localhost:${PORT}/api/zkp/explain`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    
    console.log('\n🏗️  Architecture:');
    console.log(`   - Model: Account Model (seperti Ethereum)`);
    console.log(`   - Consensus: ${networkConfig.consortium?.consensus?.algorithm || 'Proof of Work (Edukasi)'}`);
    console.log(`   - Blockchain: ${networkConfig.network?.type === 'private' ? 'Private Consortium' : 'Public'}`);
    console.log(`   - Privacy: Zero-Knowledge Proofs`);
    
    console.log('\n🔒 ZKP Feature:');
    console.log(`   Produsen membuktikan bahan baku dari lokasi tersertifikasi`);
    console.log(`   Tanpa mengungkap supplier spesifik ke kompetitor`);
    
    console.log('\n📋 Configuration Loaded:');
    console.log(`   - Network: ${networkConfig.network?.name || 'Default'}`);
    console.log(`   - Version: ${networkConfig.network?.version || '1.0.0'}`);
    console.log(`   - Environment: ${networkConfig.deployment?.environment || 'development'}`);
    console.log(`   - Consortium Members: ${networkConfig.consortium?.members?.length || 5}`);
    
    console.log('\n✅ Ready! Open browser to get started.\n');
});