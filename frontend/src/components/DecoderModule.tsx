import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { codingAPI } from '../services/api';
import { ChannelConfig } from './ChannelModule';

const Container = styled.div`
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusBadge = styled.span<{ $status: 'ready' | 'decoding' | 'success' | 'error' }>`
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${({ $status }) => {
    switch ($status) {
      case 'ready': return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
      case 'decoding': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      case 'success': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'error': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      default: return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
  }};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormRow = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #d1d5db;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '\2022';
    color: #8b5cf6;
    font-weight: 900;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    background: rgba(15, 15, 35, 0.9);
  }
  
  &:disabled {
    background: rgba(68, 71, 90, 0.3);
    color: #6b7280;
    cursor: not-allowed;
  }
  
  option {
    background: rgba(15, 15, 35, 0.95);
    color: #e2e8f0;
    padding: 8px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    background: rgba(15, 15, 35, 0.9);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-style: italic;
  }
  
  &:disabled {
    background: rgba(68, 71, 90, 0.3);
    color: #6b7280;
    cursor: not-allowed;
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    background: rgba(68, 71, 90, 0.5);
    color: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
`;

const InfoBox = styled.div`
  background: rgba(68, 71, 90, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 12px;
  font-size: 12px;
  color: #d1d5db;
  line-height: 1.4;
  font-family: 'Inter', sans-serif;
  
  strong {
    color: #8b5cf6;
    font-family: 'JetBrains Mono', monospace;
  }
`;

const ResultBox = styled.div`
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-family: 'Courier New', monospace;
  font-size: 10px;
  max-height: 80px;
  overflow-y: auto;
`;

const ErrorBox = styled.div`
  background: rgba(239, 68, 68, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  
  &::before {
    content: '\26A0\FE0F';
    font-size: 16px;
    flex-shrink: 0;
  }
`;

const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 10px;
`;

interface DecodingResult {
  decoded: number[];
  success: boolean;
  iterations: number;
  correctedErrors: number;
  message?: string;
}

interface DecoderModuleProps {
  channelConfig?: ChannelConfig;
}

export const DecoderModule: React.FC<DecoderModuleProps> = ({ channelConfig }) => {
  const { matrixData, setDecodingResult, exportGraph } = useGraphStore();
  const [algorithm, setAlgorithm] = useState<'gallager-a' | 'belief-propagation' | 'min-sum'>('gallager-a');
  const [receivedBits, setReceivedBits] = useState('1 0 1 1');
  const [status, setStatus] = useState<'ready' | 'decoding' | 'success' | 'error'>('ready');
  const [error, setError] = useState<string>('');

  // Intelligent algorithm recommendation based on channel configuration
  useEffect(() => {
    if (channelConfig) {
      if (channelConfig.type === 'BSC') {
        // BSC hard decision channel uses Gallager-A
        setAlgorithm('gallager-a');
      } else if (channelConfig.type === 'AWGN') {
        // AWGN soft decision channel, choose algorithm based on SNR
        if (channelConfig.snr !== undefined && channelConfig.snr > 6) {
          setAlgorithm('min-sum'); // High SNR: Min-Sum performance close to BP but lower complexity
        } else {
          setAlgorithm('belief-propagation'); // Low SNR: BP has better performance
        }
      } else if (channelConfig.type === 'Rayleigh') {
        // Rayleigh fading channel uses BP to handle fading
        setAlgorithm('belief-propagation');
      }
    }
  }, [channelConfig]);

  // Auto-generate example received data
  useEffect(() => {
    if (matrixData?.n) {
      const exampleBits = Array(matrixData.n).fill(0).map((_, i) => i % 3 === 0 ? 1 : 0).join(' ');
      setReceivedBits(exampleBits);
    }
  }, [matrixData?.n]);

  // Determine fixed iteration count based on algorithm and channel type
  const getMaxIterations = () => {
    if (channelConfig?.type === 'BSC') {
      return algorithm === 'gallager-a' ? 30 : 40;
    } else if (channelConfig?.type === 'AWGN') {
      return algorithm === 'belief-propagation' ? 50 : 30;
    } else if (channelConfig?.type === 'Rayleigh') {
      return algorithm === 'belief-propagation' ? 80 : 50;
    }
    return 50; // Default value
  };

  const handleDecode = async () => {
    const maxIterations = getMaxIterations();
    console.log('🔧 [前端] DecoderModule.handleDecode() 开始');
    console.log('🔧 [前端] 当前状态检查:', { hasMatrixData: !!matrixData, algorithm, maxIterations });
    
    if (!matrixData) {
      console.log('❌ [前端] 矩阵数据缺失');
      setError('Please generate LDPC matrix first');
      setStatus('error');
      return;
    }

    console.log('🔧 [前端] 开始解码流程...');
    setStatus('decoding');
    setError('');
    setDecodingResult(null);

    try {
      // 解析接收数据
      console.log('🔧 [前端] 解析接收数据:', receivedBits);
      const rawData = receivedBits.trim().split(/\s+/).map(bit => {
        const num = parseFloat(bit);
        if (isNaN(num)) {
          throw new Error(`"${bit}" is not a valid number`);
        }
        return num;
      });
      console.log('🔧 [前端] 原始数据解析结果:', rawData);
      
      // 根据信道配置处理数据
      let bits: number[];
      if (channelConfig?.type === 'BSC') {
        // BSC硬判决：只接受0和1
        bits = rawData.map(val => {
          const rounded = Math.round(val);
          if (rounded !== 0 && rounded !== 1) {
            throw new Error(`Under BSC channel "${val}" must be 0 or 1`);
          }
          return rounded;
        });
        console.log('🔧 [前端] BSC硬判决处理后的比特:', bits);
      } else {
        // AWGN/Rayleigh soft decision: accept continuous values (LLR)
        bits = rawData; // Keep original float values as LLR
        console.log('🔧 [前端] 软判决LLR数据:', bits);
      }

      if (bits.length !== matrixData.n) {
        throw new Error(`Received data length should be ${matrixData.n}, current is ${bits.length}`);
      }

      // 调用解码API
      let decodingResult: DecodingResult;
      
      try {
        console.log('🔧 [前端] 准备调用解码API');
        console.log('🔧 [前端] 算法:', algorithm, '迭代次数:', maxIterations);
        console.log('🔧 [前端] 信道类型:', channelConfig?.type);
        
        // 获取图形数据
        const graphData = exportGraph();
        console.log('🔧 [前端] 图形数据:', { 
          nodeCount: graphData.nodes.length,
          bitNodes: graphData.nodes.filter(n => n.type === 'bit').length,
          checkNodes: graphData.nodes.filter(n => n.type === 'check').length,
          edgeCount: graphData.edges.length 
        });
        
        // 调用解码API
        console.log('🔧 [前端] 调用 codingAPI.decode...');
        const response = await codingAPI.decode(bits, graphData, maxIterations, algorithm);
        console.log('✅ [前端] API调用成功，响应:', response);
        
        decodingResult = response;
      } catch (apiError: any) {
        console.error('❌ [前端] 解码API调用失败:', apiError);
        console.error('❌ [前端] 错误详情:', apiError.response?.data || apiError.message);
        // 设置失败结果
        decodingResult = {
          decoded: [],
          success: false,
          iterations: 0,
          correctedErrors: 0,
          message: `API call failed: ${apiError.response?.data?.error || apiError.message || 'Unknown error'}`
        };
      }

      // 保存结果到全局状态
      console.log('🔧 [前端] 处理解码结果:', decodingResult);
      if (decodingResult) {
        setDecodingResult({
          ...decodingResult,
          algorithm: algorithm,
          timestamp: Date.now()
        });
        
        setStatus(decodingResult.success ? 'success' : 'error');
        console.log('✅ [前端] 解码状态设置为:', decodingResult.success ? 'success' : 'error');
        
        if (!decodingResult.success) {
          setError(decodingResult.message || 'Decoding failed');
          console.log('❌ [前端] 解码失败，错误信息:', decodingResult.message);
        } else {
          console.log('✅ [前端] 解码成功:', { 
            iterations: decodingResult.iterations, 
            correctedErrors: decodingResult.correctedErrors 
          });
        }
      } else {
        console.error('❌ [前端] 解码结果为空');
        setError('Decoding result is empty');
        setStatus('error');
      }

    } catch (err: any) {
      console.error('❌ [前端] 解码过程异常:', err);
      setError(err.message || 'Error occurred during decoding process');
      setStatus('error');
    }
  };


  const getAlgorithmName = (alg: string): string => {
    switch (alg) {
      case 'gallager-a': return 'Gallager-A';
      case 'belief-propagation': return 'BP';
      case 'min-sum': return 'Min-Sum';
      default: return alg;
    }
  };

  const getAlgorithmOptions = () => {
    if (!channelConfig) {
      return [
        { value: 'gallager-a', label: 'Gallager-A', complexity: 'Low', performance: 'Medium' }
      ];
    }

    switch (channelConfig.type) {
      case 'BSC':
        return [
          { value: 'gallager-a', label: 'Gallager-A (Recommended)', complexity: 'Low', performance: 'Medium' },
          { value: 'belief-propagation', label: 'BP (Hard Decision)', complexity: 'High', performance: 'High' }
        ];
      case 'AWGN':
        return [
          { value: 'belief-propagation', label: 'BP (Recommended)', complexity: 'High', performance: 'Highest' },
          { value: 'min-sum', label: 'Min-Sum', complexity: 'Medium', performance: 'High' },
          { value: 'gallager-a', label: 'Gallager-A', complexity: 'Low', performance: 'Low' }
        ];
      case 'Rayleigh':
        return [
          { value: 'belief-propagation', label: 'BP (Recommended)', complexity: 'High', performance: 'Highest' },
          { value: 'min-sum', label: 'Min-Sum', complexity: 'Medium', performance: 'High' }
        ];
      default:
        return [
          { value: 'gallager-a', label: 'Gallager-A', complexity: 'Low', performance: 'Medium' }
        ];
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'decoding': return 'Decoding';
      case 'success': return 'Success';
      case 'error': return 'Failed';
      default: return 'Ready';
    }
  };

  const canDecode = matrixData && receivedBits.trim() && status !== 'decoding';

  return (
    <Container>
      <Header>
        <Title>📥 Decoder</Title>
        <StatusBadge $status={status}>{getStatusText()}</StatusBadge>
      </Header>

      <FormRow>
        <Label>Decoding Algorithm</Label>
        <Select 
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as any)}
        >
          {getAlgorithmOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label} | Complexity:{option.complexity} | Performance:{option.performance}
            </option>
          ))}
        </Select>
      </FormRow>


      <FormRow>
        <Label>
          Received Data (Space-separated)
          {channelConfig?.type === 'BSC' && ' - Hard Decision (0/1)'}
          {channelConfig?.type !== 'BSC' && ' - Soft Decision (LLR values)'}
        </Label>
        <Input
          value={receivedBits}
          onChange={(e) => setReceivedBits(e.target.value)}
          placeholder={
            matrixData 
              ? `Input ${matrixData.n} ${channelConfig?.type === 'BSC' ? 'binary' : 'LLR'} data`
              : 'Please generate matrix first'
          }
          disabled={!matrixData}
        />
      </FormRow>

      <Button
        onClick={handleDecode}
        disabled={!canDecode}
      >
        {status === 'decoding' ? 'Decoding...' : 'Start Decoding'}
      </Button>


      {channelConfig && (
        <InfoBox>
          <strong>Current Config:</strong> {channelConfig.type} Channel + {getAlgorithmName(algorithm)} Algorithm
          <br />
          {channelConfig.type === 'BSC' && 'Hard decision decoding, input 0/1 bits'}
          {channelConfig.type !== 'BSC' && `Soft decision decoding, SNR=${channelConfig.snr}dB`}
        </InfoBox>
      )}

      {error && (
        <ErrorBox>
          Error: {error}
        </ErrorBox>
      )}
    </Container>
  );
};