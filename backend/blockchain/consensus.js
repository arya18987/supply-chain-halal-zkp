// backend/blockchain/consensus.js
// Implementasi mekanisme konsensus Proof of Work (PoW) untuk edukasi

class Consensus {
    constructor(difficulty = 4) {
        this.difficulty = difficulty;
        this.algorithm = "Proof of Work (PoW)";
        this.description = "Educational PoW for blockchain demonstration";
    }

    // Validasi block sebelum ditambahkan ke chain
    validateBlock(block, previousBlock) {
        // 1. Validasi index harus increment
        if (block.index !== previousBlock.index + 1) {
            return { valid: false, reason: "Invalid block index" };
        }

        // 2. Validasi previous hash harus match
        if (block.previousHash !== previousBlock.hash) {
            return { valid: false, reason: "Previous hash mismatch" };
        }

        // 3. Validasi hash block
        const calculatedHash = block.calculateHash();
        if (block.hash !== calculatedHash) {
            return { valid: false, reason: "Block hash invalid" };
        }

        // 4. Validasi PoW (hash harus memiliki leading zeros sesuai difficulty)
        const target = Array(this.difficulty + 1).join('0');
        if (block.hash.substring(0, this.difficulty) !== target) {
            return { valid: false, reason: "Proof of Work invalid" };
        }

        // 5. Validasi timestamp
        if (block.timestamp <= previousBlock.timestamp) {
            return { valid: false, reason: "Timestamp out of order" };
        }

        return { valid: true, reason: "Block valid" };
    }

    // Validasi transaksi
    validateTransaction(transaction, blockchain) {
        // 1. Validasi signature
        if (!transaction.isValid()) {
            return { valid: false, reason: "Invalid transaction signature" };
        }

        // 2. Validasi balance (jika bukan coinbase transaction)
        if (transaction.fromAddress !== null) {
            const balance = blockchain.getBalance(transaction.fromAddress);
            if (balance < transaction.amount) {
                return { valid: false, reason: "Insufficient balance" };
            }
        }

        // 3. Validasi amount positif
        if (transaction.amount <= 0 && transaction.fromAddress !== null) {
            return { valid: false, reason: "Transaction amount must be positive" };
        }

        // 4. Validasi ZKP jika ada
        if (transaction.zkProof && !transaction.verifyZKP()) {
            return { valid: false, reason: "Zero-Knowledge Proof invalid" };
        }

        return { valid: true, reason: "Transaction valid" };
    }

    // Simulasi konsensus antar nodes (multiple validator nodes)
    async reachConsensus(nodes, proposedBlock) {
        console.log(`\n🔄 Reaching consensus with ${nodes.length} validator nodes...`);
        
        const votes = [];
        const requiredVotes = Math.floor(nodes.length * 2 / 3) + 1; // 2/3 majority
        
        for (const node of nodes) {
            const vote = await this.simulateNodeVote(node, proposedBlock);
            votes.push(vote);
            console.log(`   ${node.name}: ${vote.approved ? '✅ APPROVED' : '❌ REJECTED'} - ${vote.reason}`);
        }
        
        const approvedCount = votes.filter(v => v.approved).length;
        const consensusReached = approvedCount >= requiredVotes;
        
        console.log(`\n📊 Consensus Result:`);
        console.log(`   Approved: ${approvedCount}/${nodes.length}`);
        console.log(`   Required: ${requiredVotes}`);
        console.log(`   Consensus: ${consensusReached ? '✅ REACHED' : '❌ FAILED'}`);
        
        return {
            reached: consensusReached,
            votes: votes,
            approvedCount: approvedCount,
            requiredVotes: requiredVotes
        };
    }

    // Simulasi vote dari setiap node
    async simulateNodeVote(node, block) {
        // Simulasi waktu validasi (50-200ms)
        const validationTime = Math.random() * 150 + 50;
        await new Promise(resolve => setTimeout(resolve, validationTime));
        
        // Validasi block dari perspektif node
        const checks = [
            { name: "Block hash valid", passed: this.validateBlockHash(block) },
            { name: "Transactions valid", passed: this.validateBlockTransactions(block) },
            { name: "No double spending", passed: this.checkDoubleSpending(block) },
            { name: "Valid PoW", passed: this.validatePoW(block) }
        ];
        
        const allPassed = checks.every(c => c.passed);
        const failedChecks = checks.filter(c => !c.passed).map(c => c.name);
        
        return {
            nodeId: node.id,
            nodeName: node.name,
            approved: allPassed,
            reason: allPassed ? "All checks passed" : `Failed: ${failedChecks.join(', ')}`,
            checks: checks,
            validationTime: validationTime
        };
    }

    validateBlockHash(block) {
        const calculatedHash = block.calculateHash();
        return block.hash === calculatedHash;
    }

    validateBlockTransactions(block) {
        // Validasi semua transaksi dalam block
        for (const tx of block.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }
        return true;
    }

    checkDoubleSpending(block) {
        // Cek double spending dalam block yang sama
        const spentInputs = new Set();
        for (const tx of block.transactions) {
            const inputKey = `${tx.fromAddress}-${tx.timestamp}`;
            if (spentInputs.has(inputKey)) {
                return false;
            }
            spentInputs.add(inputKey);
        }
        return true;
    }

    validatePoW(block) {
        const target = Array(this.difficulty + 1).join('0');
        return block.hash.substring(0, this.difficulty) === target;
    }

    // Dapatkan daftar node konsorsium
    getConsortiumNodes() {
        return [
            { id: "bpjph-001", name: "BPJPH (Regulator)", role: "regulator", weight: 2 },
            { id: "mui-001", name: "MUI (Certifier)", role: "certifier", weight: 2 },
            { id: "producer-001", name: "Produsen (Supplier)", role: "supplier", weight: 1 },
            { id: "distributor-001", name: "Distributor", role: "distributor", weight: 1 },
            { id: "retailer-001", name: "Retailer", role: "retailer", weight: 1 }
        ];
    }

    // Adjust difficulty berdasarkan waktu mining
    adjustDifficulty(currentDifficulty, lastBlockTime, targetBlockTime = 10000) {
        if (lastBlockTime < targetBlockTime / 2) {
            // Mining terlalu cepat -> naikkan difficulty
            return currentDifficulty + 1;
        } else if (lastBlockTime > targetBlockTime * 1.5) {
            // Mining terlalu lambat -> turunkan difficulty
            return Math.max(1, currentDifficulty - 1);
        }
        return currentDifficulty;
    }

    // Dapatkan informasi konsensus
    getInfo() {
        return {
            algorithm: this.algorithm,
            difficulty: this.difficulty,
            description: this.description,
            consensusMechanism: "2/3 Majority Vote",
            validatorCount: this.getConsortiumNodes().length,
            finality: "Probabilistic (6 block confirmations recommended)"
        };
    }
}

module.exports = Consensus;