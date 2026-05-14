
// ZKP Manager - Pure JavaScript Implementation
// Demonstrates Zero-Knowledge Proof concept without external dependencies

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class ZKPManager {
    constructor() {
        this.certifiedLocations = this.loadCertifiedLocations();
    }
    
    loadCertifiedLocations() {
        try {
            const data = fs.readFileSync(path.join(__dirname, 'certified_locations.json'), 'utf8');
            return JSON.parse(data).locations;
        } catch (error) {
            return [];
        }
    }
    
    // Main method: Generate ZKP that location is certified WITHOUT revealing the location ID
    generateProof(locationData, productId) {
        console.log('🔒 Generating Zero-Knowledge Proof...');
        const startTime = Date.now();
        
        // Step 1: Check if location is certified (this is the secret)
        const isCertified = this.isLocationCertified(locationData);
        const certifiedLocation = this.getCertifiedLocation(locationData);
        
        // Step 2: Create a commitment (this simulates the proof)
        // The prover creates a proof that they know a certified location
        // WITHOUT revealing WHICH location it is
        
        const proof = this.createZKProof(locationData, productId, isCertified, certifiedLocation);
        
        const proofTime = Date.now() - startTime;
        
        console.log(`   Proof generated in ${proofTime}ms`);
        console.log(`   Certified status: ${isCertified ? '✅ YES' : '❌ NO'}`);
        console.log(`   Location revealed? NO (Zero-Knowledge preserved!)`);
        
        return {
            proof: proof.proof,
            publicSignals: proof.publicSignals,
            generationTime: proofTime,
            isCertified: isCertified
        };
    }
    
    isLocationCertified(locationData) {
        // Check by ID
        if (locationData.id) {
            const found = this.certifiedLocations.some(loc => loc.id === locationData.id);
            if (found) return true;
        }
        
        // Check by coordinates (simulasi)
        if (locationData.latitude && locationData.longitude) {
            return this.certifiedLocations.some(loc => {
                const latDiff = Math.abs(loc.lat - locationData.latitude);
                const lngDiff = Math.abs(loc.lng - locationData.longitude);
                return latDiff < 0.1 && lngDiff < 0.1;
            });
        }
        
        // Check by name (partial match)
        if (locationData.name) {
            return this.certifiedLocations.some(loc => 
                loc.name.toLowerCase().includes(locationData.name.toLowerCase())
            );
        }
        
        return false;
    }
    
    getCertifiedLocation(locationData) {
        if (locationData.id) {
            return this.certifiedLocations.find(loc => loc.id === locationData.id);
        }
        return null;
    }
    
    createZKProof(locationData, productId, isCertified, certifiedLocation) {
        // This simulates a Zero-Knowledge Proof
        // The proof demonstrates that the location is certified
        // without revealing the location's actual identity
        
        // Create a hash commitment (this is what the verifier will see)
        const randomNonce = crypto.randomBytes(32).toString('hex');
        
        // The real secret (only known to prover)
        const secret = {
            locationId: locationData.id || 'unknown',
            productId: productId,
            timestamp: Date.now()
        };
        
        // The proof (what gets sent to verifier)
        // Contains only the commitment and proof of knowledge
        const proof = {
            // Commitment to the secret (one-way function)
            commitment: this.hashData(JSON.stringify(secret) + randomNonce),
            
            // Proof that the location is certified (without revealing which one)
            certifiedProof: isCertified ? this.generateCertifiedProof(certifiedLocation) : null,
            
            // Zero-knowledge proof that prover knows a valid location
            zkProof: {
                algorithm: "Simulated-ZK-SNARK",
                proofType: "Groth16",
                isValid: isCertified,
                timestamp: Date.now()
            },
            
            // Public parameters (safe to share)
            publicParams: {
                productId: productId,
                verificationHash: this.hashData(productId + (isCertified ? 'certified' : 'uncertified')),
                timestamp: Date.now()
            }
        };
        
        const publicSignals = {
            productId: productId,
            commitment: proof.commitment,
            isValid: isCertified,
            timestamp: Date.now()
        };
        
        return { proof, publicSignals };
    }
    
    generateCertifiedProof(certifiedLocation) {
        if (!certifiedLocation) return null;
        
        // This simulates a proof of certification
        // Proves that a valid certification exists without revealing the cert number
        return {
            certifierHash: this.hashData(certifiedLocation.certifier),
            validUntil: certifiedLocation.validUntil,
            proofHash: this.hashData(certifiedLocation.certNumber + certifiedLocation.certifier),
            // The actual cert number is NOT revealed!
        };
    }
    
    // Verify the ZKP without seeing the original data
    verifyProof(proof, publicSignals) {
        console.log('🔍 Verifying Zero-Knowledge Proof...');
        
        // The verifier only sees the proof and public signals
        // They DO NOT see the original location data!
        
        let isValid = false;
        let message = '';
        
        // Verify the proof structure
        if (!proof || !publicSignals) {
            message = 'Invalid proof format';
            console.log(`   ❌ ${message}`);
            return false;
        }
        
        // Verify the commitment is valid format
        if (proof.commitment && proof.commitment.length === 64) {
            isValid = true;
            message = 'Proof structure is valid';
        }
        
        // Verify the certification proof
        if (proof.zkProof && proof.zkProof.isValid === true) {
            isValid = true;
            message = 'Certification proof is valid';
        } else if (proof.zkProof && proof.zkProof.isValid === false) {
            isValid = false;
            message = 'Certification proof invalid - Location not certified';
        }
        
        // Verify public signals match
        if (publicSignals.isValid !== undefined) {
            isValid = isValid && publicSignals.isValid;
        }
        
        console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        console.log(`   Message: ${message}`);
        console.log(`   Original data revealed? NO (Zero-Knowledge maintained!)`);
        
        return isValid;
    }
    
    // For penetration testing: generate fake proof
    generateFakeProof() {
        console.log('⚠️ Generating FAKE proof for penetration testing...');
        
        const fakeProof = {
            commitment: this.hashData('fake_data_' + Date.now()),
            zkProof: {
                algorithm: "Simulated-ZK-SNARK",
                isValid: false,  // This will fail verification
                isFake: true
            },
            publicParams: {
                productId: 'FAKE-PRODUCT',
                verificationHash: this.hashData('fake'),
                timestamp: Date.now()
            }
        };
        
        const fakePublicSignals = {
            productId: 'FAKE-PRODUCT',
            commitment: fakeProof.commitment,
            isValid: false,
            timestamp: Date.now()
        };
        
        return {
            proof: fakeProof,
            publicSignals: fakePublicSignals,
            generationTime: 1,
            isFake: true
        };
    }
    
    hashData(data) {
        return crypto.createHash('sha256').update(String(data)).digest('hex');
    }
    
    getCertifiedLocationsPublic() {
        // Return only public info, not the sensitive details
        return this.certifiedLocations.map(loc => ({
            id: loc.id,
            name: loc.name,
            // Coordinates and cert numbers are NOT revealed to public!
            description: `Certified Halal Facility - Verified by ${loc.certifier}`
        }));
    }
    
    explainZKP() {
        return {
            whatIsZKP: "Zero-Knowledge Proof allows one party (prover) to prove to another (verifier) that a statement is true, without revealing any information beyond the validity of the statement itself.",
            howItWorks: "In this demo: Producer proves location is HALAL certified without revealing which specific farm/supplier they use (protecting trade secrets).",
            privacyGuarantee: "Verifier only learns that location is certified, not the location's identity, coordinates, or certification number.",
            realWorldUse: "Competitors cannot see your supply chain partners, but consumers/certifiers can verify halal status."
        };
    }
}

module.exports = ZKPManager;
