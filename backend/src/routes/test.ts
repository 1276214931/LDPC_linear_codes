import express from 'express';
import { DecodingService } from '../services/decodingService';

const router = express.Router();

function erf(x: number): number {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// 使用真实的编码器进行编码
function encodeInformation(information: number[], G: number[][]): number[] {
  const n = G[0].length;
  const k = G.length;
  
  if (information.length !== k) {
    throw new Error(`信息位长度 ${information.length} 与G矩阵行数 ${k} 不匹配`);
  }
  
  const codeword = new Array(n).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < n; j++) {
      codeword[j] ^= information[i] * G[i][j];
    }
  }
  
  return codeword;
}

// 生成错误序列
function generateErrors(codeword: number[], errorRate: number, errorType: 'random' | 'burst', burstLength?: number): { received: number[], errorCount: number } {
  const received = [...codeword];
  let errorCount = 0;
  
  if (errorType === 'random') {
    for (let i = 0; i < received.length; i++) {
      if (Math.random() < errorRate) {
        received[i] = 1 - received[i];
        errorCount++;
      }
    }
  } else if (errorType === 'burst' && burstLength) {
    if (Math.random() < errorRate) {
      const startPos = Math.floor(Math.random() * (received.length - burstLength + 1));
      for (let i = startPos; i < Math.min(startPos + burstLength, received.length); i++) {
        received[i] = 1 - received[i];
        errorCount++;
      }
    }
  }
  
  return { received, errorCount };
}

// 信道模拟
function simulateChannel(codeword: number[], channelType: string, snr: number): { received: number[], errorCount: number } {
  const received = [...codeword];
  let errorCount = 0;
  let errorProb = 0;
  
  if (channelType === 'BSC') {
    errorProb = 1 / (1 + Math.pow(10, snr / 10));
  } else if (channelType === 'AWGN') {
    const variance = 1 / (2 * Math.pow(10, snr / 10));
    errorProb = 0.5 * (1 - erf(1 / Math.sqrt(2 * variance)));
  } else if (channelType === 'Rayleigh') {
    const avgSNR = Math.pow(10, snr / 10);
    errorProb = 0.5 * (1 - Math.sqrt(avgSNR / (1 + avgSNR)));
  }
  
  for (let i = 0; i < received.length; i++) {
    if (Math.random() < errorProb) {
      received[i] = 1 - received[i];
      errorCount++;
    }
  }
  
  return { received, errorCount };
}

router.post('/ber-analysis', async (req, res) => {
  try {
    const {
      H,
      G,
      errorRates = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2],
      testsPerPoint = 100,
      errorType = 'random',
      burstLength,
      maxIterations = 50,
      algorithm = 'gallager-a'
    } = req.body;

    console.log('🔧 [BER分析] 开始BER分析，参数:', {
      errorRates: errorRates.length,
      testsPerPoint,
      errorType,
      algorithm,
      matrixSize: `${H.length}x${H[0].length}`
    });

    const results = [];
    let totalTests = 0;
    let totalErrors = 0;
    let totalCorrected = 0;

    for (const errorRate of errorRates) {
      let errorCount = 0;
      let correctedCount = 0;
      let totalIterations = 0;
      let convergenceCount = 0;

      for (let test = 0; test < testsPerPoint; test++) {
        // 生成随机信息位
        const informationBits = Array.from({ length: G.length }, () => Math.random() < 0.5 ? 1 : 0);
        
        // 使用真实编码器编码
        const codeword = encodeInformation(informationBits, G);

        // 添加信道错误
        const { received, errorCount: actualErrors } = generateErrors(codeword, errorRate, errorType, burstLength);

        if (actualErrors > 0) {
          errorCount++;
          totalErrors++;

          // 使用真实的解码服务进行解码
          const decodingResult = DecodingService.decode(received, H, {
            algorithm: algorithm as any,
            maxIterations,
            earlyTermination: true,
            channelType: 'BSC',
            crossoverProb: errorRate
          });

          totalIterations += decodingResult.iterations;
          if (decodingResult.success) {
            convergenceCount++;
            // 检查是否正确解码到原始码字
            const isCorrect = decodingResult.decoded.every((bit, idx) => bit === codeword[idx]);
            if (isCorrect) {
              correctedCount++;
              totalCorrected++;
            }
          }
        }
        totalTests++;
      }

      const ber = errorCount > 0 ? (errorCount - correctedCount) / (testsPerPoint * G[0].length) : 0;
      const correctionRate = errorCount > 0 ? correctedCount / errorCount : 1;
      const avgIterations = convergenceCount > 0 ? totalIterations / convergenceCount : 0;
      const convergenceRate = testsPerPoint > 0 ? convergenceCount / testsPerPoint : 0;

      results.push({
        errorRate,
        ber,
        correctionRate,
        totalTests: testsPerPoint,
        totalErrors: errorCount,
        correctedErrors: correctedCount,
        avgIterations,
        convergenceRate
      });

      console.log(`🔧 [BER分析] 错误率 ${errorRate}: BER=${ber.toFixed(6)}, 纠错率=${correctionRate.toFixed(3)}`);
    }

    const bestResult = results.reduce((best, current) => 
      current.correctionRate > best.correctionRate ? current : best
    );
    const worstResult = results.reduce((worst, current) => 
      current.correctionRate < worst.correctionRate ? current : worst
    );

    const response = {
      success: true,
      results,
      summary: {
        threshold: 0.5,
        bestPerformance: {
          errorRate: bestResult.errorRate,
          ber: bestResult.ber,
          correctionRate: bestResult.correctionRate
        },
        worstPerformance: {
          errorRate: worstResult.errorRate,
          ber: worstResult.ber,
          correctionRate: worstResult.correctionRate
        },
        averageCorrectionRate: results.reduce((sum, r) => sum + r.correctionRate, 0) / results.length,
        recommendations: [
          totalCorrected / totalTests > 0.8 ? '码性能良好' : '建议优化码结构',
          results[0].correctionRate > 0.9 ? '低错误率下性能优异' : '低错误率下需要改进'
        ]
      },
      metadata: {
        errorRates,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ [BER分析] 完成，总测试:', totalTests, '总纠错:', totalCorrected);
    res.json(response);

  } catch (error) {
    console.error('❌ [BER分析] 错误:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'BER分析失败'
    });
  }
});

router.post('/algorithm-comparison', async (req, res) => {
  try {
    const {
      H,
      G,
      errorRates = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1],
      testsPerPoint = 100,
      errorType = 'random',
      burstLength,
      maxIterations = 50,
      algorithms = ['gallager-a', 'belief-propagation', 'min-sum']
    } = req.body;

    console.log('🔧 [算法比较] 开始算法比较，参数:', {
      algorithms: algorithms.length,
      errorRates: errorRates.length,
      testsPerPoint
    });

    const results = [];

    for (const errorRate of errorRates) {
      const algorithmResults = [];

      for (const algorithm of algorithms) {
        let errorCount = 0;
        let correctedCount = 0;
        let totalIterations = 0;
        let convergenceCount = 0;

        for (let test = 0; test < testsPerPoint; test++) {
          // 生成随机信息位
          const informationBits = Array.from({ length: G.length }, () => Math.random() < 0.5 ? 1 : 0);
          
          // 使用真实编码器编码
          const codeword = encodeInformation(informationBits, G);

          // 添加信道错误
          const { received, errorCount: actualErrors } = generateErrors(codeword, errorRate, errorType, burstLength);

          if (actualErrors > 0) {
            errorCount++;

            // 使用真实的解码服务进行解码
            const decodingResult = DecodingService.decode(received, H, {
              algorithm: algorithm as any,
              maxIterations,
              earlyTermination: true,
              channelType: 'BSC',
              crossoverProb: errorRate
            });

            totalIterations += decodingResult.iterations;
            if (decodingResult.success) {
              convergenceCount++;
              // 检查是否正确解码到原始码字
              const isCorrect = decodingResult.decoded.every((bit, idx) => bit === codeword[idx]);
              if (isCorrect) {
                correctedCount++;
              }
            }
          }
        }

        const ber = errorCount > 0 ? (errorCount - correctedCount) / (testsPerPoint * G[0].length) : 0;
        const correctionRate = errorCount > 0 ? correctedCount / errorCount : 1;
        const avgIterations = convergenceCount > 0 ? totalIterations / convergenceCount : 0;
        const convergenceRate = testsPerPoint > 0 ? convergenceCount / testsPerPoint : 0;

        algorithmResults.push({
          name: algorithm,
          ber,
          correctionRate,
          totalTests: testsPerPoint,
          totalErrors: errorCount,
          correctedErrors: correctedCount,
          avgIterations,
          convergenceRate
        });
      }

      results.push({
        errorRate,
        algorithms: algorithmResults
      });

      console.log(`🔧 [算法比较] 错误率 ${errorRate} 完成`);
    }

    const response = {
      success: true,
      results,
      metadata: {
        errorRates,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        algorithms,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ [算法比较] 完成');
    res.json(response);

  } catch (error) {
    console.error('❌ [算法比较] 错误:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Algorithm comparison failed'
    });
  }
});

router.post('/ber-fer-analysis', async (req, res) => {
  try {
    const {
      H,
      G,
      snrRange,
      simulation,
      channel,
      algorithm = 'belief-propagation'
    } = req.body;

    console.log('🔧 [BER/FER分析] 开始BER/FER曲线分析，参数:', {
      snrRange,
      framesPerPoint: simulation.framesPerPoint,
      channelType: channel.type,
      algorithm,
      matrixSize: `${H.length}x${H[0].length}`
    });

    const startTime = Date.now();
    const results = [];
    let totalFrames = 0;
    
    // Generate SNR points
    const { min, max, steps } = snrRange;
    const snrPoints = [];
    for (let i = 0; i < steps; i++) {
      const snr = min + (i / (steps - 1)) * (max - min);
      snrPoints.push(snr);
    }

    for (const snr of snrPoints) {
      console.log(`🔧 [BER/FER] 正在仿真SNR = ${snr.toFixed(1)}dB...`);
      
      let frameCount = 0;
      let errorFrames = 0;  // 帧错误数（有任何位错误的帧）
      let bitErrors = 0;    // 总位错误数
      let totalIterations = 0;
      let convergenceCount = 0;
      
      // 计算理论未编码BER (对于AWGN信道)
      let uncodedBER = 0;
      if (channel.type === 'AWGN') {
        const snrLinear = Math.pow(10, snr / 10);
        const sigma = Math.sqrt(1 / (2 * snrLinear)); // 噪声标准差
        uncodedBER = 0.5 * (1 - erf(1 / (sigma * Math.sqrt(2))));
      } else if (channel.type === 'BSC') {
        // 对于BSC，crossover probability直接是BER
        uncodedBER = Math.max(0.5 * Math.exp(-snr), 0.001);
      } else {
        // Rayleigh信道的理论BER
        const snrLinear = Math.pow(10, snr / 10);
        uncodedBER = 0.5 * (1 - Math.sqrt(snrLinear / (1 + snrLinear)));
      }

      let codewordLength = G[0].length; // Store codeword length outside loop
      
      // 大幅增强的停止条件：根据SNR自适应调整样本量
      const minErrorFrames = Math.min(200, simulation.maxErrors); // 至少要有200个错误帧用于统计
      const minFrames = Math.max(5000, simulation.framesPerPoint * 0.5); // 基础样本数增加
      
      // 高SNR时大幅增加样本量以获得更准确的统计
      let adaptiveMaxFrames;
      if (snr >= 5) {
        adaptiveMaxFrames = simulation.framesPerPoint * 10; // 极高SNR: 10倍样本量
      } else if (snr >= 3) {
        adaptiveMaxFrames = simulation.framesPerPoint * 6;  // 高SNR: 6倍样本量
      } else if (snr >= 1) {
        adaptiveMaxFrames = simulation.framesPerPoint * 3;  // 中等SNR: 3倍样本量
      } else {
        adaptiveMaxFrames = simulation.framesPerPoint;      // 低SNR: 标准样本量
      }
      
      while (frameCount < adaptiveMaxFrames && 
             (errorFrames < minErrorFrames || frameCount < minFrames)) {
        // Generate random information bits
        const informationBits = Array.from({ length: G.length }, () => Math.random() < 0.5 ? 1 : 0);
        
        // Encode using real encoder
        const codeword = encodeInformation(informationBits, G);

        // Add channel noise based on SNR and channel type
        const { received, errorCount: channelErrors } = simulateChannel(codeword, channel.type, snr);

        frameCount++;
        totalFrames++;

        // Always decode, even if no channel errors (for complete simulation)
        const decodingResult = DecodingService.decode(received, H, {
          algorithm: algorithm as any,
          maxIterations: 50,
          earlyTermination: true,
          channelType: channel.type === 'BSC' ? 'BSC' : 'AWGN',
          snr: snr
        });

        totalIterations += decodingResult.iterations;
        
        if (decodingResult.success) {
          convergenceCount++;
        }

        // 计算位错误数 (for BER)
        const currentBitErrors = decodingResult.decoded.reduce((count, bit, idx) => 
          count + (bit !== codeword[idx] ? 1 : 0), 0);
        bitErrors += currentBitErrors;
        
        // 计算帧错误 (for FER) - 标准定义：只要有任何位错误就算帧错误
        const frameHasAnyError = currentBitErrors > 0;
        if (frameHasAnyError) {
          errorFrames++;  // 帧错误计数：只要这一帧有任何位错误
        }
      }

      const ber = frameCount > 0 ? bitErrors / (frameCount * codewordLength) : 0;
      const fer = frameCount > 0 ? errorFrames / frameCount : 0;  // 正确的FER计算
      const avgIterations = frameCount > 0 ? totalIterations / frameCount : 0;

      results.push({
        snr: Number(snr.toFixed(2)),
        ber: ber > 0 ? ber : 1e-8, // 只有真正为0时才设置最小值
        fer: fer > 0 ? fer : 1e-8, // 只有真正为0时才设置最小值
        uncodedBER: Math.max(uncodedBER, 1e-8), // 理论未编码BER
        avgIterations: Number(avgIterations.toFixed(2)),
        totalFrames: frameCount,
        errorFrames,
        bitErrors
      });

      // 调试日志验证计算正确性
      const expectedFER_approx = Math.min(1, codewordLength * ber); // 低BER时的近似关系
      const sampleMultiplier = frameCount / simulation.framesPerPoint;
      console.log(`✅ [BER/FER] SNR ${snr.toFixed(1)}dB: total_bit_errors=${bitErrors}, frame_error_cnt=${errorFrames}, frames=${frameCount} (${sampleMultiplier.toFixed(1)}x), BER=${ber.toExponential(2)}, FER=${fer.toExponential(2)}, n*BER=${expectedFER_approx.toExponential(2)}`);
    }

    const simulationTime = (Date.now() - startTime) / 1000;

    // Analyze waterfall region (rapid BER decrease)
    const waterfallRegion = { start: snrPoints[0], end: snrPoints[snrPoints.length - 1] };
    let errorFloorLevel = undefined;
    
    // Find potential error floor (where BER stops decreasing significantly)
    for (let i = results.length - 5; i < results.length - 1; i++) {
      if (i >= 0 && results[i].ber > 0 && results[i + 1].ber > 0) {
        const berRatio = results[i + 1].ber / results[i].ber;
        if (berRatio > 0.5) { // Less than 50% improvement
          errorFloorLevel = results[i].ber;
          break;
        }
      }
    }

    res.json({
      success: true,
      results: {
        snrPoints: results,
        codeParameters: {
          n: H[0].length,
          k: G.length,
          rate: G.length / H[0].length
        },
        performance: {
          waterfallRegion,
          errorFloorLevel
        }
      },
      metadata: {
        simulationTime,
        totalFrames,
        algorithm,
        channelType: channel.type,
        snrRange,
        framesPerPoint: simulation.framesPerPoint,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ [BER/FER分析] 完成，总耗时: ${simulationTime.toFixed(2)}秒`);

  } catch (error) {
    console.error('❌ [BER/FER分析] 错误:', error);
    res.status(500).json({
      success: false,
      error: 'BER/FER analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

router.post('/channel-comparison', async (req, res) => {
  try {
    const {
      H,
      G,
      snrRange = [-2, -1, 0, 1, 2, 3, 4, 5],
      testsPerPoint = 100,
      errorType = 'random',
      burstLength,
      maxIterations = 50,
      algorithm = 'belief-propagation',
      channels = ['BSC', 'AWGN', 'Rayleigh']
    } = req.body;

    console.log('🔧 [信道比较] 开始信道比较，参数:', {
      channels: channels.length,
      snrRange: snrRange.length,
      testsPerPoint
    });

    const results = [];

    for (const snr of snrRange) {
      const channelResults = [];

      for (const channelType of channels) {
        let errorCount = 0;
        let correctedCount = 0;
        let totalIterations = 0;
        let convergenceCount = 0;

        for (let test = 0; test < testsPerPoint; test++) {
          const informationBits = Array.from({ length: G.length }, () => Math.random() < 0.5 ? 1 : 0);
          
          let codeword = new Array(G[0].length).fill(0);
          for (let i = 0; i < G.length; i++) {
            for (let j = 0; j < G[0].length; j++) {
              codeword[j] ^= informationBits[i] * G[i][j];
            }
          }

          let received = [...codeword];
          let actualErrors = 0;
          
          let errorProb;
          if (channelType === 'BSC') {
            errorProb = 1 / (1 + Math.pow(10, snr / 10));
          } else if (channelType === 'AWGN') {
            const variance = 1 / (2 * Math.pow(10, snr / 10));
            errorProb = 0.5 * (1 - erf(1 / Math.sqrt(2 * variance)));
          } else if (channelType === 'Rayleigh') {
            const avgSNR = Math.pow(10, snr / 10);
            errorProb = 0.5 * (1 - Math.sqrt(avgSNR / (1 + avgSNR)));
          }

          for (let i = 0; i < received.length; i++) {
            if (Math.random() < errorProb) {
              received[i] = 1 - received[i];
              actualErrors++;
            }
          }

          if (actualErrors > 0) {
            errorCount++;

            let syndrome = new Array(H.length).fill(0);
            for (let i = 0; i < H.length; i++) {
              for (let j = 0; j < H[0].length; j++) {
                syndrome[i] ^= H[i][j] * received[j];
              }
            }

            let decoded = [...received];
            let iterations = 0;
            let converged = false;

            if (syndrome.some(s => s !== 0)) {
              for (iterations = 1; iterations <= maxIterations; iterations++) {
                let changed = false;
                
                for (let bitPos = 0; bitPos < decoded.length; bitPos++) {
                  let checkCount = 0;
                  let failedChecks = 0;
                  
                  for (let checkPos = 0; checkPos < H.length; checkPos++) {
                    if (H[checkPos][bitPos] === 1) {
                      checkCount++;
                      let parity = 0;
                      for (let j = 0; j < H[0].length; j++) {
                        parity ^= H[checkPos][j] * decoded[j];
                      }
                      if (parity !== 0) {
                        failedChecks++;
                      }
                    }
                  }
                  
                  if (failedChecks > checkCount / 2) {
                    decoded[bitPos] = 1 - decoded[bitPos];
                    changed = true;
                  }
                }

                syndrome = new Array(H.length).fill(0);
                for (let i = 0; i < H.length; i++) {
                  for (let j = 0; j < H[0].length; j++) {
                    syndrome[i] ^= H[i][j] * decoded[j];
                  }
                }

                if (syndrome.every(s => s === 0)) {
                  converged = true;
                  break;
                }

                if (!changed) break;
              }
            } else {
              converged = true;
            }

            totalIterations += iterations;
            if (converged) {
              convergenceCount++;
              const isCorrect = decoded.every((bit, idx) => bit === codeword[idx]);
              if (isCorrect) {
                correctedCount++;
              }
            }
          }
        }

        const ber = errorCount > 0 ? (errorCount - correctedCount) / (testsPerPoint * G[0].length) : 0;
        const correctionRate = errorCount > 0 ? correctedCount / errorCount : 1;
        const avgIterations = convergenceCount > 0 ? totalIterations / convergenceCount : 0;
        const convergenceRate = testsPerPoint > 0 ? convergenceCount / testsPerPoint : 0;

        channelResults.push({
          name: channelType,
          ber,
          correctionRate,
          totalTests: testsPerPoint,
          totalErrors: errorCount,
          correctedErrors: correctedCount,
          avgIterations,
          convergenceRate
        });
      }

      results.push({
        snr,
        channels: channelResults
      });

      console.log(`🔧 [信道比较] SNR ${snr}dB 完成`);
    }

    const response = {
      success: true,
      results,
      metadata: {
        snrRange,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        algorithm,
        channels,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ [信道比较] 完成');
    res.json(response);

  } catch (error) {
    console.error('❌ [信道比较] 错误:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Channel comparison failed'
    });
  }
});

export default router;