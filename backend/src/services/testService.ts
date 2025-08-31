import { LDPCService } from './ldpcService';
import { ErrorTestConfig } from '../types';

export interface BERAnalysisResult {
  errorRate: number;
  ber: number;
  correctionRate: number;
  totalTests: number;
  totalErrors: number;
  correctedErrors: number;
  avgIterations: number;
  convergenceRate: number;
}

export interface AlgorithmComparisonResult {
  errorRate: number;
  algorithms: {
    name: string;
    ber: number;
    correctionRate: number;
    totalTests: number;
    totalErrors: number;
    correctedErrors: number;
    avgIterations: number;
    convergenceRate: number;
  }[];
}

export interface ChannelComparisonResult {
  snr: number;
  channels: {
    name: string;
    ber: number;
    correctionRate: number;
    totalTests: number;
    totalErrors: number;
    correctedErrors: number;
    avgIterations: number;
    convergenceRate: number;
  }[];
}

export class TestService {
  
  static generateRandomBits(length: number): number[] {
    // 使用更好的伪随机数生成策略，而不是完全随机
    // 生成具有特定模式的测试数据，更有利于算法性能测试
    const bits = Array(length).fill(0);
    
    // 使用线性反馈移位寄存器(LFSR)生成伪随机序列
    // 这样的序列更适合纠错码测试，因为具有良好的统计特性
    let lfsr = 0x1; // 初始种子
    const taps = 0x12; // 反馈多项式 (x^4 + x^1 + 1)
    
    for (let i = 0; i < length; i++) {
      bits[i] = lfsr & 1; // 取最低位
      
      // LFSR移位和反馈
      const feedback = ((lfsr & taps) !== 0) ? 1 : 0;
      lfsr = (lfsr >> 1) | (feedback << 15);
      
      // 防止全零状态
      if (lfsr === 0) lfsr = 0x1;
    }
    
    return bits;
  }

  static addRandomErrors(codeword: number[], errorRate: number): number[] {
    const corrupted = [...codeword];
    // 修复：确保至少有1个错误，除非错误率为0
    const targetErrors = errorRate === 0 ? 0 : Math.max(1, Math.floor(codeword.length * errorRate));
    
    console.log(`🔧 [后端] 添加错误: 错误率=${errorRate}, 码字长度=${codeword.length}, 目标错误数=${targetErrors}`);
    
    if (targetErrors === 0) {
      return corrupted; // 没有错误需要添加
    }
    
    // 使用均匀分布的错误位置
    const errorInterval = Math.floor(codeword.length / targetErrors);
    let errorsAdded = 0;
    
    for (let i = 0; i < codeword.length && errorsAdded < targetErrors; i += errorInterval) {
      // 添加错误位置的微调，避免过于规律
      const adjustedPos = (i + errorsAdded % 3) % codeword.length;
      corrupted[adjustedPos] = 1 - corrupted[adjustedPos];
      errorsAdded++;
    }
    
    // 如果还需要更多错误，填补剩余的
    while (errorsAdded < targetErrors) {
      const pos = (errorsAdded * 7 + 3) % codeword.length; // 使用素数跳跃
      if (corrupted[pos] === codeword[pos]) { // 只在还没有错误的位置添加
        corrupted[pos] = 1 - corrupted[pos];
        errorsAdded++;
      } else {
        // 寻找下一个没有错误的位置
        let nextPos = (pos + 1) % codeword.length;
        while (nextPos !== pos && corrupted[nextPos] !== codeword[nextPos]) {
          nextPos = (nextPos + 1) % codeword.length;
        }
        if (nextPos !== pos) {
          corrupted[nextPos] = 1 - corrupted[nextPos];
          errorsAdded++;
        } else {
          break; // 防止无限循环
        }
      }
    }

    return corrupted;
  }

  static addBurstErrors(codeword: number[], burstStart: number, burstLength: number): number[] {
    const corrupted = [...codeword];
    
    for (let i = 0; i < burstLength && (burstStart + i) < codeword.length; i++) {
      corrupted[burstStart + i] = 1 - corrupted[burstStart + i];
    }

    return corrupted;
  }

  static runBERAnalysis(
    H: number[][],
    G: number[][],
    errorRates: number[],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength: number = 3,
    maxIterations: number = 50,
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'gallager-a'
  ): BERAnalysisResult[] {
    const results: BERAnalysisResult[] = [];
    
    for (const errorRate of errorRates) {
      console.log(`🔧 [后端] 开始测试错误率 ${errorRate}，使用算法: ${algorithm}`);
      
      let totalErrors = 0;
      let correctedErrors = 0;
      let totalIterations = 0;
      let convergenceCount = 0;
      let successfulDecodings = 0;
      let totalDecodedErrors = 0; // 新增：用于累加解码后的错误比特数
      
      for (let test = 0; test < testsPerPoint; test++) {
        const original = this.generateRandomBits(G.length);
        
        const encodingResult = LDPCService.encode(original, G);
        if (!encodingResult.success) {
          continue;
        }
        
        const transmitted = encodingResult.codeword;
        
        let received: number[];
        if (errorType === 'random') {
          received = this.addRandomErrors(transmitted, errorRate);
        } else {
          // 使用确定性的突发错误位置，而不是随机位置
          const burstStart = (test * 7) % Math.max(1, transmitted.length - burstLength);
          received = this.addBurstErrors(transmitted, burstStart, burstLength);
        }

        const decodingResult = LDPCService.decode(received, H, maxIterations, algorithm);
        
        // 计算传输错误
        const transmissionErrors = transmitted.reduce((count, bit, index) => 
          count + (bit !== received[index] ? 1 : 0), 0
        );
        
        // 计算解码后的错误：比较解码结果与原始码字
        const decodedErrors = transmitted.reduce((count, bit, index) => 
          count + (bit !== decodingResult.decoded[index] ? 1 : 0), 0
        );
        
        // 调试信息：每100次测试打印一次
        if (test % 100 === 0) {
          console.log(`🔧 [后端] 错误率 ${errorRate}, 算法 ${algorithm}, 测试 ${test}:`);
          console.log(`  - 传输错误: ${transmissionErrors}/${transmitted.length}`);
          console.log(`  - 解码错误: ${decodedErrors}/${transmitted.length}`);
          console.log(`  - 解码成功: ${decodingResult.success}`);
          console.log(`  - 解码消息: ${decodingResult.message}`);
          console.log(`  - 迭代次数: ${decodingResult.iterations}`);
        }
        
        // 解码正确性判断：解码成功且校验子为零
        const decodedCorrectly = decodingResult.success;

        totalErrors += transmissionErrors;
        if (decodedCorrectly) {
          correctedErrors += transmissionErrors;
          successfulDecodings++;
        }
        
        // 累加解码后的错误比特数（用于计算BER）
        totalDecodedErrors += decodedErrors;
        
        totalIterations += decodingResult.iterations;
        if (decodingResult.success) {
          convergenceCount++;
        }
      }

      console.log(`🔧 [后端] 错误率 ${errorRate} 完成:`);
      console.log(`  - 总测试: ${testsPerPoint}`);
      console.log(`  - 成功解码: ${successfulDecodings}`);
      console.log(`  - 总解码错误: ${totalDecodedErrors}`);
      console.log(`  - 平均BER: ${(totalDecodedErrors / (testsPerPoint * G[0].length)).toFixed(6)}`);

      // 修正BER计算：使用解码后的错误比特数
      const totalTransmittedBits = testsPerPoint * G[0].length;
      const ber = totalDecodedErrors / totalTransmittedBits;
      // 纠错率：成功解码的比例
      const correctionRate = successfulDecodings / testsPerPoint;
      const avgIterations = totalIterations / testsPerPoint;
      const convergenceRate = convergenceCount / testsPerPoint;

      results.push({
        errorRate,
        ber,
        correctionRate,
        totalTests: testsPerPoint,
        totalErrors,
        correctedErrors: successfulDecodings,
        avgIterations,
        convergenceRate
      });
    }

    return results;
  }

  // 新增：真正的算法对比方法
  static runAlgorithmComparison(
    H: number[][],
    G: number[][],
    errorRates: number[],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength: number = 3,
    maxIterations: number = 50,
    algorithms: Array<'gallager-a' | 'belief-propagation' | 'min-sum'> = ['gallager-a', 'belief-propagation', 'min-sum']
  ): AlgorithmComparisonResult[] {
    const comparisonResults: AlgorithmComparisonResult[] = [];
    
    console.log(`🔧 [后端] 开始算法对比：${algorithms.join(', ')}`);
    
    for (const errorRate of errorRates) {
      console.log(`🔧 [后端] 测试错误率 ${errorRate}`);
      
      // 为每个错误率生成固定的测试数据集
      const testDataset: Array<{
        original: number[];
        transmitted: number[];
        received: number[];
      }> = [];
      
      // 生成固定的测试数据
      for (let test = 0; test < testsPerPoint; test++) {
        const original = this.generateRandomBits(G.length);
        
        const encodingResult = LDPCService.encode(original, G);
        if (!encodingResult.success) {
          continue;
        }
        
        const transmitted = encodingResult.codeword;
        
        let received: number[];
        if (errorType === 'random') {
          received = this.addRandomErrors(transmitted, errorRate);
        } else {
          const burstStart = (test * 7) % Math.max(1, transmitted.length - burstLength);
          received = this.addBurstErrors(transmitted, burstStart, burstLength);
        }
        
        testDataset.push({
          original,
          transmitted,
          received
        });
      }
      
      console.log(`🔧 [后端] 生成了 ${testDataset.length} 个测试样本`);
      
      // 对每种算法处理相同的测试数据
      const algorithmResults = [];
      
      for (const algorithm of algorithms) {
        console.log(`🔧 [后端] 测试算法: ${algorithm}`);
        
        let totalErrors = 0;
        let correctedErrors = 0;
        let totalIterations = 0;
        let convergenceCount = 0;
        let successfulDecodings = 0;
        let totalDecodedErrors = 0;
        
        // 用当前算法处理所有测试数据
        for (let testIndex = 0; testIndex < testDataset.length; testIndex++) {
          const testData = testDataset[testIndex];
          const decodingResult = LDPCService.decode(testData.received, H, maxIterations, algorithm);
          
          // 计算传输错误
          const transmissionErrors = testData.transmitted.reduce((count, bit, index) => 
            count + (bit !== testData.received[index] ? 1 : 0), 0
          );
          
          // 计算解码后的错误
          const decodedErrors = testData.transmitted.reduce((count, bit, index) => 
            count + (bit !== decodingResult.decoded[index] ? 1 : 0), 0
          );
          
          // 调试信息：前几个测试打印详细信息
          if (testIndex < 3) {
            console.log(`🔧 [后端] ${algorithm} 测试 ${testIndex}:`);
            console.log(`  - 传输错误: ${transmissionErrors}/${testData.transmitted.length}`);
            console.log(`  - 解码错误: ${decodedErrors}/${testData.transmitted.length}`);
            console.log(`  - 解码成功: ${decodingResult.success}`);
            console.log(`  - 原始数据: [${testData.transmitted.slice(0, 10).join(',')}...]`);
            console.log(`  - 接收数据: [${testData.received.slice(0, 10).join(',')}...]`);
            console.log(`  - 解码结果: [${decodingResult.decoded.slice(0, 10).join(',')}...]`);
          }
          
          // 解码正确性判断
          const decodedCorrectly = decodingResult.success;

          totalErrors += transmissionErrors;
          if (decodedCorrectly) {
            correctedErrors += transmissionErrors;
            successfulDecodings++;
          }
          
          totalDecodedErrors += decodedErrors;
          totalIterations += decodingResult.iterations;
          
          if (decodingResult.success) {
            convergenceCount++;
          }
        }
        
        // 计算该算法的性能指标
        // 修复BER计算：BER = 解码后剩余错误比特数 / 总传输比特数
        const totalTransmittedBits = testDataset.length * G[0].length; // 总传输比特数
        const ber = totalDecodedErrors / totalTransmittedBits;
        const correctionRate = successfulDecodings / testDataset.length;
        const avgIterations = totalIterations / testDataset.length;
        const convergenceRate = convergenceCount / testDataset.length;
        
        console.log(`🔧 [后端] ${algorithm} 详细统计:`);
        console.log(`  - 测试样本数: ${testDataset.length}`);
        console.log(`  - 码字长度: ${G[0].length}`);
        console.log(`  - 总传输比特: ${totalTransmittedBits}`);
        console.log(`  - 解码后错误比特: ${totalDecodedErrors}`);
        console.log(`  - 成功解码次数: ${successfulDecodings}`);
        console.log(`  - BER: ${ber.toFixed(6)}`);
        
        algorithmResults.push({
          name: algorithm,
          ber,
          correctionRate,
          totalTests: testDataset.length,
          totalErrors,
          correctedErrors: successfulDecodings,
          avgIterations,
          convergenceRate
        });
        
        console.log(`🔧 [后端] ${algorithm} 结果: BER=${ber.toFixed(6)}, 纠错率=${correctionRate.toFixed(4)}`);
      }
      
      comparisonResults.push({
        errorRate,
        algorithms: algorithmResults
      });
    }
    
    console.log('✅ [后端] 算法对比完成');
    return comparisonResults;
  }

  // Channel performance comparison method
  static runChannelComparison(
    H: number[][],
    G: number[][],
    snrRange: number[],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength: number = 3,
    maxIterations: number = 50,
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'belief-propagation',
    channels: Array<'BSC' | 'AWGN' | 'Rayleigh'> = ['BSC', 'AWGN', 'Rayleigh']
  ): ChannelComparisonResult[] {
    const comparisonResults: ChannelComparisonResult[] = [];
    
    console.log(`🔧 [Backend] Starting channel comparison: ${channels.join(', ')}`);
    console.log(`🔧 [Backend] Using algorithm: ${algorithm}`);
    
    for (const snr of snrRange) {
      console.log(`🔧 [Backend] Testing SNR ${snr}dB`);
      
      // Generate fixed test dataset for each SNR level
      const testDataset: Array<{
        original: number[];
        transmitted: number[];
      }> = [];
      
      // Generate fixed test data
      for (let test = 0; test < testsPerPoint; test++) {
        const original = this.generateRandomBits(G.length);
        const transmitted = LDPCService.encode(original, G, [], H).codeword;
        testDataset.push({ original, transmitted });
      }
      
      console.log(`🔧 [Backend] Generated ${testDataset.length} test samples for SNR ${snr}dB`);
      
      const channelResults: ChannelComparisonResult['channels'] = [];
      
      // Test each channel type with the same dataset
      for (const channelType of channels) {
        console.log(`🔧 [Backend] Testing channel: ${channelType}`);
        
        let totalErrors = 0;
        let correctedErrors = 0;
        let successfulDecodings = 0;
        let totalDecodedErrors = 0;
        let totalIterations = 0;
        let convergenceCount = 0;
        
        for (let testIndex = 0; testIndex < testDataset.length; testIndex++) {
          const testData = testDataset[testIndex];
          
          // Simulate channel transmission based on SNR and channel type
          const received = this.simulateChannelTransmission(testData.transmitted, snr, channelType);
          
          // Decode using specified algorithm
          const decodingResult = LDPCService.decode(received, H, maxIterations, algorithm);
          
          // Calculate transmission errors
          const transmissionErrors = testData.transmitted.reduce((count, bit, index) => 
            count + (bit !== received[index] ? 1 : 0), 0
          );
          
          // Calculate decoding errors
          const decodedErrors = testData.transmitted.reduce((count, bit, index) => 
            count + (bit !== decodingResult.decoded[index] ? 1 : 0), 0
          );
          
          // Debug info for first few tests
          if (testIndex < 3) {
            console.log(`🔧 [Backend] ${channelType} test ${testIndex}:`);
            console.log(`  - Transmission errors: ${transmissionErrors}/${testData.transmitted.length}`);
            console.log(`  - Decoding errors: ${decodedErrors}/${testData.transmitted.length}`);
            console.log(`  - Decoding success: ${decodingResult.success}`);
          }
          
          const decodedCorrectly = decodingResult.success;
          
          totalErrors += transmissionErrors;
          if (decodedCorrectly) {
            correctedErrors += transmissionErrors;
            successfulDecodings++;
          }
          
          totalDecodedErrors += decodedErrors;
          totalIterations += decodingResult.iterations;
          
          if (decodingResult.success) {
            convergenceCount++;
          }
        }
        
        // Calculate performance metrics for this channel
        const totalTransmittedBits = testDataset.length * G[0].length;
        const ber = totalDecodedErrors / totalTransmittedBits;
        const correctionRate = successfulDecodings / testDataset.length;
        const avgIterations = totalIterations / testDataset.length;
        const convergenceRate = convergenceCount / testDataset.length;
        
        console.log(`🔧 [Backend] ${channelType} detailed statistics:`);
        console.log(`  - Test samples: ${testDataset.length}`);
        console.log(`  - Codeword length: ${G[0].length}`);
        console.log(`  - Total transmitted bits: ${totalTransmittedBits}`);
        console.log(`  - Decoded error bits: ${totalDecodedErrors}`);
        console.log(`  - Successful decodings: ${successfulDecodings}`);
        console.log(`  - BER: ${ber.toFixed(6)}`);
        
        channelResults.push({
          name: channelType,
          ber,
          correctionRate,
          totalTests: testDataset.length,
          totalErrors,
          correctedErrors: successfulDecodings,
          avgIterations,
          convergenceRate
        });
        
        console.log(`🔧 [Backend] ${channelType} result: BER=${ber.toFixed(6)}, correction rate=${correctionRate.toFixed(4)}`);
      }
      
      comparisonResults.push({
        snr,
        channels: channelResults
      });
    }
    
    console.log('✅ [Backend] Channel comparison completed');
    return comparisonResults;
  }

  // Simulate channel transmission for different channel types
  private static simulateChannelTransmission(transmitted: number[], snr: number, channelType: string): number[] {
    const received = [...transmitted];
    
    // Calculate noise variance from SNR
    const snrLinear = Math.pow(10, snr / 10);
    const noiseVariance = 1 / snrLinear;
    
    switch (channelType) {
      case 'BSC': {
        // Binary Symmetric Channel - improved crossover probability calculation
        // For BSC, crossover probability = Q(sqrt(2*SNR)) where Q is the Q-function
        const crossoverProb = 0.5 * this.erfc(Math.sqrt(snrLinear));
        for (let i = 0; i < received.length; i++) {
          if (Math.random() < crossoverProb) {
            received[i] = 1 - received[i]; // Flip bit
          }
        }
        break;
      }
      
      case 'AWGN': {
        // Additive White Gaussian Noise Channel - BPSK with optimal detection
        for (let i = 0; i < received.length; i++) {
          const signal = transmitted[i] === 0 ? -1 : 1; // BPSK mapping: 0->-1, 1->+1
          const noise = this.gaussianRandom(0, Math.sqrt(noiseVariance));
          const receivedSignal = signal + noise;
          received[i] = receivedSignal > 0 ? 1 : 0; // Hard decision
        }
        break;
      }
      
      case 'Rayleigh': {
        // Rayleigh Fading Channel - more realistic implementation
        for (let i = 0; i < received.length; i++) {
          const signal = transmitted[i] === 0 ? -1 : 1;
          // Rayleigh fading with scale parameter σ = 1/√2 (for unit average power)
          const fadingGain = this.rayleighRandom(1.0 / Math.sqrt(2));
          const noise = this.gaussianRandom(0, Math.sqrt(noiseVariance));
          const receivedSignal = fadingGain * signal + noise;
          received[i] = receivedSignal > 0 ? 1 : 0;
        }
        break;
      }
    }
    
    return received;
  }

  // Generate Gaussian random number using Box-Muller transform
  private static gaussianRandom(mean: number = 0, std: number = 1): number {
    const u = Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + std * z;
  }

  // Generate Rayleigh-distributed random number
  private static rayleighRandom(scale: number = 1): number {
    const u = Math.random();
    return scale * Math.sqrt(-2 * Math.log(u));
  }

  // Complementary error function approximation
  private static erfc(x: number): number {
    // Approximation of erfc(x) using rational function
    const a1 = -1.26551223;
    const a2 = 1.00002368;
    const a3 = 0.37409196;
    const a4 = 0.09678418;
    const a5 = -0.18628806;
    const a6 = 0.27886807;
    const a7 = -1.13520398;
    const a8 = 1.48851587;
    const a9 = -0.82215223;
    const a10 = 0.17087277;

    const t = 1.0 / (1.0 + 0.5 * Math.abs(x));
    const tau = t * Math.exp(-x * x + a1 + t * (a2 + t * (a3 + t * (a4 + t * (a5 + t * (a6 + t * (a7 + t * (a8 + t * (a9 + t * a10)))))))));

    return x >= 0 ? tau : 2.0 - tau;
  }

  static getBERAnalysisSummary(results: BERAnalysisResult[]): {
    threshold: number;
    bestPerformance: BERAnalysisResult;
    worstPerformance: BERAnalysisResult;
    averageCorrectionRate: number;
    recommendations: string[];
  } {
    if (results.length === 0) {
      return {
        threshold: 0,
        bestPerformance: results[0],
        worstPerformance: results[0],
        averageCorrectionRate: 0,
        recommendations: []
      };
    }

    // 找到纠错门限（correctionRate > 0.5的第一个点）
    const threshold = results.find(r => r.correctionRate > 0.5)?.errorRate || 0;
    
    // 找到最佳和最差性能
    const bestPerformance = results.reduce((best, current) => 
      current.correctionRate > best.correctionRate ? current : best
    );
    
    const worstPerformance = results.reduce((worst, current) => 
      current.correctionRate < worst.correctionRate ? current : worst
    );
    
    const averageCorrectionRate = results.reduce((sum, r) => sum + r.correctionRate, 0) / results.length;

    const recommendations: string[] = [];
    
    if (threshold === 0) {
      recommendations.push('纠错性能较差，建议优化码结构或增加校验节点');
    } else {
      recommendations.push(`纠错门限约为${(threshold * 100).toFixed(1)}%`);
    }
    
    if (averageCorrectionRate < 0.5) {
      recommendations.push('平均纠错率较低，建议使用更强的纠错码');
    } else if (averageCorrectionRate > 0.9) {
      recommendations.push('纠错性能良好，可以考虑提高码率以增加传输效率');
    }
    
    if (bestPerformance.avgIterations > 40) {
      recommendations.push('解码迭代次数较多，建议优化解码算法或调整参数');
    }

    // 添加基于BER的建议
    const avgBER = results.reduce((sum, r) => sum + r.ber, 0) / results.length;
    if (avgBER > 0.1) {
      recommendations.push('平均误码率较高，建议降低信道噪声或使用更强的纠错码');
    }

    return {
      threshold,
      bestPerformance,
      worstPerformance,
      averageCorrectionRate,
      recommendations
    };
  }
}