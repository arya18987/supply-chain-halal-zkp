const SHA256 = require('crypto-js/sha256');

class Transaction {
    constructor(fromAddress, toAddress, amount, productData = null, zkProof = null) {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.productData = productData;
        this.zkProof = zkProof;
        this.timestamp = Date.now();
        this.signature = null;
    }

    calculateHash() {
        return SHA256(
            this.fromAddress +
            this.toAddress +
            this.amount +
            JSON.stringify(this.productData) +
            this.timestamp
        ).toString();
    }

    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cannot sign transactions for other wallets');
        }
        const hashTx = this.calculateHash();
        this.signature = signingKey.sign(hashTx, 'base64');
    }

    isValid() {
        if (this.fromAddress === null) return true;
        
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }
        
        // Verifikasi ZKP jika ada
        if (this.zkProof && !this.verifyZKP()) {
            return false;
        }
        
        return true;
    }
    
    verifyZKP() {
        // Integrasi dengan ZKP verifier
        return this.zkProof && this.zkProof.verified === true;
    }
}

module.exports = Transaction;