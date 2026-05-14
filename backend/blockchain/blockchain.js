const Block = require('./block');
const Transaction = require('./transaction');

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4; // Edukasi: difficulty rendah untuk simulasi
        this.pendingTransactions = [];
        this.miningReward = 100;
        
        // Konsorsium Blockchain: Private + Consortium
        this.consortiumNodes = [
            'BPJPH', 'MUI', 'Produsen', 'Distributor', 'Retailer'
        ];
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), [], '0');
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    minePendingTransactions(miningRewardAddress) {
        const block = new Block(
            this.chain.length,
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );
        
        block.mineBlock(this.difficulty);
        this.chain.push(block);
        
        this.pendingTransactions = [
            new Transaction(null, miningRewardAddress, this.miningReward)
        ];
        
        return block;
    }

    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must have from and to addresses');
        }
        
        if (!transaction.isValid()) {
            throw new Error('Invalid transaction');
        }
        
        this.pendingTransactions.push(transaction);
    }

    getBalance(address) {
        let balance = 0;
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.fromAddress === address) balance -= tx.amount;
                if (tx.toAddress === address) balance += tx.amount;
            }
        }
        return balance;
    }

    // Keamanan: Validasi integritas blockchain
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.log(`Block ${i} hash invalid`);
                return false;
            }
            
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`Block ${i} previous hash invalid`);
                return false;
            }
        }
        return true;
    }
    
    // Demonstrasi Immutability
    tamperBlock(index, newData) {
        if (index > 0 && index < this.chain.length) {
            this.chain[index].transactions = newData;
            this.chain[index].hash = this.chain[index].calculateHash();
            return true;
        }
        return false;
    }
}

module.exports = Blockchain;