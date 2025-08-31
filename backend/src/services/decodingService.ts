import { DecodingResult } from '../types';

export type DecodingAlgorithm = 'belief-propagation' | 'min-sum' | 'sum-product' | 'gallager-a' | 'gallager-b' | 'layered';

export interface DecodingConfig {
  algorithm: DecodingAlgorithm;
  maxIterations: number;
  scalingFactor?: number;
  earlyTermination?: boolean;
  damping?: number;
  llrInput?: boolean;
  channelType?: 'BSC' | 'AWGN' | 'BEC' | 'AWGN-SOFT';
  snr?: number;
  crossoverProb?: number;
  erasureProb?: number;
}

export class DecodingService {
  
  // Intelligent parameter adaptation based on channel and code characteristics
  private static adaptParameters(
    H: number[][], 
    config: DecodingConfig
  ): DecodingConfig {
    const n = H[0]?.length || 0;
    const m = H.length;
    const codeRate = m > 0 ? 1 - m / n : 0.5;
    
    // Calculate average row and column weights
    const avgRowWeight = m > 0 ? H.reduce((sum, row) => 
      sum + row.reduce((rowSum, bit) => rowSum + bit, 0), 0) / m : 0;
    // const avgColWeight = n > 0 ? H[0].map((_, j) => 
    //   H.reduce((sum, row) => sum + row[j], 0)).reduce((sum, weight) => sum + weight, 0) / n : 0;
    
    const adaptedConfig = { ...config };
    
    // Adapt parameters based on algorithm
    switch (config.algorithm) {
      case 'belief-propagation':
      case 'sum-product':
        // Lower damping for high-rate codes, higher for low-rate codes
        adaptedConfig.damping = config.damping || Math.max(0.5, Math.min(0.9, 0.6 + 0.3 * codeRate));
        break;
        
      case 'min-sum':
      case 'layered':
        // Adjust scaling based on code characteristics
        const baseScaling = 0.75;
        const rateAdjustment = 0.1 * (1 - codeRate); // Lower scaling for low-rate codes
        const weightAdjustment = Math.min(0.1, 0.02 * (avgRowWeight - 3)); // Adjust for degree
        adaptedConfig.scalingFactor = config.scalingFactor || 
          Math.max(0.6, Math.min(0.95, baseScaling + rateAdjustment + weightAdjustment));
        break;
    }
    
    // Channel-specific adaptations
    if (config.channelType) {
      switch (config.channelType) {
        case 'BSC':
          if (!config.maxIterations || config.maxIterations < 10) {
            adaptedConfig.maxIterations = Math.max(10, Math.min(50, 20 + 10 * (1 - codeRate)));
          }
          break;
          
        case 'AWGN':
        case 'AWGN-SOFT':
          const snr = config.snr || 2;
          if (snr < 0) {
            // Low SNR - need more iterations and conservative parameters
            adaptedConfig.maxIterations = Math.max(config.maxIterations || 0, 30);
            if (config.algorithm === 'belief-propagation') {
              adaptedConfig.damping = Math.max(adaptedConfig.damping || 0, 0.7);
            }
          }
          break;
          
        case 'BEC':
          // BEC often needs fewer iterations but may need more for high erasure rates
          const erasureProb = config.erasureProb || 0.1;
          adaptedConfig.maxIterations = config.maxIterations || 
            Math.max(10, Math.min(40, 15 + 25 * erasureProb));
          break;
      }
    }
    
    // Ensure early termination is enabled for efficiency
    adaptedConfig.earlyTermination = config.earlyTermination ?? true;
    
    return adaptedConfig;
  }
  
  // Enhanced LLR processing for different channel types
  private static processChannelInput(
    received: number[], 
    config: DecodingConfig
  ): { llr: number[]; isLLR: boolean } {
    const channelType = config.channelType || 'BSC';
    
    if (config.llrInput || channelType === 'AWGN-SOFT') {
      // Input is already LLR values - validate and normalize
      const processedLLR = received.map(val => {
        // Clamp extreme LLR values to prevent numerical issues
        return Math.max(-50, Math.min(50, val));
      });
      return { llr: processedLLR, isLLR: true };
    }
    
    // Convert hard decisions to LLR based on channel characteristics
    // Correct LLR convention: positive LLR favors bit=0, negative LLR favors bit=1
    let llr: number[];
    
    switch (channelType) {
      case 'BSC': {
        const p = config.crossoverProb || 0.1;
        const llrMagnitude = Math.abs(Math.log((1 - p) / p));
        llr = received.map(bit => bit === 0 ? llrMagnitude : -llrMagnitude);
        break;
      }
      
      case 'AWGN': {
        // For AWGN with hard decisions, estimate LLR based on SNR
        const snr = config.snr || 2; // dB
        const snrLinear = Math.pow(10, snr / 10);
        const llrMagnitude = 2 * snrLinear; // 2 * SNR for BPSK
        llr = received.map(bit => bit === 0 ? llrMagnitude : -llrMagnitude);
        break;
      }
      
      case 'BEC': {
        // For BEC, handle erasures (-1) differently
        const erasureProb = config.erasureProb || 0.1;
        const reliableLLR = Math.abs(Math.log((1 - erasureProb) / erasureProb));
        llr = received.map(bit => {
          if (bit === -1) return 0; // Erasure -> neutral LLR
          return bit === 0 ? reliableLLR : -reliableLLR;
        });
        break;
      }
      
      default:
        // Default case - moderate LLR values
        // Correct mapping: bit=0 -> positive LLR, bit=1 -> negative LLR
        llr = received.map(bit => bit === 0 ? 4.0 : -4.0);
    }
    
    return { llr, isLLR: false };
  }
  
  static decode(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    // Adapt parameters intelligently based on code and channel characteristics
    const adaptedConfig = this.adaptParameters(H, config);
    
    // Validate input
    if (!H || H.length === 0 || !received || received.length !== (H[0]?.length || 0)) {
      return {
        decoded: [...received],
        success: false,
        iterations: 0,
        correctedErrors: 0,
        message: '无效的输入参数',
        iterationHistory: []
      };
    }
    
    try {
      switch (adaptedConfig.algorithm) {
        case 'belief-propagation':
          return this.beliefPropagationDecoding(received, H, adaptedConfig);
        case 'min-sum':
          return this.minSumDecoding(received, H, adaptedConfig);
        case 'sum-product':
          return this.sumProductDecoding(received, H, adaptedConfig);
        case 'gallager-a':
          return this.gallagerADecoding(received, H, adaptedConfig);
        case 'gallager-b':
          return this.gallagerBDecoding(received, H, adaptedConfig);
        case 'layered':
          return this.layeredDecoding(received, H, adaptedConfig);
        default:
          return this.beliefPropagationDecoding(received, H, adaptedConfig);
      }
    } catch (error) {
      return {
        decoded: [...received],
        success: false,
        iterations: 0,
        correctedErrors: 0,
        message: `解码失败: ${error instanceof Error ? error.message : '未知错误'}`,
        iterationHistory: []
      };
    }
  }

  private static beliefPropagationDecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    const n = received.length;
    const m = H.length;
    let decoded = [...received];
    const iterationHistory = [];

    // Process input based on channel characteristics
    const { llr } = this.processChannelInput(received, config);
    
    // Initialize variable-to-check messages with intrinsic LLR
    let variableToCheck = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // Initialize check-to-variable messages
    let checkToVariable = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // Pre-compute check node connections for efficiency
    const checkConnections: number[][] = Array(m).fill(null).map(() => []);
    const variableConnections: number[][] = Array(n).fill(null).map(() => []);
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          checkConnections[i].push(j);
          variableConnections[j].push(i);
        }
      }
    }

    // Enhanced damping factor
    const dampingFactor = config.damping || 0.7;
    let convergenceStagnation = 0;
    let previousSyndrome = null;

    for (let iter = 0; iter < config.maxIterations; iter++) {
      const iterData = {
        iteration: iter + 1,
        syndrome: this.calculateSyndrome(decoded, H),
        decoded: [...decoded],
        llr: [...llr]
      };

      // Enhanced check-to-variable update with improved numerical stability
      for (let i = 0; i < m; i++) {
        const connectedVars = checkConnections[i];
        
        for (const j of connectedVars) {
          // Use log-domain computation for better stability
          let signProduct = 1;
          let minAbsLLR = Infinity;
          let secondMinAbsLLR = Infinity;
          
          for (const k of connectedVars) {
            if (k !== j) {
              const absLLR = Math.abs(variableToCheck[i][k]);
              
              // Track sign
              if (variableToCheck[i][k] < 0) {
                signProduct *= -1;
              }
              
              // Track two minimum absolute values for improved min-sum approximation
              if (absLLR < minAbsLLR) {
                secondMinAbsLLR = minAbsLLR;
                minAbsLLR = absLLR;
              } else if (absLLR < secondMinAbsLLR) {
                secondMinAbsLLR = absLLR;
              }
            }
          }
          
          // Enhanced check node update with offset min-sum
          const beta = 0.5; // offset parameter
          let magnitude = Math.max(0, minAbsLLR - beta);
          
          // Apply scaling for better performance
          const alpha = 0.8; // scaling factor
          checkToVariable[i][j] = alpha * signProduct * magnitude;
          
          // Clamp to prevent numerical overflow
          checkToVariable[i][j] = Math.max(-20, Math.min(20, checkToVariable[i][j]));
        }
      }

      // Variable-to-check update with enhanced damping
      for (let j = 0; j < n; j++) {
        const intrinsic = llr[j];
        const connectedChecks = variableConnections[j];
        
        // Calculate total extrinsic information
        let totalExtrinsic = 0;
        for (const i of connectedChecks) {
          totalExtrinsic += checkToVariable[i][j];
        }
        
        // Make hard decision
        const totalLLR = intrinsic + totalExtrinsic;
        decoded[j] = totalLLR < 0 ? 1 : 0;

        // Update variable-to-check messages with enhanced damping
        for (const i of connectedChecks) {
          const newMessage = intrinsic + totalExtrinsic - checkToVariable[i][j];
          
          // Apply adaptive damping based on convergence state
          const adaptiveDamping = iter < 5 ? dampingFactor : Math.min(0.9, dampingFactor + 0.1);
          
          if (iter > 0) {
            variableToCheck[i][j] = adaptiveDamping * newMessage + 
                                 (1 - adaptiveDamping) * variableToCheck[i][j];
          } else {
            variableToCheck[i][j] = newMessage;
          }
          
          // Enhanced message clipping
          variableToCheck[i][j] = Math.max(-25, Math.min(25, variableToCheck[i][j]));
        }
      }

      iterData.decoded = [...decoded];
      iterationHistory.push(iterData);

      // Enhanced early termination with stagnation detection
      if (config.earlyTermination) {
        const syndrome = this.calculateSyndrome(decoded, H);
        // const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
        
        if (syndrome.every(bit => bit === 0)) {
          break;
        }
        
        // Detect stagnation
        if (previousSyndrome && this.arraysEqual(syndrome, previousSyndrome)) {
          convergenceStagnation++;
          if (convergenceStagnation >= 3) {
            break; // Exit if stuck in oscillation
          }
        } else {
          convergenceStagnation = 0;
        }
        
        previousSyndrome = [...syndrome];
      }
    }

    const finalSyndrome = this.calculateSyndrome(decoded, H);
    const isValid = finalSyndrome.every(bit => bit === 0);
    const correctedErrors = received.reduce((count, bit, index) => 
      count + (bit !== decoded[index] ? 1 : 0), 0
    );

    return {
      decoded,
      success: isValid,
      iterations: iterationHistory.length,
      correctedErrors,
      message: isValid ? 'BP解码成功' : `BP解码${isValid ? '成功' : '未完全收敛'}，纠正${correctedErrors}个错误`,
      iterationHistory
    };
  }

  private static minSumDecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    const n = received.length;
    const m = H.length;
    let decoded = [...received];
    const iterationHistory = [];
    
    // Enhanced scaling factor based on code rate and SNR estimate
    const codeRate = 1 - m / n;
    const baseScaling = config.scalingFactor || 0.8;
    const scalingFactor = Math.max(0.6, Math.min(0.95, baseScaling + 0.1 * codeRate));

    // Process input based on channel characteristics
    const { llr } = this.processChannelInput(received, config);
    
    let variableToCheck = Array(m).fill(null).map(() => Array(n).fill(0));
    let checkToVariable = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // Pre-compute connections for efficiency
    const checkConnections: number[][] = Array(m).fill(null).map(() => []);
    const variableConnections: number[][] = Array(n).fill(null).map(() => []);
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          checkConnections[i].push(j);
          variableConnections[j].push(i);
        }
      }
    }
    
    let stagnationCount = 0;
    let previousSyndrome = null;

    for (let iter = 0; iter < config.maxIterations; iter++) {
      // Enhanced Min-Sum check-to-variable update
      for (let i = 0; i < m; i++) {
        const connectedVars = checkConnections[i];

        for (const j of connectedVars) {
          let minAbs = Infinity;
          let secondMinAbs = Infinity;
          let sign = 1;
          // let minIndex = -1; // Unused in current implementation
          
          // Find minimum and second minimum absolute values
          for (const k of connectedVars) {
            if (k !== j) {
              const absVal = Math.abs(variableToCheck[i][k]);
              if (absVal < minAbs) {
                secondMinAbs = minAbs;
                minAbs = absVal;
                // minIndex = k; // Unused in current implementation
              } else if (absVal < secondMinAbs) {
                secondMinAbs = absVal;
              }
              
              if (variableToCheck[i][k] < 0) {
                sign *= -1;
              }
            }
          }
          
          // Offset Min-Sum with adaptive correction
          const offset = 0.4 * Math.min(minAbs, secondMinAbs * 0.5);
          const magnitude = Math.max(0, minAbs - offset);
          
          checkToVariable[i][j] = scalingFactor * sign * magnitude;
          
          // Enhanced clamping
          checkToVariable[i][j] = Math.max(-15, Math.min(15, checkToVariable[i][j]));
        }
      }

      // Variable-to-check update with damping
      for (let j = 0; j < n; j++) {
        const intrinsic = llr[j];
        const connectedChecks = variableConnections[j];
        let extrinsic = 0;
        
        for (const i of connectedChecks) {
          extrinsic += checkToVariable[i][j];
        }
        
        const totalLLR = intrinsic + extrinsic;
        decoded[j] = totalLLR < 0 ? 1 : 0;

        // Apply light damping for stability
        const damping = iter < 3 ? 0.1 : 0;
        
        for (const i of connectedChecks) {
          const newMessage = intrinsic + extrinsic - checkToVariable[i][j];
          
          if (damping > 0 && iter > 0) {
            variableToCheck[i][j] = (1 - damping) * newMessage + damping * variableToCheck[i][j];
          } else {
            variableToCheck[i][j] = newMessage;
          }
          
          // Message clipping
          variableToCheck[i][j] = Math.max(-20, Math.min(20, variableToCheck[i][j]));
        }
      }

      iterationHistory.push({
        iteration: iter + 1,
        syndrome: this.calculateSyndrome(decoded, H),
        decoded: [...decoded]
      });

      // Enhanced early termination
      if (config.earlyTermination) {
        const syndrome = this.calculateSyndrome(decoded, H);
        if (syndrome.every(bit => bit === 0)) {
          break;
        }
        
        // Check for stagnation
        if (previousSyndrome && this.arraysEqual(syndrome, previousSyndrome)) {
          stagnationCount++;
          if (stagnationCount >= 2) {
            break;
          }
        } else {
          stagnationCount = 0;
        }
        
        previousSyndrome = [...syndrome];
      }
    }

    const finalSyndrome = this.calculateSyndrome(decoded, H);
    const isValid = finalSyndrome.every(bit => bit === 0);
    const correctedErrors = received.reduce((count, bit, index) => 
      count + (bit !== decoded[index] ? 1 : 0), 0
    );

    return {
      decoded,
      success: isValid,
      iterations: iterationHistory.length,
      correctedErrors,
      message: isValid ? 'Min-Sum解码成功' : `Min-Sum解码${isValid ? '成功' : '未完全收敛'}，纠正${correctedErrors}个错误`,
      iterationHistory
    };
  }

  private static sumProductDecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    // Sum-Product is essentially the same as Belief Propagation
    return this.beliefPropagationDecoding(received, H, {
      ...config,
      algorithm: 'sum-product'
    });
  }

  private static gallagerADecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    const n = received.length;
    const m = H.length;
    let decoded = [...received];
    const iterationHistory = [];
    
    // Process channel input to handle different formats
    const { llr } = this.processChannelInput(received, config);
    
    // Convert soft information to reliability weights for enhanced Gallager-A
    const reliability = llr.map(l => Math.abs(l));
    
    // Pre-compute connections
    const variableConnections = Array(n).fill(null).map(() => []);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          variableConnections[j].push(i);
        }
      }
    }
    
    let stagnationCount = 0;
    let previousDecoded = [...decoded];

    for (let iter = 0; iter < config.maxIterations; iter++) {
      let newDecoded = [...decoded];
      
      // Enhanced Gallager-A with reliability-weighted voting
      for (let j = 0; j < n; j++) {
        const connectedChecks = variableConnections[j];
        let weightedVotes = [0, 0]; // weighted votes for 0 and 1
        
        // Intrinsic vote with channel reliability
        const intrinsicWeight = Math.min(5.0, Math.max(0.1, reliability[j] / 2));
        const intrinsicBit = llr[j] > 0 ? 0 : 1;
        weightedVotes[intrinsicBit] += intrinsicWeight;
        
        // Collect weighted votes from check nodes
        for (const i of connectedChecks) {
          let parity = 0;
          let checkReliability = 1.0;
          
          // Calculate parity and accumulated reliability
          for (let k = 0; k < n; k++) {
            if (H[i][k] === 1 && k !== j) {
              parity ^= decoded[k];
              // Lower reliability for checks with more unreliable bits
              checkReliability *= Math.min(1.0, 0.1 + 0.9 * Math.tanh(reliability[k] / 4));
            }
          }
          
          // Weight the vote by check reliability
          weightedVotes[parity] += checkReliability;
        }
        
        // Decision with tie-breaking using intrinsic information
        if (Math.abs(weightedVotes[0] - weightedVotes[1]) < 0.1) {
          // Tie case - use intrinsic information
          newDecoded[j] = intrinsicBit;
        } else {
          newDecoded[j] = weightedVotes[1] > weightedVotes[0] ? 1 : 0;
        }
      }
      
      // Additional error correction pass using syndrome information
      if (iter > 0) {
        const syndrome = this.calculateSyndrome(newDecoded, H);
        const errorPattern = this.estimateErrorPattern(newDecoded, H, syndrome, reliability);
        
        // Apply corrections for high-confidence error positions
        for (let j = 0; j < n; j++) {
          if (errorPattern[j] > 0.7) { // High confidence threshold
            newDecoded[j] = 1 - newDecoded[j];
          }
        }
      }
      
      decoded = newDecoded;
      iterationHistory.push({
        iteration: iter + 1,
        syndrome: this.calculateSyndrome(decoded, H),
        decoded: [...decoded]
      });

      // Enhanced early termination
      if (config.earlyTermination) {
        const syndrome = this.calculateSyndrome(decoded, H);
        if (syndrome.every(bit => bit === 0)) {
          break;
        }
      }
      
      // Stagnation detection
      if (this.arraysEqual(decoded, previousDecoded)) {
        stagnationCount++;
        if (stagnationCount >= 3) {
          // Try a random perturbation to escape local minima
          if (iter < config.maxIterations - 2) {
            const worstBitIndex = this.findLeastReliableBit(decoded, H, reliability);
            if (worstBitIndex >= 0) {
              decoded[worstBitIndex] = 1 - decoded[worstBitIndex];
            }
          }
          stagnationCount = 0;
        }
      } else {
        stagnationCount = 0;
      }
      
      previousDecoded = [...decoded];
    }

    const finalSyndrome = this.calculateSyndrome(decoded, H);
    const isValid = finalSyndrome.every(bit => bit === 0);
    const correctedErrors = received.reduce((count, bit, index) => 
      count + (bit !== decoded[index] ? 1 : 0), 0
    );

    return {
      decoded,
      success: isValid,
      iterations: iterationHistory.length,
      correctedErrors,
      message: isValid ? 'Gallager-A解码成功' : `Gallager-A解码${isValid ? '成功' : '未完全收敛'}，纠正${correctedErrors}个错误`,
      iterationHistory
    };
  }

  private static gallagerBDecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    // Enhanced Gallager-B with threshold-based decisions
    const n = received.length;
    const m = H.length;
    let decoded = [...received];
    const iterationHistory = [];
    
    // Process channel input
    const { llr } = this.processChannelInput(received, config);
    const reliability = llr.map(l => Math.abs(l));
    
    // Pre-compute connections
    const variableConnections = Array(n).fill(null).map(() => []);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          variableConnections[j].push(i);
        }
      }
    }
    
    // Adaptive threshold for Gallager-B
    let threshold = 0.5;
    let stagnationCount = 0;
    let previousDecoded = [...decoded];

    for (let iter = 0; iter < config.maxIterations; iter++) {
      let newDecoded = [...decoded];
      
      // Gallager-B with adaptive threshold
      for (let j = 0; j < n; j++) {
        const connectedChecks = variableConnections[j];
        let votes = [0, 0]; // votes for 0 and 1
        
        // Intrinsic vote with reliability weighting
        const intrinsicBit = llr[j] > 0 ? 0 : 1;
        const intrinsicWeight = Math.min(2.0, reliability[j] / 2);
        votes[intrinsicBit] += intrinsicWeight;
        
        // Collect votes from check nodes
        for (const i of connectedChecks) {
          let parity = 0;
          let checkConfidence = 1.0;
          
          for (let k = 0; k < n; k++) {
            if (H[i][k] === 1 && k !== j) {
              parity ^= decoded[k];
              checkConfidence *= Math.tanh(reliability[k] / 4 + 0.1);
            }
          }
          
          // Weight vote by check confidence
          votes[parity] += checkConfidence;
        }
        
        // Threshold-based decision with adaptive threshold
        const totalVotes = votes[0] + votes[1];
        if (totalVotes > 0) {
          const confidence = Math.abs(votes[1] - votes[0]) / totalVotes;
          
          if (confidence >= threshold) {
            newDecoded[j] = votes[1] > votes[0] ? 1 : 0;
          } else {
            // Keep current value if confidence is low
            newDecoded[j] = decoded[j];
          }
        }
      }
      
      decoded = newDecoded;
      iterationHistory.push({
        iteration: iter + 1,
        syndrome: this.calculateSyndrome(decoded, H),
        decoded: [...decoded]
      });

      // Early termination
      if (config.earlyTermination) {
        const syndrome = this.calculateSyndrome(decoded, H);
        if (syndrome.every(bit => bit === 0)) {
          break;
        }
      }
      
      // Adaptive threshold adjustment
      if (this.arraysEqual(decoded, previousDecoded)) {
        stagnationCount++;
        if (stagnationCount >= 2) {
          threshold = Math.max(0.2, threshold - 0.1); // Lower threshold
        }
      } else {
        stagnationCount = 0;
        threshold = Math.min(0.8, threshold + 0.05); // Raise threshold
      }
      
      previousDecoded = [...decoded];
    }

    const finalSyndrome = this.calculateSyndrome(decoded, H);
    const isValid = finalSyndrome.every(bit => bit === 0);
    const correctedErrors = received.reduce((count, bit, index) => 
      count + (bit !== decoded[index] ? 1 : 0), 0
    );

    return {
      decoded,
      success: isValid,
      iterations: iterationHistory.length,
      correctedErrors,
      message: isValid ? 'Gallager-B解码成功' : `Gallager-B解码${isValid ? '成功' : '未完全收敛'}，纠正${correctedErrors}个错误`,
      iterationHistory
    };
  }

  private static layeredDecoding(
    received: number[],
    H: number[][],
    config: DecodingConfig
  ): DecodingResult & { iterationHistory?: any[] } {
    // Enhanced layered decoding with row-wise processing
    const n = received.length;
    const m = H.length;
    let decoded = [...received];
    const iterationHistory = [];
    
    // Process channel input
    const { llr } = this.processChannelInput(received, config);
    
    // Initialize messages
    let variableToCheck = Array(m).fill(null).map(() => Array(n).fill(0));
    let checkToVariable = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // Initialize with intrinsic LLR
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < m; i++) {
        if (H[i][j] === 1) {
          variableToCheck[i][j] = llr[j];
        }
      }
    }
    
    const scalingFactor = config.scalingFactor || 0.8;

    for (let iter = 0; iter < config.maxIterations; iter++) {
      // Process each layer (row) sequentially
      for (let i = 0; i < m; i++) {
        const connectedVars = [];
        for (let j = 0; j < n; j++) {
          if (H[i][j] === 1) {
            connectedVars.push(j);
          }
        }
        
        // Update check-to-variable messages for this layer
        for (const j of connectedVars) {
          let minAbs = Infinity;
          let signProduct = 1;
          
          for (const k of connectedVars) {
            if (k !== j) {
              const absVal = Math.abs(variableToCheck[i][k]);
              minAbs = Math.min(minAbs, absVal);
              if (variableToCheck[i][k] < 0) {
                signProduct *= -1;
              }
            }
          }
          
          checkToVariable[i][j] = scalingFactor * signProduct * Math.max(0, minAbs - 0.3);
          checkToVariable[i][j] = Math.max(-15, Math.min(15, checkToVariable[i][j]));
        }
        
        // Immediate variable node update for connected variables
        for (const j of connectedVars) {
          let totalLLR = llr[j];
          
          // Sum all incoming check messages
          for (let ii = 0; ii < m; ii++) {
            if (H[ii][j] === 1) {
              totalLLR += checkToVariable[ii][j];
            }
          }
          
          // Update decision immediately
          decoded[j] = totalLLR < 0 ? 1 : 0;
          
          // Update outgoing messages immediately
          for (let ii = 0; ii < m; ii++) {
            if (H[ii][j] === 1) {
              variableToCheck[ii][j] = totalLLR - checkToVariable[ii][j];
              variableToCheck[ii][j] = Math.max(-20, Math.min(20, variableToCheck[ii][j]));
            }
          }
        }
      }
      
      iterationHistory.push({
        iteration: iter + 1,
        syndrome: this.calculateSyndrome(decoded, H),
        decoded: [...decoded]
      });

      // Early termination
      if (config.earlyTermination) {
        const syndrome = this.calculateSyndrome(decoded, H);
        if (syndrome.every(bit => bit === 0)) {
          break;
        }
      }
    }

    const finalSyndrome = this.calculateSyndrome(decoded, H);
    const isValid = finalSyndrome.every(bit => bit === 0);
    const correctedErrors = received.reduce((count, bit, index) => 
      count + (bit !== decoded[index] ? 1 : 0), 0
    );

    return {
      decoded,
      success: isValid,
      iterations: iterationHistory.length,
      correctedErrors,
      message: isValid ? '分层解码成功' : `分层解码${isValid ? '成功' : '未完全收敛'}，纠正${correctedErrors}个错误`,
      iterationHistory
    };
  }

  private static calculateSyndrome(received: number[], H: number[][]): number[] {
    const m = H.length;
    const n = received.length;
    const syndrome = Array(m).fill(0);

    // s = H * r^T (在GF(2)上)
    for (let i = 0; i < m; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += received[j] * H[i][j];
      }
      syndrome[i] = sum % 2; // GF(2) 运算
    }

    return syndrome;
  }
  
  private static arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  static getAlgorithmInfo(algorithm: DecodingAlgorithm): {
    name: string;
    description: string;
    complexity: 'Low' | 'Medium' | 'High';
    performance: 'Good' | 'Better' | 'Best';
    parameters: string[];
  } {
    const algorithms = {
      'belief-propagation': {
        name: '置信传播',
        description: '基于消息传递的软判决迭代解码算法',
        complexity: 'High' as const,
        performance: 'Best' as const,
        parameters: ['maxIterations', 'damping', 'earlyTermination']
      },
      'min-sum': {
        name: 'Min-Sum',
        description: '置信传播的简化版本，计算复杂度较低',
        complexity: 'Medium' as const,
        performance: 'Better' as const,
        parameters: ['maxIterations', 'scalingFactor', 'earlyTermination']
      },
      'sum-product': {
        name: 'Sum-Product',
        description: '和积算法，与置信传播等价',
        complexity: 'High' as const,
        performance: 'Best' as const,
        parameters: ['maxIterations', 'earlyTermination']
      },
      'gallager-a': {
        name: 'Gallager-A',
        description: '基于可靠性加权投票的实用解码算法',
        complexity: 'Low' as const,
        performance: 'Good' as const,
        parameters: ['maxIterations', 'earlyTermination']
      },
      'gallager-b': {
        name: 'Gallager-B',
        description: '基于自适应阈值的增强投票算法',
        complexity: 'Low' as const,
        performance: 'Better' as const,
        parameters: ['maxIterations', 'earlyTermination']
      },
      'layered': {
        name: '分层解码',
        description: '按层序列处理的高效Min-Sum算法',
        complexity: 'Medium' as const,
        performance: 'Better' as const,
        parameters: ['maxIterations', 'scalingFactor', 'earlyTermination']
      }
    };

    return algorithms[algorithm];
  }
  
  // Helper method to estimate error pattern based on syndrome
  private static estimateErrorPattern(
    decoded: number[], 
    H: number[][], 
    syndrome: number[], 
    reliability: number[]
  ): number[] {
    const n = decoded.length;
    const m = H.length;
    const errorLikelihood = Array(n).fill(0);
    
    for (let j = 0; j < n; j++) {
      let unsatisfiedChecks = 0;
      let totalChecks = 0;
      
      for (let i = 0; i < m; i++) {
        if (H[i][j] === 1) {
          totalChecks++;
          if (syndrome[i] === 1) {
            unsatisfiedChecks++;
          }
        }
      }
      
      if (totalChecks > 0) {
        // Combine syndrome information with reliability
        const syndromeScore = unsatisfiedChecks / totalChecks;
        const reliabilityPenalty = 1 / (1 + reliability[j]);
        errorLikelihood[j] = syndromeScore * reliabilityPenalty;
      }
    }
    
    return errorLikelihood;
  }
  
  // Helper method to find the least reliable bit for perturbation
  private static findLeastReliableBit(
    decoded: number[], 
    H: number[][], 
    reliability: number[]
  ): number {
    let minReliability = Infinity;
    let worstBitIndex = -1;
    
    const syndrome = this.calculateSyndrome(decoded, H);
    const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
    
    if (syndromeWeight === 0) return -1; // Already valid
    
    for (let j = 0; j < decoded.length; j++) {
      let involvedInErrors = 0;
      let totalChecks = 0;
      
      for (let i = 0; i < H.length; i++) {
        if (H[i][j] === 1) {
          totalChecks++;
          if (syndrome[i] === 1) {
            involvedInErrors++;
          }
        }
      }
      
      if (totalChecks > 0) {
        const errorInvolvement = involvedInErrors / totalChecks;
        const combinedScore = errorInvolvement / (1 + reliability[j]);
        
        if (combinedScore > 0 && reliability[j] < minReliability && errorInvolvement > 0.3) {
          minReliability = reliability[j];
          worstBitIndex = j;
        }
      }
    }
    
    return worstBitIndex;
  }
}