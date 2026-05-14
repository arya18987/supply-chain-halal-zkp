// backend/storage/onchain.js
// Data yang disimpan di blockchain (hanya hash dan referensi)

class OnChainStorage {
    constructor() {
        this.storage = new Map();
        console.log('📦 OnChain Storage initialized');
    }
    
    // Store data on-chain (only essential data)
    store(key, value) {
        if (!key || !value) {
            throw new Error('Key and value are required');
        }
        
        const onChainData = {
            hash: this.generateHash(value),
            timestamp: Date.now(),
            size: JSON.stringify(value).length,
            onChain: true,
            // Only store reference, not full data
            reference: key
        };
        
        this.storage.set(key, onChainData);
        console.log(`   Stored on-chain: ${key} (hash: ${onChainData.hash.substring(0, 16)}...)`);
        
        return onChainData;
    }
    
    // Retrieve on-chain data
    get(key) {
        return this.storage.get(key);
    }
    
    // Delete data
    delete(key) {
        return this.storage.delete(key);
    }
    
    // Check if key exists
    has(key) {
        return this.storage.has(key);
    }
    
    // Get all keys
    getAllKeys() {
        return Array.from(this.storage.keys());
    }
    
    // Generate hash for data
    generateHash(data) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
    
    // Get storage info
    getInfo() {
        return {
            type: 'On-Chain Storage',
            size: this.storage.size,
            totalEntries: this.storage.size,
            keys: Array.from(this.storage.keys()),
            description: 'Stores only essential blockchain data (hashes, references, timestamps)'
        };
    }
    
    // Clear all data (for testing)
    clear() {
        this.storage.clear();
    }
    
    // Get storage statistics
    getStats() {
        let totalSize = 0;
        for (const value of this.storage.values()) {
            totalSize += value.size || 0;
        }
        
        return {
            entryCount: this.storage.size,
            totalSizeBytes: totalSize,
            averageSizeBytes: this.storage.size > 0 ? totalSize / this.storage.size : 0
        };
    }
}

module.exports = OnChainStorage;