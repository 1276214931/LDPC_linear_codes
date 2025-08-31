import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { codingAPI } from '../services/api';

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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusBadge = styled.span<{ $status: 'ready' | 'encoding' | 'success' | 'error' }>`
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${({ $status }) => {
    switch ($status) {
      case 'ready': return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
      case 'encoding': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
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
    color: #10b981;
    font-weight: 900;
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
    border-color: rgba(16, 185, 129, 0.6);
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    
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

const InfoBox = styled.div`
  background: rgba(68, 71, 90, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 12px;
  font-size: 12px;
  color: #d1d5db;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  
  &::before {
    content: '\2139\FE0F';
    font-size: 14px;
  }
  
  strong {
    color: #10b981;
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
  max-height: 60px;
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

interface EncodingResult {
  codeword: number[];
  success: boolean;
  message?: string;
}

export const EncoderModule: React.FC = () => {
  const { matrixData, setEncodingResult } = useGraphStore();
  const [messageBits, setMessageBits] = useState('1 0 1');
  const [status, setStatus] = useState<'ready' | 'encoding' | 'success' | 'error'>('ready');
  const [error, setError] = useState<string>('');
  const { nodes, edges, exportGraph } = useGraphStore();
  // Auto-generate example message bits
  useEffect(() => {
    if (matrixData?.k) {
      const exampleBits = Array(matrixData.k).fill(0).map((_, i) => i % 2).join(' ');
      setMessageBits(exampleBits);
    }
  }, [matrixData?.k]);



  const handleEncode = async () => {
    if (!matrixData) {
      setError('Please generate LDPC matrix first');
      setStatus('error');
      return;
    }

    setStatus('encoding');
    setError('');
    setEncodingResult(null);

    try {
      // Parse input message bits
      const bits = messageBits.trim().split(/\s+/).map(bit => {
        const num = parseInt(bit);
        if (isNaN(num) || (num !== 0 && num !== 1)) {
          throw new Error(`"${bit}" is not a valid binary bit`);
        }
        return num;
      });

      if (bits.length !== matrixData.k) {
        throw new Error(`Number of message bits should be ${matrixData.k}, currently ${bits.length}`);
      }

      // Call encoding API (using local computation as fallback)
      let encodingResult: EncodingResult;
      
      try {
        const graphData = exportGraph();
        console.log('🔧 Graph data sent by EncoderModule:', graphData);
        console.log('🔧 Number of bit nodes:', graphData.nodes.filter(n => n.type === 'bit').length);
        console.log('🔧 Number of check nodes:', graphData.nodes.filter(n => n.type === 'check').length);
        
        const response = await codingAPI.encode(bits, graphData);
        console.log('🔧 Encoding API response:', response);
        encodingResult = response;
      } catch (apiError: any) {
        console.error('🔧 Encoding API call failed:', apiError);
        alert('Encoding failed: ' + (apiError.message || 'Unknown error'));
        // Set failure result
        encodingResult = {
          codeword: [],
          success: false,
          message: apiError.message || 'Encoding API call failed'
        };
      }

      // Save result to global state
      if (encodingResult) {
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
          ...encodingResult,
          message: translateMessage(encodingResult.message),
          timestamp: Date.now()
        });
        
        setStatus(encodingResult.success ? 'success' : 'error');
        
        if (!encodingResult.success) {
          setError(encodingResult.message || 'Encoding failed');
        }
      } else {
        setError('Encoding result is empty');
        setStatus('error');
      }

    } catch (err: any) {
      setError(err.message || 'Error occurred during encoding process');
      setStatus('error');
    }
  };

  // Local encoding implementation
  // const encodeLocally = (info: number[], G: number[][]): EncodingResult => {
  //   try {
  //     const n = G[0].length;
  //     const codeword = Array(n).fill(0);

  //     for (let i = 0; i < n; i++) {
  //       let sum = 0;
  //       for (let j = 0; j < info.length; j++) {
  //         sum += info[j] * G[j][i];
  //       }
  //       codeword[i] = sum % 2;
  //     }

  //     return {
  //       codeword,
  //       success: true,
  //       message: 'Local encoding successful'
  //     };
  //   } catch (error) {
  //     return {
  //       codeword: [],
  //       success: false,
  //       message: 'Local encoding failed'
  //     };
  //   }
  // };

  const getStatusText = () => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'encoding': return 'Encoding';
      case 'success': return 'Success';
      case 'error': return 'Error';
      default: return 'Ready';
    }
  };

  const canEncode = matrixData && messageBits.trim() && status !== 'encoding' && status !== 'error';

  return (
    <Container>
      <Header>
        <Title>📤 Encoder</Title>
        <StatusBadge $status={status}>{getStatusText()}</StatusBadge>
      </Header>

      <FormRow>
        <Label>Message Bits (space separated)</Label>
        <Input
          value={messageBits}
          onChange={(e) => setMessageBits(e.target.value)}
          placeholder={matrixData ? `Enter ${matrixData.k} bit message` : 'Please generate matrix first'}
          disabled={!matrixData}
        />
      </FormRow>

      <Button
        onClick={handleEncode}
        disabled={!canEncode}
      >
        {status === 'encoding' ? 'Encoding...' : 'Start Encoding'}
      </Button>

      {matrixData && (
        <InfoBox>
          Code parameters: <strong>n={matrixData.n}</strong>, <strong>k={matrixData.k}</strong>, Rate=<strong>{(matrixData.k/matrixData.n).toFixed(3)}</strong>
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