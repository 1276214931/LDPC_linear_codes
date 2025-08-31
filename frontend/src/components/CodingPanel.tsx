import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { codingAPI, matrixAPI } from '../services/api';
import { LDPCGraph } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div`
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 16px;
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #4a9eff;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const Label = styled.label`
  font-size: 12px;
  color: #ccc;
`;

const Select = styled.select`
  padding: 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  
  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`;

const Input = styled.input`
  padding: 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  
  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`;

const TextArea = styled.textarea`
  padding: 8px;
  background: #333;
  border: 1px solid #555;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  resize: vertical;
  min-height: 60px;
  
  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`;

const Button = styled.button`
  padding: 10px 16px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;
  
  &:hover {
    background: #357abd;
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  margin-right: 8px;
`;

const AlgorithmInfo = styled.div`
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  margin-top: 8px;
  font-size: 11px;
`;

const ResultSection = styled.div`
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  margin-top: 12px;
`;

const ResultItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TabContainer = styled.div`
  display: flex;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  margin-bottom: 16px;
  overflow: hidden;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 16px;
  background: ${({ $active }) => $active ? '#4a9eff' : 'transparent'};
  color: ${({ $active }) => $active ? 'white' : '#ccc'};
  border: none;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;
  
  &:hover {
    background: ${({ $active }) => $active ? '#357abd' : '#333'};
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 4px;
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 12px;
  margin-top: 8px;
  padding: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 4px;
`;

type DecodingAlgorithm = 'belief-propagation' | 'min-sum' | 'sum-product' | 'gallager-a' | 'gallager-b' | 'layered';

interface EncodingResult {
  codeword: number[];
  success: boolean;
  message?: string;
}

interface DecodingResult {
  decoded: number[];
  success: boolean;
  iterations: number;
  correctedErrors: number;
  message?: string;
  algorithm?: string;
  iterationHistory?: any[];
}

export const CodingPanel: React.FC = () => {
  const { nodes, edges, matrixData, exportGraph, setMatrixData: setGlobalMatrixData, setDecodingResult: setGlobalDecodingResult } = useGraphStore();
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  
  // Encoding related state
  const [informationBits, setInformationBits] = useState('1');
  const [encodingResult, setEncodingResult] = useState<EncodingResult | null>(null);
  const [encodingLoading, setEncodingLoading] = useState(false);
  const [encodingError, setEncodingError] = useState<string | null>(null);
  
  // Decoding related state
  const [algorithm, setAlgorithm] = useState<DecodingAlgorithm>('belief-propagation');
  const [maxIterations, setMaxIterations] = useState(50);
  const [scalingFactor, setScalingFactor] = useState(0.75);
  const [damping, setDamping] = useState(0.0);
  const [earlyTermination, setEarlyTermination] = useState(true);
  const [llrInput, setLlrInput] = useState(false);
  const [receivedData, setReceivedData] = useState('1 1 1 1');
  const [decodingResult, setDecodingResult] = useState<DecodingResult | null>(null);
  const [decodingLoading, setDecodingLoading] = useState(false);
  const [decodingError, setDecodingError] = useState<string | null>(null);

  const algorithmInfos = {
    'belief-propagation': {
      name: 'Belief Propagation',
      description: 'Soft-decision iterative decoding algorithm based on message passing, optimal performance but high complexity',
      complexity: 'High',
      performance: 'Optimal'
    },
    'min-sum': {
      name: 'Min-Sum',
      description: 'Simplified version of belief propagation, lower computational complexity, slightly reduced performance',
      complexity: 'Medium',
      performance: 'Good'
    },
    'sum-product': {
      name: 'Sum-Product',
      description: 'Sum-product algorithm, equivalent to belief propagation, suitable for probability calculations',
      complexity: 'High',
      performance: 'Optimal'
    },
    'gallager-a': {
      name: 'Gallager-A',
      description: 'Hard decision decoding algorithm based on majority decision, simple implementation',
      complexity: 'Low',
      performance: 'Fair'
    },
    'gallager-b': {
      name: 'Gallager-B',
      description: 'Enhanced version of Gallager-A, includes threshold decision',
      complexity: 'Low',
      performance: 'Fair'
    },
    'layered': {
      name: 'Layered Decoding',
      description: 'Efficient decoding algorithm with layer-wise processing, fast convergence',
      complexity: 'Medium',
      performance: 'Good'
    }
  };

  const handleEncode = async () => {
    setEncodingLoading(true);
    setEncodingError(null);
    setEncodingResult(null);
    
    try {
      // Parse information bits
      const information = informationBits.trim().split(/\s+/).map(bit => {
        const num = parseInt(bit);
        if (isNaN(num) || (num !== 0 && num !== 1)) {
          throw new Error('Information bits must be 0 or 1');
        }
        return num;
      });

      // 使用exportGraph获取修复后的图形数据
      const graphData = exportGraph();
      
      // 验证图形数据
      const bitNodes = graphData.nodes.filter(n => n.type === 'bit');
      const checkNodes = graphData.nodes.filter(n => n.type === 'check');
      
      if (bitNodes.length === 0 || checkNodes.length === 0) {
        throw new Error('Graph data incomplete, please ensure bit nodes and check nodes exist');
      }
      
      const expectedK = bitNodes.length - checkNodes.length;
      if (expectedK <= 0) {
        throw new Error('Invalid code parameters: number of check nodes cannot be greater than or equal to bit nodes');
      }
      
      if (information.length !== expectedK) {
        throw new Error(`Information bit length must be ${expectedK}, current is ${information.length}`);
      }

      console.log('Sending graph data:', graphData);
      console.log('Sending information bits:', information);

      // 如果没有矩阵数据，先生成矩阵
      if (!matrixData || matrixData.n === 0) {
        console.log('矩阵数据不存在，先生成矩阵...');
        try {
          const matrixResult = await matrixAPI.generate(graphData);
          console.log('矩阵生成结果:', matrixResult);

          if (matrixResult.success && matrixResult.isValid) {
            const newMatrixData = {
              H: matrixResult.H,
              G: matrixResult.G,
              n: matrixResult.n,
              k: matrixResult.k,
              minDistance: matrixResult.minDistance,
              isValid: matrixResult.isValid,
            };
            setGlobalMatrixData(newMatrixData);
            console.log('矩阵数据已更新:', newMatrixData);
          } else {
            throw new Error(matrixResult.error || '无法生成有效矩阵');
          }
        } catch (matrixError: any) {
          console.error('矩阵生成失败:', matrixError);
          throw new Error(`矩阵生成失败: ${matrixError.message}`);
        }
      }

      // 调用编码API
      const response = await codingAPI.encode(information, graphData);

      console.log('编码API响应:', response);

      // Translate common Chinese messages to English
      const translateMessage = (msg: string): string => {
        if (!msg) return msg;
        const translations: { [key: string]: string } = {
          '系统性编码成功': 'Systematic encoding successful',
          '编码成功': 'Encoding successful',
          '编码失败': 'Encoding failed',
          '矩阵生成成功': 'Matrix generation successful',
          '生成系统化LDPC码': 'Generated systematic LDPC code'
        };
        return translations[msg] || msg;
      };

      setEncodingResult({
        codeword: response.codeword || [],
        success: response.success || false,
        message: translateMessage(response.message)
      });
      
      // 如果编码响应包含矩阵信息，更新全局矩阵数据
      if (response.H && response.G && response.n && response.k) {
        const matrixData = {
          H: response.H,
          G: response.G,
          n: response.n,
          k: response.k,
          minDistance: response.minDistance || 0,
          isValid: true
        };
        console.log('从编码响应更新矩阵数据:', matrixData);
        setGlobalMatrixData(matrixData);
      }
    } catch (error: any) {
      console.error('编码错误详情:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Encoding failed';
      setEncodingError(errorMessage);
    } finally {
      setEncodingLoading(false);
    }
  };

  const handleDecode = async () => {
    setDecodingLoading(true);
    setDecodingError(null);
    setDecodingResult(null);
    setGlobalDecodingResult(null);
    
    try {
      const received = receivedData.trim().split(/\s+/).map(bit => {
        const num = parseInt(bit);
        if (isNaN(num) || (num !== 0 && num !== 1)) {
          throw new Error('Received data must be 0 or 1');
        }
        return num;
      });

      // 使用exportGraph获取修复后的图形数据
      const graphData = exportGraph();
      
      // 验证图形数据
      const bitNodes = graphData.nodes.filter(n => n.type === 'bit');
      const checkNodes = graphData.nodes.filter(n => n.type === 'check');
      
      if (bitNodes.length === 0 || checkNodes.length === 0) {
        throw new Error('Graph data incomplete, please ensure bit nodes and check nodes exist');
      }
      
      const expectedN = bitNodes.length;
      if (received.length !== expectedN) {
        throw new Error(`Received data length must be ${expectedN}, current length is ${received.length}`);
      }

      console.log('解码发送的图形数据:', graphData);
      console.log('解码发送的接收数据:', received);

      // 如果没有矩阵数据，先生成矩阵
      if (!matrixData || matrixData.n === 0) {
        console.log('矩阵数据不存在，先生成矩阵...');
        try {
          const matrixResult = await matrixAPI.generate(graphData);
          console.log('矩阵生成结果:', matrixResult);

          if (matrixResult.success && matrixResult.isValid) {
            const newMatrixData = {
              H: matrixResult.H,
              G: matrixResult.G,
              n: matrixResult.n,
              k: matrixResult.k,
              minDistance: matrixResult.minDistance,
              isValid: matrixResult.isValid,
            };
            setGlobalMatrixData(newMatrixData);
            console.log('矩阵数据已更新:', newMatrixData);
          } else {
            throw new Error(matrixResult.error || '无法生成有效矩阵');
          }
        } catch (matrixError: any) {
          console.error('矩阵生成失败:', matrixError);
          throw new Error(`矩阵生成失败: ${matrixError.message}`);
        }
      }

      // 调用解码API
      const response = await codingAPI.decode(received, graphData, maxIterations, algorithm);

      const decodingResultData = {
        decoded: response.decoded,
        success: response.success,
        iterations: response.iterations,
        correctedErrors: response.correctedErrors,
        message: response.message,
        algorithm: algorithm,
        timestamp: Date.now()
      };
      
      // 更新本地状态
      setDecodingResult(decodingResultData);
      
      // 更新全局状态
      setGlobalDecodingResult(decodingResultData);
      
      // 如果解码响应包含矩阵信息，更新全局矩阵数据
      if (response.H && response.G && response.n && response.k) {
        const matrixData = {
          H: response.H,
          G: response.G,
          n: response.n,
          k: response.k,
          minDistance: response.minDistance || 0,
          isValid: true
        };
        console.log('从解码响应更新矩阵数据:', matrixData);
        setGlobalMatrixData(matrixData);
      }
    } catch (error: any) {
      setDecodingError(error.response?.data?.message || error.message || 'Decoding failed');
    } finally {
      setDecodingLoading(false);
    }
  };

  const needsScaling = algorithm === 'min-sum' || algorithm === 'layered';
  const needsDamping = algorithm === 'belief-propagation' || algorithm === 'sum-product';

  // 计算码参数
  const k = matrixData ? matrixData.k : 0;

  // 调试信息
  console.log('当前图形状态:', {
    nodes: nodes.length,
    edges: edges.length,
    matrixData: matrixData,
    informationBits,
    receivedData
  });

  return (
    <Container>
      <TabContainer>
        <Tab 
          $active={activeTab === 'encode'} 
          onClick={() => setActiveTab('encode')}
        >
          Encoding
        </Tab>
        <Tab 
          $active={activeTab === 'decode'} 
          onClick={() => setActiveTab('decode')}
        >
          Decoding
        </Tab>
      </TabContainer>

      {activeTab === 'encode' && (
        <>
          <Section>
            <SectionTitle>
              📤 Encoding Function
            </SectionTitle>
            
            <FormGroup>
              <Label>Information Bits (Space-separated)</Label>
              <TextArea
                value={informationBits}
                onChange={(e) => setInformationBits(e.target.value)}
                placeholder={`Input ${k} information bits, e.g.: 1 0`}
              />
              <div style={{ fontSize: '11px', color: '#999' }}>
                Current code parameters: k={k} (number of information bits)
              </div>
            </FormGroup>

            <Button 
              onClick={handleEncode} 
              disabled={encodingLoading || !informationBits.trim() || k <= 0}
            >
              {encodingLoading ? 'Encoding...' : 'Start Encoding'}
            </Button>

            {encodingError && (
              <ErrorMessage>
                {encodingError}
              </ErrorMessage>
            )}

            {encodingResult && (
              <ResultSection>
                <ResultItem>
                  <span>Encoding Status:</span>
                  <span style={{ color: encodingResult.success ? '#10b981' : '#ef4444' }}>
                    {encodingResult.success ? 'Success' : 'Failed'}
                  </span>
                </ResultItem>
                <ResultItem>
                  <span>Codeword:</span>
                  <span style={{ fontFamily: 'Courier New, monospace' }}>
                    [{encodingResult.codeword.join(', ')}]
                  </span>
                </ResultItem>
                {encodingResult.message && (
                  <ResultItem>
                    <span>Description:</span>
                    <span>{encodingResult.message}</span>
                  </ResultItem>
                )}
              </ResultSection>
            )}
          </Section>
        </>
      )}

      {activeTab === 'decode' && (
        <>
          <Section>
            <SectionTitle>
              📥 Decoding Algorithm Configuration
            </SectionTitle>
            
            <FormGroup>
              <Label>Decoding Algorithm</Label>
              <Select 
                value={algorithm} 
                onChange={(e) => setAlgorithm(e.target.value as DecodingAlgorithm)}
              >
                <option value="belief-propagation">Belief Propagation (BP)</option>
                <option value="min-sum">Min-Sum</option>
                <option value="sum-product">Sum-Product</option>
                <option value="gallager-a">Gallager-A</option>
                <option value="gallager-b">Gallager-B</option>
                <option value="layered">Layered Decoding</option>
              </Select>
            </FormGroup>

            <AlgorithmInfo>
              <div style={{ fontWeight: 'bold', color: '#4a9eff', marginBottom: '4px' }}>
                {algorithmInfos[algorithm].name}
              </div>
              <div style={{ marginBottom: '8px' }}>
                {algorithmInfos[algorithm].description}
              </div>
              <div style={{ display: 'flex', gap: '16px', color: '#999' }}>
                <span>Complexity: {algorithmInfos[algorithm].complexity}</span>
                <span>Performance: {algorithmInfos[algorithm].performance}</span>
              </div>
            </AlgorithmInfo>

            <FormGroup>
              <Label>Maximum Iterations</Label>
              <Input
                type="number"
                min="1"
                max="200"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value) || 50)}
              />
            </FormGroup>

            {needsScaling && (
              <FormGroup>
                <Label>缩放因子</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={scalingFactor}
                  onChange={(e) => setScalingFactor(parseFloat(e.target.value) || 0.75)}
                />
              </FormGroup>
            )}

            {needsDamping && (
              <FormGroup>
                <Label>阻尼系数</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={damping}
                  onChange={(e) => setDamping(parseFloat(e.target.value) || 0)}
                />
              </FormGroup>
            )}

            <FormGroup>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="earlyTermination"
                  checked={earlyTermination}
                  onChange={(e) => setEarlyTermination(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Label htmlFor="earlyTermination" style={{ margin: 0, cursor: 'pointer' }}>
                  提前终止（校验通过时停止）
                </Label>
              </div>
            </FormGroup>

            <FormGroup>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="llrInput"
                  checked={llrInput}
                  onChange={(e) => setLlrInput(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Label htmlFor="llrInput" style={{ margin: 0, cursor: 'pointer' }}>
                  LLR输入（软判决）
                </Label>
              </div>
            </FormGroup>
          </Section>

          <Section>
            <SectionTitle>
              📥 Received Data
            </SectionTitle>
            
            <FormGroup>
              <Label>Received Codeword (space separated)</Label>
              <TextArea
                value={receivedData}
                onChange={(e) => setReceivedData(e.target.value)}
                placeholder="Enter received codeword, e.g.: 1 0 1 0 1 1 0"
              />
            </FormGroup>

            <Button 
              onClick={handleDecode} 
              disabled={decodingLoading || !receivedData.trim()}
            >
              {decodingLoading ? 'Decoding...' : 'Start Decoding'}
            </Button>

            {decodingError && (
              <ErrorMessage>
                {decodingError}
              </ErrorMessage>
            )}

            {decodingResult && (
              <ResultSection>
                <ResultItem>
                  <span>Decoding Status:</span>
                  <span style={{ color: decodingResult.success ? '#10b981' : '#ef4444' }}>
                    {decodingResult.success ? 'Success' : 'Failed'}
                  </span>
                </ResultItem>
                <ResultItem>
                  <span>Algorithm Used:</span>
                  <span style={{ fontWeight: 'bold', color: '#4a9eff' }}>
                    {decodingResult.algorithm ? algorithmInfos[decodingResult.algorithm]?.name || decodingResult.algorithm : algorithmInfos[algorithm].name}
                  </span>
                </ResultItem>
                <ResultItem>
                  <span>Iterations:</span>
                  <span>{decodingResult.iterations}</span>
                </ResultItem>
                <ResultItem>
                  <span>Corrected Errors:</span>
                  <span>{decodingResult.correctedErrors}</span>
                </ResultItem>
                <ResultItem>
                  <span>Decoding Result:</span>
                  <span style={{ fontFamily: 'Courier New, monospace' }}>
                    [{decodingResult.decoded.join(', ')}]
                  </span>
                </ResultItem>
                {decodingResult.message && (
                  <ResultItem>
                    <span>Description:</span>
                    <span>{decodingResult.message}</span>
                  </ResultItem>
                )}
              </ResultSection>
            )}
          </Section>
        </>
      )}
    </Container>
  );
}; 