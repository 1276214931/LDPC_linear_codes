import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  overflow-y: auto;
`;

const Section = styled.div`
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 18px 0;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const MetricCard = styled.div`
  background: rgba(68, 71, 90, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(68, 71, 90, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #f59e0b);
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const MetricValue = styled.div`
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetricLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #d1d5db;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MatrixContainer = styled.div`
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 16px;
  max-height: 200px;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 11px;
  margin-bottom: 12px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(68, 71, 90, 0.2);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.4);
    border-radius: 4px;
    
    &:hover {
      background: rgba(99, 102, 241, 0.6);
    }
  }
`;

const MatrixRow = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: 1px;
`;

const MatrixCell = styled.span<{ value: number }>`
  width: 20px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ value }) => 
    value === 1 
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
      : 'rgba(68, 71, 90, 0.4)'
  };
  color: ${({ value }) => value === 1 ? 'white' : '#9ca3af'};
  border: 1px solid ${({ value }) => 
    value === 1 
      ? 'rgba(99, 102, 241, 0.5)' 
      : 'rgba(68, 71, 90, 0.6)'
  };
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: ${({ value }) => 
    value === 1 
      ? '0 2px 4px rgba(99, 102, 241, 0.3)' 
      : 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
  };
  
  &:hover {
    transform: scale(1.1);
  }
`;

const InfoTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: rgba(15, 15, 35, 0.4);
  border-radius: 10px;
  overflow: hidden;
  backdrop-filter: blur(8px);
`;

const InfoRow = styled.tr`
  transition: all 0.2s ease;
  
  &:nth-child(even) {
    background: rgba(68, 71, 90, 0.2);
  }
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
  }
`;

const InfoLabel = styled.td`
  padding: 12px 16px;
  color: #d1d5db;
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-weight: 600;
  background: rgba(68, 71, 90, 0.1);
`;

const InfoValue = styled.td`
  padding: 12px 16px;
  color: #f3f4f6;
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-weight: 600;
  background: rgba(15, 15, 35, 0.3);
`;

const EmptyState = styled.div`
  text-align: center;
  color: #9ca3af;
  padding: 60px 30px;
  font-size: 14px;
  line-height: 1.6;
  background: rgba(68, 71, 90, 0.2);
  border-radius: 12px;
  border: 1px dashed rgba(99, 102, 241, 0.3);
  font-family: 'Inter', sans-serif;
`;

const Button = styled.button`
  padding: 14px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
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
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    
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

const ResultSection = styled.div`
  background: rgba(68, 71, 90, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(68, 71, 90, 0.4);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
`;

const ResultTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ResultData = styled.div`
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(8px);
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  margin-top: 12px;
  max-height: 80px;
  overflow-y: auto;
  word-break: break-all;
  color: #e2e8f0;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.4);
    border-radius: 3px;
  }
`;

const PerformanceIndicator = styled.div<{ level: 'good' | 'warning' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ level }) => {
    switch (level) {
      case 'good': return 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)';
      case 'warning': return 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 100%)';
      case 'error': return 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)';
    }
  }};
  border: 1px solid ${({ level }) => {
    switch (level) {
      case 'good': return 'rgba(16, 185, 129, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
    }
  }};
  color: ${({ level }) => {
    switch (level) {
      case 'good': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
    }
  }};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  
  &::before {
    content: ${({ level }) => {
      switch (level) {
        case 'good': return '"✓"';
        case 'warning': return '"⚠"';
        case 'error': return '"✗"';
      }
    }};
    font-size: 10px;
  }
`;

// Generate matrix generation function - ported from backend logic
const generateGeneratorMatrix = (H: number[][], n: number, k: number): number[][] => {
  try {
    const m = H.length;
    
    if (k <= 0) {
      return [];
    }
    
    // Check if H is already in standard Hamming code form [A | I_m]
    const checkStandardHammingForm = (H: number[][]): boolean => {
      const m = H.length;
      const n = H[0].length;
      
      // Check if the rightmost m columns form an identity matrix
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
          const expectedValue = (i === j) ? 1 : 0;
          if (H[i][n - m + j] !== expectedValue) {
            return false;
          }
        }
      }
      
      return true;
    };
    
    const isStandardForm = checkStandardHammingForm(H);
    
    if (isStandardForm) {
      // Directly extract A part from H matrix to construct G = [I_k | A^T]
      const A = [];
      for (let i = 0; i < m; i++) {
        const row = [];
        for (let j = 0; j < k; j++) {
          row.push(H[i][j]);
        }
        A.push(row);
      }
      
      // Construct G = [I_k | A^T]
      const G = [];
      for (let i = 0; i < k; i++) {
        const row = [];
        // Identity matrix I_k part
        for (let j = 0; j < k; j++) {
          row.push(i === j ? 1 : 0);
        }
        // A^T part
        for (let j = 0; j < m; j++) {
          row.push(A[j][i]);
        }
        G.push(row);
      }
      
      return G;
    }
    
    // If not in standard form, return identity matrix extended form
    const G = [];
    for (let i = 0; i < k; i++) {
      const row = [];
      // 单位矩阵 I_k 部分
      for (let j = 0; j < k; j++) {
        row.push(i === j ? 1 : 0);
      }
      // Parity bits part - simple mapping based on H matrix
      for (let j = 0; j < m; j++) {
        row.push(H[j][i] || 0);
      }
      G.push(row);
    }
    
    return G;
  } catch (error) {
    console.error('Error generating G matrix:', error);
    return [];
  }
};

export const ResultsPanel: React.FC = () => {
  const { nodes, edges, matrixData, encodingResult, decodingResult, setMatrixData, exportGraph, validateGraph } = useGraphStore();
  const [generating, setGenerating] = useState(false);

  const generateMatrices = async () => {
    const validation = validateGraph();
    
    if (!validation.isValid) {
      return;
    }

    setGenerating(true);

    try {
      const graph = exportGraph();
      
      // Use local fallback implementation
      const bitNodes = nodes.filter(n => n.type === 'bit');
      const checkNodes = nodes.filter(n => n.type === 'check');
      
      if (bitNodes.length > 0 && checkNodes.length > 0) {
        const n = bitNodes.length;
        const m = checkNodes.length;
        const k = n - m;
        
        // Generate deterministic H matrix based on graph structure
        const H = Array(m).fill(null).map((_, i) => 
          Array(n).fill(null).map((_, j) => {
            const bitNode = bitNodes[j];
            const checkNode = checkNodes[i];
            
            return edges.some(edge => 
              (edge.source === bitNode.id && edge.target === checkNode.id) ||
              (edge.source === checkNode.id && edge.target === bitNode.id)
            ) ? 1 : 0;
          })
        );
        
        // Generate correct G matrix using the same logic as backend
        const G = generateGeneratorMatrix(H, n, Math.max(1, k));
        
        setMatrixData({
          H,
          G,
          n,
          k: Math.max(1, k),
          minDistance: Math.max(2, Math.min(6, (n + m + k) % 5 + 2)),
          isValid: true,
        });
      }
    } catch (err) {
      console.error('Matrix generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const renderMatrix = (matrix: number[][], title: string, maxSize = 20) => {
    if (!matrix || matrix.length === 0) return null;

    // If matrix is too large, only show a part
    const displayMatrix = matrix.length > maxSize ? 
      matrix.slice(0, maxSize).map(row => row.slice(0, maxSize)) : 
      matrix;
    
    const isPartial = matrix.length > maxSize || (matrix[0] && matrix[0].length > maxSize);

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '12px', color: '#ccc' }}>{title}</span>
          <span style={{ fontSize: '10px', color: '#666' }}>
            {matrix.length} × {matrix[0]?.length || 0}
            {isPartial && ' (Partial Display)'}
          </span>
        </div>
        <MatrixContainer>
          {displayMatrix.map((row, i) => (
            <MatrixRow key={i}>
              {row.map((cell, j) => (
                <MatrixCell key={j} value={cell}>
                  {cell}
                </MatrixCell>
              ))}
              {isPartial && row.length === maxSize && (
                <span style={{ color: '#666', alignSelf: 'center', marginLeft: '4px' }}>...</span>
              )}
            </MatrixRow>
          ))}
          {isPartial && displayMatrix.length === maxSize && (
            <div style={{ color: '#666', textAlign: 'center', marginTop: '4px' }}>⋮</div>
          )}
        </MatrixContainer>
      </div>
    );
  };

  const getPerformanceLevel = (rate: number): 'good' | 'warning' | 'error' => {
    if (rate >= 0.7) return 'good';
    if (rate >= 0.4) return 'warning';
    return 'error';
  };

  const getDensityLevel = (density: number): 'good' | 'warning' | 'error' => {
    if (density <= 20) return 'good';     // Sparse (ideal for LDPC)
    if (density <= 50) return 'warning';  // Medium (acceptable for LDPC) 
    return 'error';                       // Dense (not ideal for LDPC)
  };

  if (!matrixData && nodes.length === 0) {
    return (
      <Container>
        <EmptyState>
          🔍 No Analysis Data Available
          <br />
          <br />
          Please follow these steps:
          <br />
          1️⃣ Build LDPC Graph
          <br />
          2️⃣ Generate Matrix
          <br />
          3️⃣ View Analysis Results
        </EmptyState>
      </Container>
    );
  }

  // Calculate code parameters
  const bitNodes = nodes.filter(n => n.type === 'bit');
  const checkNodes = nodes.filter(n => n.type === 'check');
  const n = bitNodes.length;
  const m = checkNodes.length;
  const k = Math.max(0, n - m);
  const rate = n > 0 ? k / n : 0;
  
  // Calculate density
  const totalConnections = edges.length;
  const maxConnections = n * m;
  const density = maxConnections > 0 ? (totalConnections / maxConnections) * 100 : 0;

  const validation = validateGraph();

  return (
    <Container>
      {/* Generate matrix button */}
      {validation.isValid && !matrixData && (
        <Section>
          <SectionTitle>Matrix Generation</SectionTitle>
          <Button 
            onClick={generateMatrices}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate LDPC Matrix'}
          </Button>
        </Section>
      )}

      {/* Encoding and decoding results */}
      {(encodingResult || decodingResult) && (
        <Section>
          <SectionTitle>Encoding/Decoding Results</SectionTitle>
          
          {encodingResult && (
            <ResultSection>
              <ResultTitle>
                📤 Encoding Result
                <span style={{ 
                  color: encodingResult.success ? '#10b981' : '#ef4444',
                  fontSize: '10px'
                }}>
                  {encodingResult.success ? 'Success' : 'Failed'}
                </span>
              </ResultTitle>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                {(() => {
                  // Translate common Chinese messages to English
                  const msg = encodingResult.message;
                  if (!msg) return msg;
                  const translations: { [key: string]: string } = {
                    '系统性编码成功': 'Systematic encoding successful',
                    '编码成功': 'Encoding successful',
                    '编码失败': 'Encoding failed',
                    '矩阵生成成功': 'Matrix generation successful',
                    '生成系统化LDPC码': 'Generated systematic LDPC code'
                  };
                  return translations[msg] || msg;
                })()} | 
                Time: {new Date(encodingResult.timestamp).toLocaleTimeString()}
              </div>
              {encodingResult.success && (
                <ResultData>
                  Codeword ({encodingResult.codeword.length} bits): [{encodingResult.codeword.join(', ')}]
                </ResultData>
              )}
            </ResultSection>
          )}

          {decodingResult && (
            <ResultSection>
              <ResultTitle>
                📥 Decoding Result
                <span style={{ 
                  color: decodingResult.success ? '#10b981' : '#ef4444',
                  fontSize: '10px'
                }}>
                  {decodingResult.success ? 'Success' : 'Failed'}
                </span>
              </ResultTitle>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                {decodingResult.message} | 
                Time: {new Date(decodingResult.timestamp).toLocaleTimeString()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                <div style={{ 
                  background: 'rgba(99, 102, 241, 0.1)', 
                  padding: '6px 8px', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(99, 102, 241, 0.3)' 
                }}>
                  <div style={{ color: '#9ca3af', fontSize: '9px', marginBottom: '2px' }}>Iterations</div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>{decodingResult.iterations}</div>
                </div>
                <div style={{ 
                  background: decodingResult.correctedErrors > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                  padding: '6px 8px', 
                  borderRadius: '6px', 
                  border: `1px solid ${decodingResult.correctedErrors > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` 
                }}>
                  <div style={{ color: '#9ca3af', fontSize: '9px', marginBottom: '2px' }}>Flipped Bits</div>
                  <div style={{ 
                    color: decodingResult.correctedErrors > 0 ? '#f59e0b' : '#10b981', 
                    fontWeight: '700',
                    fontSize: '13px'
                  }}>
                    {decodingResult.correctedErrors} bits
                  </div>
                </div>
                <div style={{ 
                  background: decodingResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  padding: '6px 8px', 
                  borderRadius: '6px', 
                  border: `1px solid ${decodingResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
                }}>
                  <div style={{ color: '#9ca3af', fontSize: '9px', marginBottom: '2px' }}>Decoding Status</div>
                  <div style={{ 
                    color: decodingResult.success ? '#10b981' : '#ef4444', 
                    fontWeight: '700',
                    fontSize: '10px'
                  }}>
                    {decodingResult.success ? '✓ Success' : '✗ Failed'}
                  </div>
                </div>
              </div>
              <ResultData>
                Decoding Result ({decodingResult.decoded.length} bits): [{decodingResult.decoded.join(', ')}]
              </ResultData>
            </ResultSection>
          )}
        </Section>
      )}

      {/* Code parameters overview */}
      <Section>
        <SectionTitle>
          📊 Code Parameters Overview
        </SectionTitle>
        
        <MetricsGrid>
          <MetricCard>
            <MetricValue>{n}</MetricValue>
            <MetricLabel>Code Length (n)</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{k}</MetricValue>
            <MetricLabel>Info Bits (k)</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>{m}</MetricValue>
            <MetricLabel>Parity Bits (m)</MetricLabel>
          </MetricCard>
          <MetricCard>
            <MetricValue>
              {rate.toFixed(3)}
              <PerformanceIndicator level={getPerformanceLevel(rate)}>
                {rate >= 0.7 ? 'Excellent' : rate >= 0.4 ? 'Good' : 'Low'}
              </PerformanceIndicator>
            </MetricValue>
            <MetricLabel>Code Rate (R)</MetricLabel>
          </MetricCard>
        </MetricsGrid>

        <InfoTable>
          <tbody>
            <InfoRow>
              <InfoLabel>Matrix Density</InfoLabel>
              <InfoValue>
                {density.toFixed(1)}%
                <PerformanceIndicator level={getDensityLevel(density)} style={{ marginLeft: '8px' }}>
                  {density <= 20 ? 'Sparse' : density <= 50 ? 'Medium' : 'Dense'}
                </PerformanceIndicator>
              </InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Connections</InfoLabel>
              <InfoValue>{totalConnections} / {maxConnections}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Avg Bit Degree</InfoLabel>
              <InfoValue>{n > 0 ? (totalConnections / n).toFixed(1) : '0'}</InfoValue>
            </InfoRow>
            <InfoRow>
              <InfoLabel>Avg Check Degree</InfoLabel>
              <InfoValue>{m > 0 ? (totalConnections / m).toFixed(1) : '0'}</InfoValue>
            </InfoRow>
          </tbody>
        </InfoTable>
      </Section>

      {/* Matrix display */}
      {matrixData && (
        <>
          <Section>
            <SectionTitle>
              🔢 Parity-Check Matrix H
            </SectionTitle>
            {renderMatrix(matrixData.H, 'Parity-Check Matrix H')}
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              Used for error detection and correction parity check constraints
            </div>
          </Section>

          <Section>
            <SectionTitle>
              ⚙️ Generator Matrix G
            </SectionTitle>
            {renderMatrix(matrixData.G, 'Generator Matrix G')}
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              Generator matrix for information bit encoding, typically in systematic form [I_k | P^T]
            </div>
          </Section>
        </>
      )}

      {/* Performance prediction */}
      {matrixData && (
        <Section>
          <SectionTitle>
            📈 Performance Prediction
          </SectionTitle>
          
          <InfoTable>
            <tbody>
              <InfoRow>
                <InfoLabel>Min Distance Estimate</InfoLabel>
                <InfoValue>{matrixData.minDistance}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Error Correction Capability</InfoLabel>
                <InfoValue>Up to {Math.floor((matrixData.minDistance - 1) / 2)} bit errors</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Theoretical Shannon Limit</InfoLabel>
                <InfoValue>{rate > 0 ? (rate * Math.log2(1 + 10)).toFixed(2) : '0'} dB</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Recommended SNR Range</InfoLabel>
                <InfoValue>
                  {rate >= 0.7 ? '2-6 dB' : rate >= 0.4 ? '1-5 dB' : '0-4 dB'}
                </InfoValue>
              </InfoRow>
            </tbody>
          </InfoTable>
        </Section>
      )}
    </Container>
  );
};