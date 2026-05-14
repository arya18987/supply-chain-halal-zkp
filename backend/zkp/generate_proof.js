
// Wrapper for backward compatibility
const ZKPManager = require('./zkp-manager');
const manager = new ZKPManager();

module.exports = {
    ZKPManager,
    generateProof: (locationData, productId) => manager.generateProof(locationData, productId),
    verifyProof: (proof, publicSignals) => manager.verifyProof(proof, publicSignals),
    generateFakeProof: () => manager.generateFakeProof(),
    getCertifiedLocations: () => manager.getCertifiedLocationsPublic(),
    explainZKP: () => manager.explainZKP()
};
