export type ChannelType = 'BSC' | 'AWGN' | 'BEC' | 'AWGN-SOFT' | 'Rayleigh';

export interface ChannelConfig {
  type: ChannelType;
  snr?: number;          // For AWGN channels (dB)
  crossoverProb?: number; // For BSC channel
  erasureProb?: number;   // For BEC channel
  variance?: number;      // For AWGN channels
}

export interface ChannelOutput {
  transmitted: number[];
  received: number[] | number[]; // Hard or soft decision
  errors: number[];
  errorCount: number;
  channelLLR?: number[]; // For soft decision
}

export class ChannelService {
  
  static transmitThroughChannel(
    codeword: number[],
    config: ChannelConfig
  ): ChannelOutput {
    switch (config.type) {
      case 'BSC':
        return this.bscChannel(codeword, config.crossoverProb || 0.1);
      case 'AWGN':
        return this.awgnChannel(codeword, config.snr || 0);
      case 'AWGN-SOFT':
        return this.awgnSoftChannel(codeword, config.snr || 0);
      case 'Rayleigh':
        return this.rayleighChannel(codeword, config.snr || 0);
      case 'BEC':
        return this.becChannel(codeword, config.erasureProb || 0.1);
      default:
        return this.bscChannel(codeword, 0.1);
    }
  }

  private static bscChannel(codeword: number[], crossoverProb: number): ChannelOutput {
    const transmitted = [...codeword];
    const received = transmitted.map(bit => 
      Math.random() < crossoverProb ? 1 - bit : bit
    );
    
    const errors = transmitted.map((bit, index) => 
      bit !== received[index] ? 1 : 0
    );
    
    const errorCount = errors.reduce((sum: number, error: number) => sum + error, 0);

    return {
      transmitted,
      received,
      errors,
      errorCount
    };
  }

  private static awgnChannel(codeword: number[], snrDb: number): ChannelOutput {
    const snrLinear = Math.pow(10, snrDb / 10);
    const variance = 1 / (2 * snrLinear); // For BPSK
    const stdDev = Math.sqrt(variance);
    
    const transmitted = [...codeword];
    
    // BPSK modulation: 0 -> +1, 1 -> -1
    const modulated = transmitted.map(bit => bit === 0 ? 1 : -1);
    
    // Add AWGN noise
    const noisy = modulated.map(symbol => 
      symbol + this.gaussianRandom(0, stdDev)
    );
    
    // Hard decision demodulation
    const received = noisy.map(symbol => symbol < 0 ? 1 : 0);
    
    const errors = transmitted.map((bit, index) => 
      bit !== received[index] ? 1 : 0
    );
    
    const errorCount = errors.reduce((sum: number, error: number) => sum + error, 0);

    return {
      transmitted,
      received,
      errors,
      errorCount
    };
  }

  private static awgnSoftChannel(codeword: number[], snrDb: number): ChannelOutput {
    const snrLinear = Math.pow(10, snrDb / 10);
    const variance = 1 / (2 * snrLinear);
    const stdDev = Math.sqrt(variance);
    
    const transmitted = [...codeword];
    
    // BPSK modulation: 0 -> +1, 1 -> -1
    const modulated = transmitted.map(bit => bit === 0 ? 1 : -1);
    
    // Add AWGN noise
    const noisy = modulated.map(symbol => 
      symbol + this.gaussianRandom(0, stdDev)
    );
    
    // Calculate LLR values: LLR = 2 * received / variance
    const channelLLR = noisy.map(symbol => 2 * symbol / variance);
    
    // Hard decision for error counting
    const received = noisy.map(symbol => symbol < 0 ? 1 : 0);
    
    const errors = transmitted.map((bit, index) => 
      bit !== received[index] ? 1 : 0
    );
    
    const errorCount = errors.reduce((sum: number, error: number) => sum + error, 0);

    return {
      transmitted,
      received,
      errors,
      errorCount,
      channelLLR
    };
  }

  private static becChannel(codeword: number[], erasureProb: number): ChannelOutput {
    const transmitted = [...codeword];
    const received = transmitted.map(bit => 
      Math.random() < erasureProb ? -1 : bit // -1 indicates erasure
    );
    
    const errors = transmitted.map((bit, index) => 
      received[index] === -1 ? 1 : (bit !== received[index] ? 1 : 0)
    );
    
    const errorCount = errors.reduce((sum: number, error: number) => sum + error, 0);

    return {
      transmitted,
      received,
      errors,
      errorCount
    };
  }

  private static rayleighChannel(codeword: number[], snrDb: number): ChannelOutput {
    const snrLinear = Math.pow(10, snrDb / 10);
    const noiseVariance = 1 / (2 * snrLinear); // For BPSK
    const noiseStdDev = Math.sqrt(noiseVariance);
    
    const transmitted = [...codeword];
    
    // BPSK modulation: 0 -> +1, 1 -> -1
    const modulated = transmitted.map(bit => bit === 0 ? 1 : -1);
    
    // Generate Rayleigh fading coefficients and add AWGN noise
    const noisy = modulated.map(symbol => {
      // Rayleigh fading: |h|^2 is exponentially distributed
      // h = sqrt(X^2 + Y^2) where X,Y ~ N(0, 0.5)
      const h_real = this.gaussianRandom(0, 1/Math.sqrt(2));
      const h_imag = this.gaussianRandom(0, 1/Math.sqrt(2));
      const fadingCoeff = Math.sqrt(h_real * h_real + h_imag * h_imag);
      
      // Apply fading and add noise
      const fadedSymbol = symbol * fadingCoeff;
      const noisySymbol = fadedSymbol + this.gaussianRandom(0, noiseStdDev);
      
      return noisySymbol;
    });
    
    // Calculate LLR values for soft decision
    const channelLLR = noisy.map(symbol => 2 * symbol / noiseVariance);
    
    // Hard decision demodulation
    const received = noisy.map(symbol => symbol < 0 ? 1 : 0);
    
    const errors = transmitted.map((bit, index) => 
      bit !== received[index] ? 1 : 0
    );
    
    const errorCount = errors.reduce((sum: number, error: number) => sum + error, 0);

    return {
      transmitted,
      received,
      errors,
      errorCount,
      channelLLR
    };
  }

  private static gaussianRandom(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    let u1 = Math.random();
    let u2 = Math.random();
    
    // Avoid log(0)
    u1 = Math.max(u1, 1e-10);
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  static calculateTheoreticalBER(snrDb: number, channelType: ChannelType): number {
    const snrLinear = Math.pow(10, snrDb / 10);
    
    switch (channelType) {
      case 'BSC':
        // For BSC, BER = crossover probability
        return 0.1; // This should be configurable
      
      case 'AWGN':
      case 'AWGN-SOFT':
        // For BPSK over AWGN: BER = Q(sqrt(2*SNR))
        return this.qFunction(Math.sqrt(2 * snrLinear));
      
      case 'Rayleigh':
        // For BPSK over Rayleigh fading: BER = 0.5 * (1 - sqrt(SNR/(1+SNR)))
        return 0.5 * (1 - Math.sqrt(snrLinear / (1 + snrLinear)));
      
      case 'BEC':
        // For BEC, error rate = erasure probability
        return 0.1; // This should be configurable
      
      default:
        return 0.1;
    }
  }

  private static qFunction(x: number): number {
    // Approximation of Q-function (complementary error function)
    return 0.5 * (1 - this.erf(x / Math.sqrt(2)));
  }

  private static erf(x: number): number {
    // Approximation of error function
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

  static getChannelInfo(channelType: ChannelType): {
    name: string;
    description: string;
    parameters: string[];
    outputType: 'hard' | 'soft' | 'erasure';
  } {
    const channels = {
      'BSC': {
        name: '二进制对称信道',
        description: '以固定概率p翻转每个比特的硬判决信道',
        parameters: ['crossoverProb'],
        outputType: 'hard' as const
      },
      'AWGN': {
        name: '加性高斯白噪声信道',
        description: '添加高斯噪声后进行硬判决的信道',
        parameters: ['snr'],
        outputType: 'hard' as const
      },
      'AWGN-SOFT': {
        name: '软判决AWGN信道',
        description: '添加高斯噪声并输出LLR值的软判决信道',
        parameters: ['snr'],
        outputType: 'soft' as const
      },
      'Rayleigh': {
        name: '瑞利衰落信道',
        description: '具有瑞利衰落的无线信道，模拟移动通信环境',
        parameters: ['snr'],
        outputType: 'soft' as const
      },
      'BEC': {
        name: '二进制擦除信道',
        description: '以固定概率擦除比特的信道',
        parameters: ['erasureProb'],
        outputType: 'erasure' as const
      }
    };

    return channels[channelType];
  }

  static generateSNRRange(minSnr: number, maxSnr: number, steps: number): number[] {
    const snrRange = [];
    const stepSize = (maxSnr - minSnr) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      snrRange.push(minSnr + i * stepSize);
    }
    
    return snrRange;
  }

  static estimateCapacity(config: ChannelConfig): number {
    switch (config.type) {
      case 'BSC':
        const p = config.crossoverProb || 0.1;
        return 1 - this.binaryEntropy(p);
      
      case 'AWGN':
      case 'AWGN-SOFT':
        const snrLinear = Math.pow(10, (config.snr || 0) / 10);
        return 0.5 * Math.log2(1 + snrLinear);
      
      case 'Rayleigh':
        // For Rayleigh fading channel with perfect CSI at receiver
        // This is an approximation - exact capacity is complex
        const snrLinearRay = Math.pow(10, (config.snr || 0) / 10);
        return Math.max(0, Math.log2(Math.E) * snrLinearRay * Math.exp(1/snrLinearRay) * this.exponentialIntegral(1/snrLinearRay));
      
      case 'BEC':
        const e = config.erasureProb || 0.1;
        return 1 - e;
      
      default:
        return 0;
    }
  }

  private static binaryEntropy(p: number): number {
    if (p === 0 || p === 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  private static exponentialIntegral(x: number): number {
    // Approximation of exponential integral E1(x) for small x
    // For simplicity, we use a basic approximation
    if (x === 0) return Infinity;
    if (x < 1) {
      // Use series expansion for small x
      return -0.5772 - Math.log(x) + x - x*x/4 + x*x*x/18;
    } else {
      // Use asymptotic expansion for large x
      return Math.exp(-x) / x * (1 - 1/x + 2/(x*x));
    }
  }
}