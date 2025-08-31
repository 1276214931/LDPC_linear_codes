export interface GraphNode {
  id: string;
  type: 'bit' | 'check';
  position: { x: number; y: number };
  label: string;
  connections: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface LDPCGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MatrixGenerationResult {
  H: number[][];
  G: number[][];
  n: number;
  k: number;
  minDistance: number;
  isValid: boolean;
  columnPermutation?: number[];
}

export interface EncodingResult {
  codeword: number[];
  success: boolean;
  message?: string;
  error?: string;
}

export interface DecodingResult {
  decoded: number[];
  success: boolean;
  iterations: number;
  correctedErrors: number;
  message?: string;
}

export interface ErrorTestConfig {
  errorType: 'random' | 'burst';
  errorRate: number;
  burstLength?: number;
  testCount: number;
}

export interface ErrorTestResult {
  totalTests: number;
  totalErrors: number;
  correctedErrors: number;
  errorRate: number;
  ber: number;
  timestamp: number;
  details: {
    test: number;
    original: number[];
    transmitted: number[];
    received: number[];
    decoded: number[];
    errors: number;
    corrected: boolean;
  }[];
}

export interface MatrixAnalysisResult {
  success: boolean;
  error?: string;
  analysis: {
    codeParameters: {
      n: number;
      k: number;
      m: number;
      rate: number;
    };
    matrixProperties: {
      density: number;
      isRegular: boolean;
    };
    degreeDistribution: {
      bitNodeDegrees: number[];
      checkNodeDegrees: number[];
    };
    performanceEstimate: {
      minDistance: number;
      shannonLimit: number;
    };
  };
}

export interface MatrixValidationResult {
  isValid: boolean;
  errors: string[];
}