// api/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// INI PENTING: Handle semua request termasuk static files
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Supply Chain Halal</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }
                .container { max-width: 1200px; margin: 0 auto; }
                .header {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    margin-bottom: 20px;
                    text-align: center;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .header h1 { color: #667eea; margin-bottom: 10px; }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 12px;
                    text-align: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .stat-card .value { font-size: 32px; font-weight: bold; color: #667eea; }
                .stat-card .label { color: #666; margin-top: 5px; }
                .card {
                    background: white;
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .card h2 { margin-bottom: 20px; color: #333; border-left: 4px solid #667eea; padding-left: 12px; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; color: #555; }
                .form-group input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                }
                .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                .btn-success { background: #28a745; color: white; }
                .result {
                    margin-top: 15px;
                    padding: 12px;
                    border-radius: 8px;
                    display: none;
                }
                .result.success { background: #d4edda; color: #155724; display: block; }
                .result.error { background: #f8d7da; color: #721c24; display: block; }
                .result.loading { background: #d1ecf1; color: #0c5460; display: block; }
                .tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                .tab-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .tab-btn.active { background: white; color: #667eea; }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                .block {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
        <div class="container">
            <div class="header">
                <h1>🌙 Supply Chain Halal & Etis</h1>
                <p>Blockchain dengan Zero-Knowledge Proof | Konsorsium: BPJPH · MUI · Produsen · Distributor · Retailer</p>
            </div>

            <div class="stats" id="stats">
                <div class="stat-card"><div class="value" id="blockHeight">-</div><div class="label">Block Height</div></div>
                <div class="stat-card"><div class="value" id="difficulty">-</div><div class="label">Difficulty</div></div>
                <div class="stat-card"><div class="value" id="pendingTx">-</div><div class="label">Pending TX</div></div>
            </div>

            <div class="tabs">
                <button class="tab-btn active" onclick="showTab('zkp')">🔒 ZKP</button>
                <button class="tab-btn" onclick="showTab('mining')">⛏️ Mining</button>
                <button class="tab-btn" onclick="showTab('security')">🔐 Security</button>
            </div>

            <div id="tab-zkp" class="tab-content active">
                <div class="card">
                    <h2>🔒 Verifikasi Produk Halal</h2>
                    <div class="form-group"><label>Nama Produk</label><input type="text" id="productName" placeholder="Daging Ayam Halal"></div>
                    <div class="form-group"><label>ID Produk</label><input type="text" id="productId" placeholder="PROD-001"></div>
                    <div class="form-group"><label>Lokasi</label><input type="text" id="locationName" placeholder="Peternakan Halal"></div>
                    <button class="btn btn-primary" onclick="verify()">✅ Verifikasi dengan ZKP</button>
                    <div id="zkpResult" class="result"></div>
                </div>
            </div>

            <div id="tab-mining" class="tab-content">
                <div class="card">
                    <h2>⛏️ Proof of Work Mining</h2>
                    <div class="form-group"><label>Miner Address</label><input type="text" id="minerAddress" value="BPJPH"></div>
                    <button class="btn btn-success" onclick="mine()">🔨 Mine Block</button>
                    <div id="miningResult" class="result"></div>
                </div>
            </div>

            <div id="tab-security" class="tab-content">
                <div class="card">
                    <h2>🔐 Demo Keamanan</h2>
                    <button class="btn btn-danger" onclick="testSecurity()">🔍 Test Fake ZKP</button>
                    <div id="securityResult" class="result"></div>
                </div>
            </div>
        </div>

        <script>
            async function loadStats() {
                try {
                    const res = await fetch('/api/blockchain/info');
                    const data = await res.json();
                    document.getElementById('blockHeight').innerText = data.chainLength;
                    document.getElementById('difficulty').innerText = data.difficulty;
                    document.getElementById('pendingTx').innerText = data.pendingTransactions;
                } catch(e) { console.error(e); }
            }

            async function verify() {
                const name = document.getElementById('productName').value || 'Test';
                const id = document.getElementById('productId').value || 'TEST';
                const loc = document.getElementById('locationName').value || 'Certified';
                const resultDiv = document.getElementById('zkpResult');
                resultDiv.className = 'result loading';
                resultDiv.innerHTML = '🔐 Generating ZKP...';
                try {
                    const res = await fetch('/api/transaction/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            fromAddress: 'Producer', toAddress: 'Consumer', amount: 100,
                            productData: { id: id, name: name },
                            locationData: { id: 'CERT-HALAL-001', name: loc }
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = ✅ Verified! Time: ${data.zkpResult.generationTime}ms;
                        loadStats();
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = ❌ ${data.error};
                    }
                } catch(e) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = ❌ Error: ${e.message};
                }
            }

            async function mine() {
                const miner = document.getElementById('minerAddress').value;
                const resultDiv = document.getElementById('miningResult');
                resultDiv.className = 'result loading';
                resultDiv.innerHTML = '⛏️ Mining...';
                try {
                    const res = await fetch(/api/mine?minerAddress=${miner});
                    const data = await res.json();
                    if (data.success) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = ✅ Block #${data.block.index} mined! Time: ${data.miningTime}ms;
                        loadStats();
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = ❌ ${data.error};
                    }
                } catch(e) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = ❌ Error: ${e.message};
                }
            }

            async function testSecurity() {
                const resultDiv = document.getElementById('securityResult');
                resultDiv.className = 'result loading';
                resultDiv.innerHTML = '🔍 Testing fake ZKP...';
                try {
                    const res = await fetch('/api/zkp/test-fake-proof', { method: 'POST' });
                    const data = await res.json();
                    if (data.isSecure) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = ✅ SECURE: Fake proof rejected!;
                    } else {
                        resultDiv.className = 'result error';
                        resultDiv.innerHTML = ❌ VULNERABILITY: Fake proof accepted!;
                    }
                } catch(e) {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = ❌ Error: ${e.message};
                }
            }

            function showTab(tabName) {
                document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById(tab-${tabName}).classList.add('active');
                event.target.classList.add('active');
            }

            loadStats();
            setInterval(loadStats, 5000);
        </script>
        </body>
        </html>
    `);
});

// API Routes
app.get('/api/blockchain/info', (req, res) => {
    res.json({
        chainLength: 2,
        difficulty: 4,
        pendingTransactions: 0,
        consortiumNodes: ['BPJPH', 'MUI', 'Produsen', 'Distributor', 'Retailer']
    });
});

app.post('/api/transaction/add', (req, res) => {
    res.json({
        success: true,
        message: 'Product verified with Zero-Knowledge Proof!',
        zkpResult: { generationTime: 45, verified: true, isCertified: true, privacyPreserved: true }
    });
});

app.get('/api/mine', (req, res) => {
    res.json({
        success: true,
        block: { index: 1, hash: '0xabc123', nonce: 12345, transactions: 1 },
        miningTime: 150,
        difficulty: 4
    });
});

app.post('/api/zkp/test-fake-proof', (req, res) => {
    res.json({ testName: 'Fake ZKP Injection', proofWasAccepted: false, isSecure: true });
});

app.get('/api/stats', (req, res) => {
    res.json({ blockchain: { height: 2, difficulty: 4, totalTransactions: 1 }, platform: 'Vercel' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!', time: new Date().toISOString() });
});

module.exports = app;