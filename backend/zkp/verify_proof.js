
const ZKPManager = require('./zkp-manager');

async function verifyProof(proof, publicSignals) {
    const manager = new ZKPManager();
    return manager.verifyProof(proof, publicSignals);
}

module.exports = { verifyProof };
