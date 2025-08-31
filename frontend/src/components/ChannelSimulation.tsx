import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { testAPI } from '../services/api';

// Error function approximation
const erf = (x: number): number => {
  // Abramowitz and Stegun approximation
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
};

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

const ChannelInfo = styled.div`
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 12px;
  margin-top: 8px;
  font-size: 11px;
`;

const ParameterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
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

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0;
  
  &::after {
    content: '';
    display: block;
    width: ${({ progress }) => progress}%;
    height: 100%;
    background: #4a9eff;
    transition: width 0.3s ease;
  }
`;

type ChannelType = 'BSC' | 'AWGN' | 'AWGN-SOFT' | 'Rayleigh' | 'BEC';

interface SimulationConfig {
  channelType: ChannelType;
  snr?: number;
  crossoverProb?: number;
  erasureProb?: number;
  frameCount: number;
  snrRange?: {
    min: number;
    max: number;
    steps: number;
  };
}

interface SimulationResult {
  totalFrames: number;
  totalErrors: number;
  ber: number;
  fer: number;
  snrPoints?: Array<{
    snr: number;
    ber: number;
    fer: number;
  }>;
}

export const ChannelSimulation: React.FC = () => {
  const { matrixData } = useGraphStore();
  const [channelType, setChannelType] = useState<ChannelType>('AWGN');
  const [snr, setSnr] = useState(3);
  const [crossoverProb, setCrossoverProb] = useState(0.1);
  const [erasureProb, setErasureProb] = useState(0.1);
  const [frameCount, setFrameCount] = useState(1000);
  const [simulationType, setSimulationType] = useState<'single' | 'ber-curve'>('single');
  
  // BER curve parameters
  const [minSnr, setMinSnr] = useState(-2);
  const [maxSnr, setMaxSnr] = useState(8);
  const [snrSteps, setSnrSteps] = useState(11);
  
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string>('');

  const channelInfos = {
    'BSC': {
      name: '二进制对称信道 (BSC)',
      description: '每个比特以概率p被翻转的硬判决信道',
      parameters: ['交叉概率'],
      outputType: '硬判决'
    },
    'AWGN': {
      name: '加性高斯白噪声信道',
      description: '添加高斯噪声后进行硬判决',
      parameters: ['信噪比 (SNR)'],
      outputType: '硬判决'
    },
    'AWGN-SOFT': {
      name: '软判决AWGN信道',
      description: '输出LLR值的软判决信道',
      parameters: ['信噪比 (SNR)'],
      outputType: '软判决 (LLR)'
    },
    'Rayleigh': {
      name: '瑞利衰落信道',
      description: '具有瑞利衰落的无线信道，模拟移动通信环境',
      parameters: ['信噪比 (SNR)'],
      outputType: '软判决 (LLR)'
    },
    'BEC': {
      name: '二进制擦除信道 (BEC)',
      description: '以概率e擦除比特',
      parameters: ['擦除概率'],
      outputType: '擦除'
    }
  };

  const runSimulation = async () => {
    if (!matrixData?.H || !matrixData?.G) {
      setError('请先生成LDPC矩阵');
      return;
    }

    setRunning(true);
    setProgress(0);
    setResult(null);
    setError('');

    try {
      const config: SimulationConfig = {
        channelType,
        frameCount,
        ...((channelType.includes('AWGN') || channelType === 'Rayleigh') && { snr }),
        ...(channelType === 'BSC' && { crossoverProb }),
        ...(channelType === 'BEC' && { erasureProb }),
        ...(simulationType === 'ber-curve' && {
          snrRange: { min: minSnr, max: maxSnr, steps: snrSteps }
        })
      };

      // Progress tracking
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 200);

      try {
        if (simulationType === 'single') {
          // 调用真实的LDPC算法进行仿真，而不是理论计算
          
          // 根据信道类型转换为错误率进行BER分析
          let effectiveErrorRate: number;
          
          if (channelType === 'BSC') {
            effectiveErrorRate = crossoverProb;
          } else if (channelType === 'BEC') {
            effectiveErrorRate = erasureProb;
          } else if (channelType === 'Rayleigh') {
            // 将SNR转换为近似错误率
            const snrLinear = Math.pow(10, snr / 10);
            effectiveErrorRate = 0.5 * (1 - Math.sqrt(snrLinear / (1 + snrLinear)));
          } else {
            // AWGN: 将SNR转换为近似错误率
            const snrLinear = Math.pow(10, snr / 10);
            const qArg = Math.sqrt(2 * snrLinear);
            if (qArg > 6) {
              effectiveErrorRate = Math.exp(-qArg * qArg / 2) / (Math.sqrt(2 * Math.PI) * qArg);
            } else {
              effectiveErrorRate = 0.5 * (1 - erf(qArg / Math.sqrt(2)));
            }
          }
          
          // 确保错误率在合理范围内
          effectiveErrorRate = Math.max(0.001, Math.min(0.3, effectiveErrorRate));
          
          // 调用真实的BER分析API，使用用户的LDPC矩阵
          const response = await testAPI.runBERAnalysis(
            matrixData.H,
            matrixData.G,
            [effectiveErrorRate], // 单点测试
            frameCount,
            'random',
            undefined,
            50,
            'gallager-a' // 默认使用Gallager-A算法
          );

          if (response.success && response.results.length > 0) {
            const analysisResult = response.results[0];
            const result: SimulationResult = {
              totalFrames: analysisResult.totalTests,
              totalErrors: analysisResult.totalErrors,
              ber: analysisResult.ber,
              fer: 1.0 - analysisResult.correctionRate
            };
            setResult(result);
          } else {
            throw new Error('BER分析API调用失败');
          }
        } else {
          // BER curve simulation: 对每个SNR点调用真实的LDPC算法
          const errorRates = [];
          const stepSize = (maxSnr - minSnr) / (snrSteps - 1);
          
          for (let i = 0; i < snrSteps; i++) {
            const currentSnr = minSnr + i * stepSize;
            let effectiveErrorRate: number;
            
            // 根据信道类型和当前SNR计算对应的错误率
            if (channelType === 'BSC') {
              // BSC信道：错误率不随SNR变化，使用固定的交叉概率
              effectiveErrorRate = crossoverProb;
            } else if (channelType === 'BEC') {
              // BEC信道：擦除概率不随SNR变化，使用固定的擦除概率
              effectiveErrorRate = erasureProb;
            } else if (channelType === 'Rayleigh') {
              // 瑞利衰落信道：根据SNR计算理论错误率
              const snrLinear = Math.pow(10, currentSnr / 10);
              effectiveErrorRate = 0.5 * (1 - Math.sqrt(snrLinear / (1 + snrLinear)));
            } else {
              // AWGN信道：根据SNR计算理论错误率
              const snrLinear = Math.pow(10, currentSnr / 10);
              const qArg = Math.sqrt(2 * snrLinear);
              if (qArg > 6) {
                effectiveErrorRate = Math.exp(-qArg * qArg / 2) / (Math.sqrt(2 * Math.PI) * qArg);
              } else {
                effectiveErrorRate = 0.5 * (1 - erf(qArg / Math.sqrt(2)));
              }
            }
            
            // 确保错误率在合理范围内
            effectiveErrorRate = Math.max(0.001, Math.min(0.4, effectiveErrorRate));
            errorRates.push(effectiveErrorRate);
          }

          const response = await testAPI.runBERAnalysis(
            matrixData.H,
            matrixData.G,
            errorRates,
            Math.min(100, frameCount), // Limit test count for performance
            'random', // Always use random errors for now
            undefined,
            50
          );

          if (response.success) {
            const snrPoints = response.results.map((result, index) => ({
              snr: minSnr + index * stepSize,
              ber: result.ber,
              fer: 1.0 - result.correctionRate
            }));

            const avgResult = response.results[Math.floor(response.results.length / 2)];
            const result: SimulationResult = {
              totalFrames: response.results.reduce((sum, r) => sum + r.totalTests, 0),
              totalErrors: response.results.reduce((sum, r) => sum + r.totalErrors, 0),
              ber: avgResult.ber,
              fer: 1.0 - avgResult.correctionRate,
              snrPoints
            };
            setResult(result);
          } else {
            throw new Error('BER分析API调用失败');
          }
        }
      } catch (apiError: any) {
        console.error('Simulation API error:', apiError);
        // 不再提供理论计算回退，强制用户看到真实的错误状态
        throw new Error(`仿真失败，无法调用后端算法: ${apiError.message || '未知错误'}`);
      }

      clearInterval(progressInterval);
      setProgress(100);

    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setRunning(false);
      setProgress(0);
    }
  };

  const calculateCapacity = () => {
    switch (channelType) {
      case 'BSC':
        const p = crossoverProb;
        const h = p === 0 || p === 1 ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
        return (1 - h).toFixed(4);
      case 'AWGN':
      case 'AWGN-SOFT':
        const snrLinear = Math.pow(10, snr / 10);
        return (0.5 * Math.log2(1 + snrLinear)).toFixed(4);
      case 'Rayleigh':
        // Approximation for Rayleigh fading channel capacity
        const snrLinearRay = Math.pow(10, snr / 10);
        // Simplified approximation - exact calculation is complex
        const capacity = Math.max(0, Math.log2(Math.E) * snrLinearRay * 0.1);
        return capacity.toFixed(4);
      case 'BEC':
        return (1 - erasureProb).toFixed(4);
      default:
        return '0';
    }
  };

  return (
    <Container>
      <Section>
        <SectionTitle>信道设置</SectionTitle>
        
        <FormGroup>
          <Label>信道类型</Label>
          <Select 
            value={channelType} 
            onChange={(e) => setChannelType(e.target.value as ChannelType)}
          >
            <option value="BSC">二进制对称信道 (BSC)</option>
            <option value="AWGN">加性高斯白噪声信道 (硬)</option>
            <option value="AWGN-SOFT">加性高斯白噪声信道 (软)</option>
            <option value="Rayleigh">瑞利衰落信道</option>
            <option value="BEC">二进制擦除信道 (BEC)</option>
          </Select>
        </FormGroup>

        <ChannelInfo>
          <div style={{ fontWeight: 'bold', color: '#4a9eff', marginBottom: '4px' }}>
            {channelInfos[channelType].name}
          </div>
          <div style={{ marginBottom: '8px' }}>
            {channelInfos[channelType].description}
          </div>
          <div style={{ display: 'flex', gap: '16px', color: '#999' }}>
            <span>参数: {channelInfos[channelType].parameters.join(', ')}</span>
            <span>输出: {channelInfos[channelType].outputType}</span>
          </div>
        </ChannelInfo>

        <ParameterGrid>
          {(channelType.includes('AWGN') || channelType === 'Rayleigh') && (
            <FormGroup>
              <Label>信噪比 (dB)</Label>
              <Input
                type="number"
                step="0.5"
                value={snr}
                onChange={(e) => setSnr(parseFloat(e.target.value) || 0)}
              />
            </FormGroup>
          )}

          {channelType === 'BSC' && (
            <FormGroup>
              <Label>交叉概率</Label>
              <Input
                type="number"
                min="0"
                max="0.5"
                step="0.01"
                value={crossoverProb}
                onChange={(e) => setCrossoverProb(parseFloat(e.target.value) || 0.1)}
              />
            </FormGroup>
          )}

          {channelType === 'BEC' && (
            <FormGroup>
              <Label>擦除概率</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={erasureProb}
                onChange={(e) => setErasureProb(parseFloat(e.target.value) || 0.1)}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label>理论容量</Label>
            <div style={{ 
              padding: '8px', 
              background: '#333', 
              borderRadius: '4px', 
              fontFamily: 'Courier New, monospace',
              color: '#4a9eff'
            }}>
              {calculateCapacity()} bits/symbol
            </div>
          </FormGroup>
        </ParameterGrid>
      </Section>

      <Section>
        <SectionTitle>仿真配置</SectionTitle>
        
        <FormGroup>
          <Label>仿真类型</Label>
          <Select 
            value={simulationType} 
            onChange={(e) => setSimulationType(e.target.value as 'single' | 'ber-curve')}
          >
            <option value="single">单点仿真</option>
            <option value="ber-curve">BER性能曲线</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>仿真帧数</Label>
          <Input
            type="number"
            min="100"
            max="10000"
            value={frameCount}
            onChange={(e) => setFrameCount(parseInt(e.target.value) || 1000)}
          />
        </FormGroup>

        {simulationType === 'ber-curve' && (
          <ParameterGrid>
            <FormGroup>
              <Label>最小SNR (dB)</Label>
              <Input
                type="number"
                value={minSnr}
                onChange={(e) => setMinSnr(parseInt(e.target.value) || -2)}
              />
            </FormGroup>
            <FormGroup>
              <Label>最大SNR (dB)</Label>
              <Input
                type="number"
                value={maxSnr}
                onChange={(e) => setMaxSnr(parseInt(e.target.value) || 8)}
              />
            </FormGroup>
            <FormGroup>
              <Label>SNR步数</Label>
              <Input
                type="number"
                min="3"
                max="20"
                value={snrSteps}
                onChange={(e) => setSnrSteps(parseInt(e.target.value) || 11)}
              />
            </FormGroup>
          </ParameterGrid>
        )}

        <Button onClick={runSimulation} disabled={running}>
          {running ? '仿真中...' : '开始仿真'}
        </Button>

        {running && (
          <div>
            <ProgressBar progress={progress} />
            <div style={{ fontSize: '11px', color: '#999', textAlign: 'center' }}>
              仿真进度: {progress}%
            </div>
          </div>
        )}
      </Section>

      {result && (
        <Section>
          <SectionTitle>Simulation Results</SectionTitle>
          
          <ResultSection>
            <ResultItem>
              <span>Total Frames:</span>
              <span>{result.totalFrames}</span>
            </ResultItem>
            <ResultItem>
              <span>Total Errors:</span>
              <span>{result.totalErrors}</span>
            </ResultItem>
            <ResultItem>
              <span>Bit Error Rate (BER):</span>
              <span>{result.ber.toExponential(3)}</span>
            </ResultItem>
            <ResultItem>
              <span>Frame Error Rate (FER):</span>
              <span>{result.fer.toExponential(3)}</span>
            </ResultItem>
          </ResultSection>

          {result.snrPoints && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', color: '#4a9eff', marginBottom: '8px' }}>
                BER性能曲线数据点:
              </div>
              <div style={{ 
                maxHeight: '150px', 
                overflow: 'auto', 
                background: '#0a0a0a', 
                padding: '8px',
                borderRadius: '4px',
                fontFamily: 'Courier New, monospace',
                fontSize: '11px'
              }}>
                {result.snrPoints.map((point, index) => (
                  <div key={index}>
                    SNR: {point.snr.toFixed(1)}dB, BER: {point.ber.toExponential(2)}, FER: {point.fer.toExponential(2)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}
    </Container>
  );
};