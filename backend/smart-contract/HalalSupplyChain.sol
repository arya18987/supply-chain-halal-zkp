// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HalalSupplyChain {
    // State variables
    address public owner;
    uint256 public productCount;
    uint256 public transactionCount;
    
    // Enums untuk status produk
    enum ProductStatus {
        Raw,        // Bahan baku
        Processed,  // Diproses
        Certified,  // Tersertifikasi Halal
        Distributed,// Didistribusikan
        Sold        // Terjual
    }
    
    // Struct untuk Product
    struct Product {
        uint256 id;
        string name;
        string originLocation;
        uint256 timestamp;
        address currentOwner;
        ProductStatus status;
        bytes32 zkProofHash;  // Hash dari ZKP
        bool isHalalCertified;
    }
    
    // Struct untuk Transaction Record
    struct TransactionRecord {
        uint256 id;
        uint256 productId;
        address from;
        address to;
        uint256 timestamp;
        string action;
        bytes32 verificationHash;
    }
    
    // Mappings
    mapping(uint256 => Product) public products;
    mapping(uint256 => TransactionRecord) public transactions;
    mapping(address => bool) public authorizedCertifiers;
    
    // Events
    event ProductCreated(uint256 indexed productId, string name, address indexed owner);
    event ProductTransferred(uint256 indexed productId, address from, address to);
    event ProductCertified(uint256 indexed productId, address certifier);
    event ZKPVerified(uint256 indexed productId, bool isValid);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyAuthorizedCertifier() {
        require(authorizedCertifiers[msg.sender], "Not authorized certifier");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedCertifiers[msg.sender] = true;
    }
    
    // Create new product
    function createProduct(string memory _name, string memory _origin) public {
        productCount++;
        products[productCount] = Product({
            id: productCount,
            name: _name,
            originLocation: _origin,
            timestamp: block.timestamp,
            currentOwner: msg.sender,
            status: ProductStatus.Raw,
            zkProofHash: bytes32(0),
            isHalalCertified: false
        });
        
        emit ProductCreated(productCount, _name, msg.sender);
    }
    
    // Transfer product ownership
    function transferProduct(uint256 _productId, address _to) public {
        Product storage product = products[_productId];
        require(product.currentOwner == msg.sender, "Not the owner");
        require(_to != address(0), "Invalid address");
        
        transactionCount++;
        transactions[transactionCount] = TransactionRecord({
            id: transactionCount,
            productId: _productId,
            from: msg.sender,
            to: _to,
            timestamp: block.timestamp,
            action: "TRANSFER",
            verificationHash: keccak256(abi.encodePacked(msg.sender, _to, block.timestamp))
        });
        
        product.currentOwner = _to;
        product.status = ProductStatus.Distributed;
        
        emit ProductTransferred(_productId, msg.sender, _to);
    }
    
    // Verify product with ZKP
    function verifyWithZKP(uint256 _productId, bytes32 _zkProofHash, uint256[] memory _publicSignals) 
        public 
        onlyAuthorizedCertifier 
        returns (bool) 
    {
        Product storage product = products[_productId];
        
        // Simulasi verifikasi ZKP on-chain
        bool isValid = verifyZKPOffChain(_zkProofHash, _publicSignals);
        
        if (isValid) {
            product.zkProofHash = _zkProofHash;
            product.isHalalCertified = true;
            product.status = ProductStatus.Certified;
            emit ZKPVerified(_productId, true);
        } else {
            emit ZKPVerified(_productId, false);
        }
        
        return isValid;
    }
    
    // Simulasi verifier (actual implementation would use precompiled contracts)
    function verifyZKPOffChain(bytes32 _proofHash, uint256[] memory _publicSignals) 
        private 
        pure 
        returns (bool) 
    {
        // Ini adalah simulasi - pada implementasi nyata akan menggunakan verifier contract
        // yang digenerate oleh snarkjs
        return _proofHash != bytes32(0);
    }
    
    // Get product traceability
    function getProductTraceability(uint256 _productId) public view returns (
        string memory name,
        string memory origin,
        address currentOwner,
        ProductStatus status,
        bool isCertified,
        uint256 timestamp
    ) {
        Product memory product = products[_productId];
        return (
            product.name,
            product.originLocation,
            product.currentOwner,
            product.status,
            product.isHalalCertified,
            product.timestamp
        );
    }
    
    // Get transaction history for product
    function getProductHistory(uint256 _productId) public view returns (TransactionRecord[] memory) {
        // Simplified - in production would filter properly
        TransactionRecord[] memory history = new TransactionRecord[](transactionCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= transactionCount; i++) {
            if (transactions[i].productId == _productId) {
                history[count] = transactions[i];
                count++;
            }
        }
        
        return history;
    }
    
    // Add authorized certifier
    function addCertifier(address _certifier) public onlyOwner {
        authorizedCertifiers[_certifier] = true;
    }
}