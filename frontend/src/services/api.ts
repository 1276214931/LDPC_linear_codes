import axios from 'axios';
import { LDPCGraph, MatrixData, ErrorTestResult } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export interface MatrixGenerationResponse {
  success: boolean;
  H: number[][];
  G: number[][];
  n: number;
  k: number;
  minDistance: number;
  isValid: boolean;
  matrices: {
    H: number[][];
    G: number[][];
    n: number;
    k: number;
    minDistance: number;
    isValid: boolean;
  };
  analysis: {
    codeRate: number;
    density: number;
    averageDegree: {
      bit: number;
      check: number;
    };
  };
  error?: string;
}

export interface EncodingResponse {
  codeword: number[];
  success: boolean;
  message?: string;
  H?: number[][];
  G?: number[][];
  n?: number;
  k?: number;
  minDistance?: number;
  error?: string;
}

export interface DecodingResponse {
  decoded: number[];
  success: boolean;
  iterations: number;
  correctedErrors: number;
  message?: string;
  algorithm?: string;
  H?: number[][];
  G?: number[][];
  n?: number;
  k?: number;
  minDistance?: number;
  error?: string;
}

export interface SimulationResponse {
  success: boolean;
  result: {
    totalTests: number;
    totalErrors: number;
    correctedErrors: number;
    errorRate: number;
    ber: number;
    timestamp: number;
    details: Array<{
      test: number;
      original: number[];
      transmitted: number[];
      received: number[];
      decoded: number[];
      errors: number;
      corrected: boolean;
    }>;
  };
  config: {
    errorType: 'random' | 'burst';
    errorRate: number;
    burstLength?: number;
    testCount: number;
  };
  timestamp: string;
  error?: string;
}

export interface BERAnalysisResponse {
  success: boolean;
  results: Array<{
    errorRate: number;
    ber: number;
    correctionRate: number;
    totalTests: number;
    totalErrors: number;
    correctedErrors: number;
    avgIterations: number;
    convergenceRate: number;
  }>;
  summary: {
    threshold: number;
    bestPerformance: {
      errorRate: number;
      ber: number;
      correctionRate: number;
    };
    worstPerformance: {
      errorRate: number;
      ber: number;
      correctionRate: number;
    };
    averageCorrectionRate: number;
    recommendations: string[];
  };
  metadata: {
    errorRates: number[];
    testsPerPoint: number;
    errorType: 'random' | 'burst';
    burstLength?: number;
    maxIterations: number;
    timestamp: string;
  };
  error?: string;
}

export interface Template {
  name: string;
  description: string;
  graph: LDPCGraph;
}

export interface TemplatesResponse {
  success: boolean;
  templates: Template[];
  timestamp: string;
}

export const graphAPI = {
  validate: async (graph: LDPCGraph): Promise<{ isValid: boolean; errors: string[] }> => {
    try {
      const response = await api.post('/api/graph/validate', { graph });
      return response.data;
    } catch (error) {
      throw new Error('Graph validation failed');
    }
  },

  export: async (graph: LDPCGraph, format: 'json' | 'csv' = 'json'): Promise<string> => {
    try {
      const response = await api.post('/api/graph/export', { graph, format });
      return response.data.data;
    } catch (error) {
      throw new Error('Graph export failed');
    }
  },

  import: async (data: string, format: 'json' | 'csv' = 'json'): Promise<LDPCGraph> => {
    try {
      const response = await api.post('/api/graph/import', { data, format });
      return response.data.graph;
    } catch (error) {
      throw new Error('Graph import failed');
    }
  },

  getTemplates: async (): Promise<Template[]> => {
    try {
      const response = await api.get('/api/graph/templates');
      return response.data.templates;
    } catch (error) {
      throw new Error('Failed to fetch templates');
    }
  },

  autoConnect: async (
    graph: LDPCGraph, 
    strategy: 'random' | 'regular' | 'sparse' = 'random'
  ): Promise<{ graph: LDPCGraph; statistics: any }> => {
    try {
      const response = await api.post('/api/graph/auto-connect', { graph, strategy });
      return {
        graph: response.data.graph,
        statistics: response.data.statistics
      };
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || '自动连线失败');
      }
      throw new Error('自动连线失败');
    }
  },
};

export const matrixAPI = {
  generate: async (graph: LDPCGraph): Promise<MatrixGenerationResponse> => {
    try {
      const response = await api.post('/api/matrix/generate', { graph });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || '矩阵生成失败');
      }
      throw new Error('矩阵生成失败');
    }
  },

  analyze: async (H: number[][], G: number[][]): Promise<any> => {
    try {
      const response = await api.post('/api/matrix/analyze', { H, G });
      return response.data;
    } catch (error) {
      throw new Error('矩阵分析失败');
    }
  },
};

export interface ChannelTransmitResponse {
  success: boolean;
  transmitted: number[];
  received: number[] | number[];
  errors: number[];
  errorCount: number;
  channelLLR?: number[];
  channelInfo: {
    name: string;
    description: string;
    parameters: string[];
    outputType: 'hard' | 'soft' | 'erasure';
  };
  error?: string;
}

export interface ChannelConfig {
  type: 'BSC' | 'AWGN' | 'AWGN-SOFT' | 'Rayleigh' | 'BEC';
  snr?: number;
  crossoverProb?: number;
  erasureProb?: number;
  variance?: number;
}

export const codingAPI = {
  encode: async (information: number[], graph: LDPCGraph): Promise<EncodingResponse> => {
    try {
      const response = await api.post('/api/coding/encode', {
        information,
        graph,
      });
      console.log('API响应:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('编码API错误:', error);
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Encoding failed');
      }
      throw new Error('Encoding failed');
    }
  },

  decode: async (
    received: number[],
    graph: LDPCGraph,
    maxIterations: number = 50,
    algorithm: string = 'belief-propagation'
  ): Promise<DecodingResponse> => {
    try {
      const response = await api.post('/api/coding/decode', {
        received,
        graph,
        maxIterations,
        algorithm,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Decoding failed');
      }
      throw new Error('Decoding failed');
    }
  },

  channelTransmit: async (codeword: number[], channelConfig: ChannelConfig): Promise<ChannelTransmitResponse> => {
    try {
      const response = await api.post('/api/coding/channel-transmit', {
        codeword,
        channelConfig,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || '信道传输失败');
      }
      throw new Error('信道传输失败');
    }
  },

  getChannelInfo: async (): Promise<Record<string, any>> => {
    try {
      const response = await api.get('/api/coding/channels');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || '获取信道信息失败');
      }
      throw new Error('获取信道信息失败');
    }
  },

  calculateChannelCapacity: async (channelConfig: ChannelConfig): Promise<any> => {
    try {
      const response = await api.post('/api/coding/channel-capacity', {
        channelConfig,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || '计算信道容量失败');
      }
      throw new Error('计算信道容量失败');
    }
  },
};

export interface AlgorithmComparisonResponse {
  success: boolean;
  results: Array<{
    errorRate: number;
    algorithms: Array<{
      name: string;
      ber: number;
      correctionRate: number;
      totalTests: number;
      totalErrors: number;
      correctedErrors: number;
      avgIterations: number;
      convergenceRate: number;
    }>;
  }>;
  metadata: {
    errorRates: number[];
    testsPerPoint: number;
    errorType: 'random' | 'burst';
    burstLength?: number;
    maxIterations: number;
    algorithms: string[];
    timestamp: string;
  };
  error?: string;
}

export interface ChannelComparisonResponse {
  success: boolean;
  results: Array<{
    snr: number;
    channels: Array<{
      name: string;
      ber: number;
      correctionRate: number;
      totalTests: number;
      totalErrors: number;
      correctedErrors: number;
      avgIterations: number;
      convergenceRate: number;
    }>;
  }>;
  metadata: {
    snrRange: number[];
    testsPerPoint: number;
    errorType: 'random' | 'burst';
    burstLength?: number;
    maxIterations: number;
    algorithm: string;
    channels: string[];
    timestamp: string;
  };
  error?: string;
}

export interface BERFERAnalysisResponse {
  success: boolean;
  results: {
    snrPoints: Array<{
      snr: number;
      ber: number;
      fer: number;
      uncodedBER: number;  // 添加未编码BER
      avgIterations: number;
      totalFrames: number;
      errorFrames: number;
      bitErrors: number;
      confidenceInterval?: {
        berLower: number;
        berUpper: number;
        ferLower: number;
        ferUpper: number;
      };
    }>;
    codeParameters: {
      n: number;
      k: number;
      rate: number;
    };
    thresholdSNR?: number;
    performance: {
      waterfallRegion: { start: number; end: number };
      errorFloorLevel?: number;
    };
  };
  metadata: {
    simulationTime: number;
    totalFrames: number;
    algorithm: string;
    channelType: string;
    snrRange: { min: number; max: number; steps: number };
    framesPerPoint: number;
    timestamp: string;
  };
  error?: string;
}

export const testAPI = {
  runBERAnalysis: async (
    H: number[][],
    G: number[][],
    errorRates: number[] = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength?: number,
    maxIterations: number = 50,
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'gallager-a'
  ): Promise<BERAnalysisResponse> => {
    try {
      const response = await api.post('/api/test/ber-analysis', {
        H,
        G,
        errorRates,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        algorithm,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'BER分析失败');
      }
      throw new Error('BER分析失败');
    }
  },

  // Algorithm comparison API
  runAlgorithmComparison: async (
    H: number[][],
    G: number[][],
    errorRates: number[] = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength?: number,
    maxIterations: number = 50,
    algorithms: Array<'gallager-a' | 'belief-propagation' | 'min-sum'> = ['gallager-a', 'belief-propagation', 'min-sum']
  ): Promise<AlgorithmComparisonResponse> => {
    try {
      const response = await api.post('/api/test/algorithm-comparison', {
        H,
        G,
        errorRates,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        algorithms,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Algorithm comparison failed');
      }
      throw new Error('Algorithm comparison failed');
    }
  },

  // Channel comparison API
  runChannelComparison: async (
    H: number[][],
    G: number[][],
    snrRange: number[] = [-2, -1, 0, 1, 2, 3, 4, 5],
    testsPerPoint: number = 100,
    errorType: 'random' | 'burst' = 'random',
    burstLength?: number,
    maxIterations: number = 50,
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'belief-propagation',
    channels: Array<'BSC' | 'AWGN' | 'Rayleigh'> = ['BSC', 'AWGN', 'Rayleigh']
  ): Promise<ChannelComparisonResponse> => {
    try {
      const response = await api.post('/api/test/channel-comparison', {
        H,
        G,
        snrRange,
        testsPerPoint,
        errorType,
        burstLength,
        maxIterations,
        algorithm,
        channels,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'Channel comparison failed');
      }
      throw new Error('Channel comparison failed');
    }
  },

  // BER/FER curve analysis API
  runBERFERAnalysis: async (
    H: number[][],
    G: number[][],
    snrRange: { min: number; max: number; steps: number },
    framesPerPoint: number = 10000,
    maxErrors: number = 100,
    channelType: 'AWGN' | 'BSC' | 'Rayleigh' = 'AWGN',
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'belief-propagation'
  ): Promise<BERFERAnalysisResponse> => {
    try {
      const response = await api.post('/api/test/ber-fer-analysis', {
        H,
        G,
        snrRange,
        simulation: {
          framesPerPoint,
          maxErrors,
          maxTime: 300 // 5 minutes timeout
        },
        channel: {
          type: channelType
        },
        algorithm
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.error || 'BER/FER analysis failed');
      }
      throw new Error('BER/FER analysis failed');
    }
  },
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/api/health');
    return response.data.status === 'OK';
  } catch (error) {
    return false;
  }
};

export default api;