pragma circom 2.0.0;

// Zero-Knowledge Proof untuk membuktikan bahan baku dari lokasi tersertifikasi
// Tanpa mengungkap lokasi sebenarnya

template CertifiedLocation() {
    // Private inputs (rahasia)
    signal input locationId;      // ID lokasi rahasia
    signal input latitude;         // Latitude rahasia
    signal input longitude;        // Longitude rahasia
    
    // Public inputs (diketahui verifier)
    signal input certifiedHash;    // Hash dari database sertifikasi
    signal input productId;        // ID produk yang diverifikasi
    
    // Output
    signal output isValid;
    
    // Constraint: Lokasi harus dalam daftar tersertifikasi
    // Simulasi dengan range check sederhana
    component lowBound = LessThan(2);
    component highBound = LessThan(2);
    
    lowBound.in[0] <== latitude;
    lowBound.in[1] <== 0;
    highBound.in[0] <== 90;
    highBound.in[1] <== latitude;
    
    isValid <== lowBound.out * highBound.out;
}

template LessThan(n) {
    signal input in[2];
    signal output out;
    
    component isZero = IsZero();
    component subtractor = Num2Bits(n+1);
    
    subtractor.in <== in[0] + (1 << n) - in[1];
    isZero.in <== subtractor.out[n];
    out <== 1 - isZero.out;
}

template IsZero() {
    signal input in;
    signal output out;
    
    signal inv;
    inv <== in != 0 ? 1/in : 0;
    out <== -in*inv + 1;
}

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var bitsum = 0;
    
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        bitsum += out[i] << i;
    }
    bitsum === in;
}

component main = CertifiedLocation();