// backend/storage/offchain.js
// Data yang disimpan off-chain (IPFS/External Storage simulation)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class OffChainStorage {
    constructor() {
        this.storage = new Map();
        this.dataPath = path.join(__dirname, '../../data/offchain');
        
        // Create data directory if it doesn't exist
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
        
        console.log('💾 OffChain Storage initialized');
        console.log(`   Storage path: ${this.dataPath}`);
    }
    
    // Store large/product data off-chain
    async storeProductData(productId, data) {
        if (!productId || !data) {
            throw new Error('Product ID and data are required');
        }
        
        const startTime = Date.now();
        
        // Generate unique hash for the data
        const dataHash = this.generateHash(data);
        const fileName = `${productId}_${Date.now()}.json`;
        const filePath = path.join(this.dataPath, fileName);
        
        // Prepare off-chain data structure
        const offChainData = {
            productId: productId,
            data: data,
            hash: dataHash,
            timestamp: Date.now(),
            size: JSON.stringify(data).length,
            fileName: fileName,
            storageType: 'off-chain'
        };
        
        // Save to file system (simulating IPFS)
        fs.writeFileSync(filePath, JSON.stringify(offChainData, null, 2));
        
        // Store reference in memory
        this.storage.set(dataHash, {
            productId: productId,
            hash: dataHash,
            fileName: fileName,
            timestamp: Date.now(),
            filePath: filePath
        });
        
        const storageTime = Date.now() - startTime;
        
        console.log(`   Stored off-chain: ${productId}`);
        console.log(`   Hash: ${dataHash.substring(0, 16)}...`);
        console.log(`   Size: ${offChainData.size} bytes`);
        console.log(`   Storage time: ${storageTime}ms`);
        
        return {
            hash: dataHash,
            fileName: fileName,
            storageTime: storageTime
        };
    }
    
    // Retrieve product data by hash
    async retrieveProductData(hash) {
        const reference = this.storage.get(hash);
        
        if (!reference) {
            console.log(`   Data not found: ${hash}`);
            return null;
        }
        
        const filePath = reference.filePath;
        
        if (!fs.existsSync(filePath)) {
            console.log(`   File not found: ${filePath}`);
            return null;
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        console.log(`   Retrieved off-chain: ${data.productId}`);
        
        return data;
    }
    
    // Retrieve by product ID
    async retrieveByProductId(productId) {
        const results = [];
        
        for (const [hash, reference] of this.storage.entries()) {
            if (reference.productId === productId) {
                const data = await this.retrieveProductData(hash);
                if (data) {
                    results.push(data);
                }
            }
        }
        
        return results;
    }
    
    // Delete off-chain data
    async deleteProductData(hash) {
        const reference = this.storage.get(hash);
        
        if (!reference) {
            return false;
        }
        
        // Delete file
        if (fs.existsSync(reference.filePath)) {
            fs.unlinkSync(reference.filePath);
        }
        
        // Delete reference
        this.storage.delete(hash);
        
        console.log(`   Deleted off-chain data: ${hash.substring(0, 16)}...`);
        
        return true;
    }
    
    // Generate hash for data
    generateHash(data) {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
    
    // Get storage info
    getInfo() {
        let totalSize = 0;
        let fileCount = 0;
        
        // Calculate total size of stored files
        for (const reference of this.storage.values()) {
            if (fs.existsSync(reference.filePath)) {
                const stats = fs.statSync(reference.filePath);
                totalSize += stats.size;
                fileCount++;
            }
        }
        
        return {
            type: 'Off-Chain Storage (Simulated IPFS)',
            storagePath: this.dataPath,
            referenceCount: this.storage.size,
            fileCount: fileCount,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            keys: Array.from(this.storage.keys()).map(k => k.substring(0, 16) + '...'),
            description: 'Stores large product data, ZKP proofs, and sensitive business information'
        };
    }
    
    // Get all products
    getAllProducts() {
        const products = [];
        
        for (const reference of this.storage.values()) {
            products.push({
                productId: reference.productId,
                hash: reference.hash.substring(0, 16) + '...',
                timestamp: reference.timestamp
            });
        }
        
        return products;
    }
    
    // Clear all data (for testing)
    async clear() {
        // Delete all files
        for (const reference of this.storage.values()) {
            if (fs.existsSync(reference.filePath)) {
                fs.unlinkSync(reference.filePath);
            }
        }
        
        // Clear storage
        this.storage.clear();
        
        console.log('   Cleared all off-chain data');
    }
    
    // Get storage statistics
    getStats() {
        let totalSize = 0;
        let oldestData = null;
        let newestData = null;
        
        for (const reference of this.storage.values()) {
            if (fs.existsSync(reference.filePath)) {
                const stats = fs.statSync(reference.filePath);
                totalSize += stats.size;
                
                if (!oldestData || reference.timestamp < oldestData.timestamp) {
                    oldestData = reference;
                }
                if (!newestData || reference.timestamp > newestData.timestamp) {
                    newestData = reference;
                }
            }
        }
        
        return {
            totalReferences: this.storage.size,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            oldestData: oldestData ? new Date(oldestData.timestamp).toISOString() : null,
            newestData: newestData ? new Date(newestData.timestamp).toISOString() : null
        };
    }
}

module.exports = OffChainStorage;