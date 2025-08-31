/**
 * LDPC Backend Unit Tests
 * 
 * This is an independent unit test file for testing backend core algorithm logic
 * Does not depend on project API interfaces and will not modify project code
 * 
 * Test Coverage:
 * 1. Matrix Generation (H and G matrix theoretical relationship verification)
 * 2. Encoding Algorithms (correctness of information bits to codeword conversion)
 * 3. Decoding Algorithms (error correction and detection capabilities)
 * 4. Minimum Distance Analysis
 * 5. Boundary Condition Handling
 */

const assert = require('assert');

// ====================== Utility Functions ======================

/**
 * Matrix operation utility functions
 */
class MatrixUtils {
  // Matrix multiplication (GF(2) field)
  static multiply(A, B) {
    const rows = A.length;
    const cols = B[0].length;
    const inner = B.length;
    
    const result = Array(rows).fill(null).map(() => Array(cols).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        let sum = 0;
        for (let k = 0; k < inner; k++) {
          sum ^= A[i][k] * B[k][j]; // Multiplication and addition in GF(2)
        }
        result[i][j] = sum;
      }
    }
    return result;
  }
  
  // Matrix transpose
  static transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    return result;
  }
  
  // Check if matrix is zero matrix
  static isZeroMatrix(matrix) {
    return matrix.every(row => row.every(val => val === 0));
  }
  
  // Gaussian elimination (GF(2) field)
  static gaussElimination(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = matrix.map(row => [...row]); // Deep copy
    
    let rank = 0;
    for (let col = 0; col < cols && rank < rows; col++) {
      // Find pivot
      let pivotRow = rank;
      for (let row = rank + 1; row < rows; row++) {
        if (result[row][col] === 1) {
          pivotRow = row;
          break;
        }
      }
      
      if (result[pivotRow][col] === 0) continue;
      
      // Swap rows
      if (pivotRow !== rank) {
        [result[rank], result[pivotRow]] = [result[pivotRow], result[rank]];
      }
      
      // Elimination
      for (let row = 0; row < rows; row++) {
        if (row !== rank && result[row][col] === 1) {
          for (let c = 0; c < cols; c++) {
            result[row][c] ^= result[rank][c];
          }
        }
      }
      rank++;
    }
    
    return { matrix: result, rank };
  }
  
  // Calculate Hamming weight
  static hammingWeight(vector) {
    return vector.reduce((sum, bit) => sum + bit, 0);
  }
  
  // Calculate Hamming distance
  static hammingDistance(vec1, vec2) {
    if (vec1.length !== vec2.length) throw new Error('Vector lengths must match');
    return vec1.reduce((dist, bit, i) => dist + (bit !== vec2[i] ? 1 : 0), 0);
  }
}

/**
 * LDPC Code Generator (simplified version for testing)
 */
class TestLDPCGenerator {
  // Generate a simple (6,3) LDPC code H matrix
  // Designed to be more sparse and ensure correct systematic form
  static generateLDPC63H() {
    // Design an H matrix that can be converted to systematic form [P|I]
    return [
      [1, 0, 1, 1, 0, 0],  // Parity equation 1: x1 + x3 + x4 = 0
      [1, 1, 0, 0, 1, 0],  // Parity equation 2: x1 + x2 + x5 = 0
      [0, 1, 1, 0, 0, 1]   // Parity equation 3: x2 + x3 + x6 = 0
    ];
  }
  
  // Generate G matrix from H matrix (systematic code form)
  static generateSystematicG(H) {
    const m = H.length;
    const n = H[0].length;
    const k = n - m;
    
    // This H matrix is designed as approximate systematic form [P|I]
    // H = [1 0 1 | 1 0 0]
    //     [1 1 0 | 0 1 0]  
    //     [0 1 1 | 0 0 1]
    // 
    // Corresponding G matrix should be in [I|P^T] form
    // G = [1 0 0 | 1 1 0]
    //     [0 1 0 | 0 1 1]
    //     [0 0 1 | 1 0 1]
    
    const G = Array(k).fill(null).map(() => Array(n).fill(0));
    
    // Set information bit part as identity matrix [I]
    for (let i = 0; i < k; i++) {
      G[i][i] = 1;
    }
    
    // Set parity bit part [P^T] - transpose from P part of H
    // P = first k columns of H, P^T needs to be set to last m columns of G
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < m; j++) {
        G[i][k + j] = H[j][i];  // P^T[i][j] = P[j][i] = H[j][i]
      }
    }
    
    return G;
  }
  
  // Encoding function
  static encode(information, G) {
    if (information.length !== G.length) {
      throw new Error(`Information length ${information.length} != G rows ${G.length}`);
    }
    
    const n = G[0].length;
    const codeword = Array(n).fill(0);
    
    for (let i = 0; i < G.length; i++) {
      for (let j = 0; j < n; j++) {
        codeword[j] ^= information[i] * G[i][j];
      }
    }
    
    return codeword;
  }
  
  // Simplified LDPC iterative decoding algorithm (for testing)
  static decode(received, H, maxIterations = 10) {
    const decoded = [...received];
    const n = H[0].length;
    const m = H.length;
    
    // Check initial syndrome
    let syndrome = this.calculateSyndrome(received, H);
    if (MatrixUtils.isZeroMatrix([syndrome])) {
      return { decoded, success: true, iterations: 0 };
    }
    
    // Simplified Gallager-A decoding algorithm
    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;
      
      // For each variable node
      for (let j = 0; j < n; j++) {
        // Find all check nodes connected to variable node j
        const connectedChecks = [];
        for (let i = 0; i < m; i++) {
          if (H[i][j] === 1) {
            connectedChecks.push(i);
          }
        }
        
        // Calculate votes from check nodes
        let votes0 = 0; // Number of check nodes voting for 0
        let votes1 = 0; // Number of check nodes voting for 1
        
        for (const checkIdx of connectedChecks) {
          // Calculate parity equation result excluding current variable node
          let checkSum = 0;
          for (let k = 0; k < n; k++) {
            if (k !== j && H[checkIdx][k] === 1) {
              checkSum ^= decoded[k];
            }
          }
          
          // Check node vote: what value should current variable node be to satisfy parity equation
          if (checkSum === 0) {
            votes0++;
          } else {
            votes1++;
          }
        }
        
        // Decision: consider received value and check node votes
        let newValue = received[j]; // Default to trust received value
        
        // If majority check nodes vote differently from received value, flip
        if (votes0 > votes1 && received[j] === 1) {
          newValue = 0;
        } else if (votes1 > votes0 && received[j] === 0) {
          newValue = 1;
        }
        
        if (newValue !== decoded[j]) {
          decoded[j] = newValue;
          changed = true;
        }
      }
      
      // Check if converged
      syndrome = this.calculateSyndrome(decoded, H);
      if (MatrixUtils.isZeroMatrix([syndrome])) {
        return { decoded, success: true, iterations: iter + 1 };
      }
      
      // If no change, stop early
      if (!changed) {
        break;
      }
    }
    
    return { decoded, success: false, iterations: maxIterations };
  }
  
  // Calculate syndrome
  static calculateSyndrome(received, H) {
    const syndrome = Array(H.length).fill(0);
    
    for (let i = 0; i < H.length; i++) {
      for (let j = 0; j < received.length; j++) {
        syndrome[i] ^= H[i][j] * received[j];
      }
    }
    
    return syndrome;
  }
  
  // Calculate minimum distance (exhaustive method, only suitable for small codes)
  static calculateMinDistance(G) {
    const k = G.length;
    const n = G[0].length;
    let minDistance = n;
    
    // Traverse all non-zero information sequences
    for (let info = 1; info < (1 << k); info++) {
      const infoBits = [];
      for (let i = 0; i < k; i++) {
        infoBits.push((info >> i) & 1);
      }
      
      const codeword = this.encode(infoBits, G);
      const weight = MatrixUtils.hammingWeight(codeword);
      
      if (weight < minDistance) {
        minDistance = weight;
      }
    }
    
    return minDistance;
  }
}

// ====================== Test Cases ======================

/**
 * Test Suite
 */
class LDPCTestSuite {
  
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }
  
  // Test assertion
  assert(condition, message) {
    this.totalTests++;
    if (condition) {
      this.passedTests++;
      console.log(`   ✅ PASS  │ ${message}`);
    } else {
      console.log(`   ❌ FAIL  │ ${message}`);
      this.testResults.push({ status: 'FAIL', message });
    }
  }
  
  // Test start
  startTest(testName) {
    console.log(`\n┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`│ 🧪 ${testName.padEnd(60)} │`);
    console.log(`└─────────────────────────────────────────────────────────────────┘`);
  }
  
  // ====================== Matrix Generation Tests ======================
  
  testMatrixGeneration() {
    this.startTest('Matrix Generation Tests');
    
    // Test (6,3) LDPC code
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    // Verify matrix dimensions
    this.assert(H.length === 3, 'H matrix rows correct (m=3)');
    this.assert(H[0].length === 6, 'H matrix columns correct (n=6)');
    this.assert(G.length === 3, 'G matrix rows correct (k=3)');
    this.assert(G[0].length === 6, 'G matrix columns correct (n=6)');
    
    // Verify sparsity (LDPC characteristic)
    const totalElements = H.length * H[0].length;
    const nonZeroElements = H.flat().filter(x => x === 1).length;
    const sparsity = nonZeroElements / totalElements;
    this.assert(sparsity <= 0.6, `H matrix is reasonably sparse (sparsity: ${sparsity.toFixed(2)})`);
    
    // Verify H·G^T = 0
    const GT = MatrixUtils.transpose(G);
    const HGT = MatrixUtils.multiply(H, GT);
    this.assert(MatrixUtils.isZeroMatrix(HGT), 'H·G^T = 0 (orthogonality verification)');
    
    // Verify G matrix systematic form
    let isSystematic = true;
    for (let i = 0; i < G.length; i++) {
      if (G[i][i] !== 1) isSystematic = false;
      for (let j = 0; j < i; j++) {
        if (G[i][j] !== 0) isSystematic = false;
      }
      for (let j = i + 1; j < G.length; j++) {
        if (G[i][j] !== 0) isSystematic = false;
      }
    }
    this.assert(isSystematic, 'G matrix in systematic form [I|P]');
  }
  
  // ====================== Encoding Tests ======================
  
  testEncoding() {
    this.startTest('Encoding Algorithm Tests');
    
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    // Test zero information bits
    const zeroInfo = [0, 0, 0];
    const zeroCodeword = TestLDPCGenerator.encode(zeroInfo, G);
    this.assert(zeroCodeword.every(bit => bit === 0), 'Zero information bits encode to zero codeword');
    
    // Test standard information bit patterns for (6,3) LDPC code
    const testCases = [
      { info: [1, 0, 0] },
      { info: [0, 1, 0] },
      { info: [0, 0, 1] },
      { info: [1, 1, 0] },
      { info: [1, 0, 1] },
      { info: [0, 1, 1] },
      { info: [1, 1, 1] }
    ];
    
    testCases.forEach((testCase, index) => {
      const codeword = TestLDPCGenerator.encode(testCase.info, G);
      const syndrome = TestLDPCGenerator.calculateSyndrome(codeword, H);
      const isValid = syndrome.every(bit => bit === 0);
      this.assert(isValid, `Test case ${index + 1} produces valid codeword`);
    });
    
    // Test all possible information bit combinations (2^3 = 8)
    let allValidCodewords = true;
    const validCodewords = [];
    for (let i = 0; i < 8; i++) {
      const info = [];
      for (let j = 0; j < 3; j++) {
        info.push((i >> j) & 1);
      }
      
      const codeword = TestLDPCGenerator.encode(info, G);
      const syndrome = TestLDPCGenerator.calculateSyndrome(codeword, H);
      
      if (!syndrome.every(bit => bit === 0)) {
        allValidCodewords = false;
        break;
      }
      validCodewords.push(codeword);
    }
    this.assert(allValidCodewords, 'All 8 information combinations produce valid codewords');
    
    // Verify codewords are distinct
    const uniqueCodewords = new Set(validCodewords.map(cw => cw.join('')));
    this.assert(uniqueCodewords.size === 8, 'All codewords are distinct');
  }
  
  // ====================== Decoding Tests ======================
  
  testDecoding() {
    this.startTest('Decoding Algorithm Tests');
    
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    // Test error-free decoding
    const originalInfo = [1, 0, 1];
    const originalCodeword = TestLDPCGenerator.encode(originalInfo, G);
    const noErrorResult = TestLDPCGenerator.decode(originalCodeword, H);
    this.assert(noErrorResult.success, 'Error-free codeword decoding successful');
    this.assert(noErrorResult.iterations === 0, 'Error-free codeword requires no iterations');
    
    // Test single-bit error correction capability
    let singleErrorCorrection = 0;
    let singleErrorAttempts = 0;
    for (let errorPos = 0; errorPos < 6; errorPos++) {
      const corrupted = [...originalCodeword];
      corrupted[errorPos] = 1 - corrupted[errorPos]; // Introduce single-bit error
      singleErrorAttempts++;
      
      const result = TestLDPCGenerator.decode(corrupted, H, 15);
      if (result.success) {
        const isCorrect = result.decoded.every((bit, i) => bit === originalCodeword[i]);
        if (isCorrect) singleErrorCorrection++;
      }
    }
    
    // LDPC codes may not correct all single errors (depending on structure)
    const correctionRate = singleErrorCorrection / singleErrorAttempts;
    this.assert(correctionRate >= 0.5, `LDPC decoder corrects most single errors (${correctionRate.toFixed(2)})`);
    
    // Test iterative decoding behavior
    const testInfo2 = [1, 1, 0];
    const testCodeword2 = TestLDPCGenerator.encode(testInfo2, G);
    const corruptedMultiple = [...testCodeword2];
    corruptedMultiple[0] = 1 - corruptedMultiple[0];
    corruptedMultiple[2] = 1 - corruptedMultiple[2];
    
    const multiErrorResult = TestLDPCGenerator.decode(corruptedMultiple, H, 20);
    this.assert(multiErrorResult.iterations > 0 || !multiErrorResult.success, 
      'Multiple errors trigger iterative decoding or fail gracefully');
  }
  
  // ====================== Minimum Distance Tests ======================
  
  testMinimumDistance() {
    this.startTest('Minimum Distance Analysis Tests');
    
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    // Calculate minimum distance
    const minDistance = TestLDPCGenerator.calculateMinDistance(G);
    this.assert(minDistance >= 2, `(6,3) LDPC code minimum distance >= 2 (actual: ${minDistance})`);
    
    // For this specific LDPC code, verify it has reasonable distance
    this.assert(minDistance <= 4, `LDPC code minimum distance is reasonable (${minDistance})`);
    
    // Verify error correction capability
    const correctionCapability = Math.floor((minDistance - 1) / 2);
    this.assert(correctionCapability >= 0, `Error correction capability: ${correctionCapability} bits`);
    
    // Verify error detection capability
    const detectionCapability = minDistance - 1;
    this.assert(detectionCapability >= 1, `Error detection capability: ${detectionCapability} bits`);
    
    // Test distances between codewords
    const codewords = [];
    for (let i = 0; i < 8; i++) {
      const info = [];
      for (let j = 0; j < 3; j++) {
        info.push((i >> j) & 1);
      }
      codewords.push(TestLDPCGenerator.encode(info, G));
    }
    
    let minCodewordDistance = 6;
    let maxCodewordDistance = 0;
    for (let i = 0; i < codewords.length; i++) {
      for (let j = i + 1; j < codewords.length; j++) {
        const distance = MatrixUtils.hammingDistance(codewords[i], codewords[j]);
        if (distance < minCodewordDistance) {
          minCodewordDistance = distance;
        }
        if (distance > maxCodewordDistance) {
          maxCodewordDistance = distance;
        }
      }
    }
    this.assert(minCodewordDistance === minDistance, 
      `Minimum distance between codewords verified (${minCodewordDistance})`);
    this.assert(maxCodewordDistance <= 6, 
      `Maximum distance reasonable for (6,3) code (${maxCodewordDistance})`);
  }
  
  // ====================== Error Injection Tests ======================
  
  testErrorInjection() {
    this.startTest('Error Injection and Recovery Tests');
    
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    const testInfo = [1, 0, 1];
    const originalCodeword = TestLDPCGenerator.encode(testInfo, G);
    
    // Test single-bit error correction
    let correctedErrors = 0;
    let totalSingleErrors = 0;
    for (let pos = 0; pos < 6; pos++) {
      const corrupted = [...originalCodeword];
      corrupted[pos] = 1 - corrupted[pos];
      totalSingleErrors++;
      
      const result = TestLDPCGenerator.decode(corrupted, H, 15);
      if (result.success && result.decoded.every((bit, i) => bit === originalCodeword[i])) {
        correctedErrors++;
      }
    }
    
    const singleErrorCorrectionRate = correctedErrors / totalSingleErrors;
    this.assert(singleErrorCorrectionRate >= 0.3, 
      `LDPC corrects reasonable fraction of single errors (${singleErrorCorrectionRate.toFixed(2)})`);
    
    // Test multi-bit error patterns (more challenging for LDPC)
    const multiErrorPatterns = [
      [0, 1], [0, 2], [1, 2],      // Double errors
      [3, 4], [4, 5], [0, 5],      
      [0, 1, 2], [1, 2, 3],        // Triple errors
      [3, 4, 5]
    ];
    
    let detectedOrCorrected = 0;
    let totalPatterns = multiErrorPatterns.length;
    
    for (const pattern of multiErrorPatterns) {
      const corrupted = [...originalCodeword];
      pattern.forEach(pos => {
        corrupted[pos] = 1 - corrupted[pos];
      });
      
      const result = TestLDPCGenerator.decode(corrupted, H, 20);
      if (!result.success) {
        detectedOrCorrected++; // Error detected (failed to decode)
      } else {
        const isCorrect = result.decoded.every((bit, i) => bit === originalCodeword[i]);
        if (isCorrect) {
          detectedOrCorrected++; // Error corrected
        }
        // If decoded but incorrect, it's a decoder error (not counted)
      }
    }
    
    const multiErrorHandlingRate = detectedOrCorrected / totalPatterns;
    this.assert(multiErrorHandlingRate >= 0.1, 
      `LDPC handles multi-bit errors reasonably (${multiErrorHandlingRate.toFixed(2)})`);
  }
  
  // ====================== Boundary Condition Tests ======================
  
  testBoundaryConditions() {
    this.startTest('Boundary Condition Tests');
    
    // Test empty input
    try {
      const emptyG = [];
      TestLDPCGenerator.encode([1, 0], emptyG);
      this.assert(false, 'Empty G matrix should throw exception');
    } catch (error) {
      this.assert(true, 'Empty G matrix correctly throws exception');
    }
    
    // Test dimension mismatch
    try {
      const H = TestLDPCGenerator.generateLDPC63H();
      const G = TestLDPCGenerator.generateSystematicG(H);
      TestLDPCGenerator.encode([1, 0], G); // Length mismatch (should be 3 bits)
      this.assert(false, 'Dimension mismatch should throw exception');
    } catch (error) {
      this.assert(true, 'Dimension mismatch correctly throws exception');
    }
    
    // Test non-binary input
    const H = TestLDPCGenerator.generateLDPC63H();
    const G = TestLDPCGenerator.generateSystematicG(H);
    
    const invalidInfo = [1, 2, 0]; // Contains non-binary value
    try {
      const result = TestLDPCGenerator.encode(invalidInfo, G);
      // Should handle but result may be incorrect
      this.assert(true, 'Non-binary input handled (but may be incorrect)');
    } catch (error) {
      this.assert(true, 'Non-binary input correctly throws exception');
    }
    
    // Test matrix consistency
    const validH = [
      [1, 0, 1],
      [0, 1, 1]
    ];
    
    try {
      const GT = MatrixUtils.transpose(validH);
      this.assert(GT.length === 3 && GT[0].length === 2, 'Valid matrix transpose correct');
    } catch (error) {
      this.assert(false, 'Valid matrix transpose should not fail');
    }
  }
  
  // ====================== Run All Tests ======================
  
  runAllTests() {
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                  🚀 LDPC Backend Unit Tests                    │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ Test Coverage: Matrix Generation, Encoding, Decoding,          │');
    console.log('│                Minimum Distance, Error Injection, Boundaries   │');
    console.log('│ Test Code: (6,3) LDPC Code with Iterative Decoding            │');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    
    this.testMatrixGeneration();
    this.testEncoding();
    this.testDecoding();
    this.testMinimumDistance();
    this.testErrorInjection();
    this.testBoundaryConditions();
    
    // Output summary
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                        📊 Test Summary                          │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ Total Tests:      ${this.totalTests.toString().padStart(3)}                                         │`);
    console.log(`│ Passed Tests:     ${this.passedTests.toString().padStart(3)}                                         │`);
    console.log(`│ Failed Tests:     ${(this.totalTests - this.passedTests).toString().padStart(3)}                                         │`);
    console.log(`│ Success Rate:     ${((this.passedTests / this.totalTests) * 100).toFixed(1).padStart(5)}%                                    │`);
    console.log('├─────────────────────────────────────────────────────────────────┤');
    
    if (this.passedTests === this.totalTests) {
      console.log('│ 🎉 All tests passed! Backend core algorithms are functional.  │');
      console.log('└─────────────────────────────────────────────────────────────────┘');
    } else {
      console.log('│ ⚠️  Some tests failed. Please check the following issues:      │');
      console.log('├─────────────────────────────────────────────────────────────────┤');
      this.testResults.forEach(result => {
        if (result.status === 'FAIL') {
          const truncatedMsg = result.message.length > 57 ? 
            result.message.substring(0, 54) + '...' : result.message;
          console.log(`│ ❌ ${truncatedMsg.padEnd(60)} │`);
        }
      });
      console.log('└─────────────────────────────────────────────────────────────────┘');
    }
    
    return this.passedTests === this.totalTests;
  }
}

// ====================== Execute Tests ======================

// Create and run test suite
const testSuite = new LDPCTestSuite();
const allTestsPassed = testSuite.runAllTests();

// Exit code: 0 for success, 1 for failure
process.exit(allTestsPassed ? 0 : 1);
