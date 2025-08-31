import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { matrixAPI } from '../services/api';
import { MatrixData } from '../types';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Section = styled.div`
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '';
    width: 3px;
    height: 18px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 2px;
  }
`;

const MatrixContainer = styled.div`
  background: rgba(15, 15, 35, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 16px;
  max-height: 250px;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 12px;
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
  gap: 4px;
  margin-bottom: 2px;
`;

const MatrixCell = styled.span<{ value: number }>`
  width: 24px;
  height: 20px;
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
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: ${({ value }) => 
    value === 1 
      ? '0 2px 4px rgba(99, 102, 241, 0.3)' 
      : 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
  };
  
  &:hover {
    transform: scale(1.05);
  }
`;

const Button = styled.button`
  padding: 12px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  min-width: 120px;
  
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
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
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

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 13px;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(68, 71, 90, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(68, 71, 90, 0.4);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  span:first-child {
    color: #d1d5db;
    font-weight: 500;
  }
  
  span:last-child {
    color: #f3f4f6;
    font-weight: 700;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #a5b4fc;
  font-weight: 500;
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  
  &::before {
    content: '';
    width: 20px;
    height: 20px;
    border: 2px solid rgba(99, 102, 241, 0.3);
    border-top: 2px solid #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 12px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '⚠️';
    font-size: 16px;
  }
`;

export const MatrixPanel: React.FC = () => {
  const { nodes, edges, matrixData, setMatrixData: setGlobalMatrixData, clearMatrixData, exportGraph, validateGraph } = useGraphStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMatrices = async () => {
    console.log('🚀 Generate matrix button clicked');
    console.log('Current number of nodes:', nodes.length);
    console.log('Current number of edges:', edges.length);
    
    setLoading(true);
    setError(null);

    try {
      // First export graph data (including auto-repair logic)
      console.log('📤 Calling exportGraph...');
      const graph = exportGraph();
      
      // Then validate the repaired data
      const bitNodes = graph.nodes.filter(n => n.type === 'bit');
      const checkNodes = graph.nodes.filter(n => n.type === 'check');
      
      if (bitNodes.length === 0) {
        setError('Graph must have at least one bit node');
        return;
      }
      
      if (checkNodes.length === 0) {
        setError('Graph must have at least one check node');
        return;
      }
      
      if (graph.edges.length === 0) {
        setError('Graph must have at least one edge');
        return;
      }
      
      console.log('Validation passed, sending data to backend:', {
        bitNodes: bitNodes.length,
        checkNodes: checkNodes.length,
        edges: graph.edges.length
      });
      
      console.log('🌐 Starting matrix generation API call...');
      console.log('Sending data:', JSON.stringify({ graph }, null, 2));
      
      const result = await matrixAPI.generate(graph);
      
      console.log('Frontend received API response:', result);
      
      if (result.success) {
        const matrixData = {
          H: result.H || result.matrices.H,
          G: result.G || result.matrices.G,
          n: result.n || result.matrices.n,
          k: result.k || result.matrices.k,
          minDistance: result.minDistance || result.matrices.minDistance,
          isValid: result.isValid || result.matrices.isValid,
        };
        
        console.log('Set matrix data:', matrixData);
        setGlobalMatrixData(matrixData);
      } else {
        throw new Error(result.error || 'Matrix generation failed');
      }
    } catch (err: any) {
      console.error('API call failed:', err);
      
      // Display specific error information
      if (err.message.includes('fetch')) {
        setError('Unable to connect to backend server, please ensure backend service is running');
      } else if (err.message.includes('Matrix generation failed')) {
        setError('Backend matrix generation failed, please check graph data');
      } else {
        setError(`API call error: ${err.message}`);
      }
      
      // No longer generate mock data, force user to see actual error
    } finally {
      setLoading(false);
    }
  };

  const renderMatrix = (matrix: number[][], title: string) => {
    if (!matrix || matrix.length === 0) return null;

    return (
      <Section>
        <SectionTitle>{title}</SectionTitle>
        <MatrixContainer>
          {matrix.map((row, i) => (
            <MatrixRow key={i}>
              {row.map((cell, j) => (
                <MatrixCell key={j} value={cell}>
                  {cell}
                </MatrixCell>
              ))}
            </MatrixRow>
          ))}
        </MatrixContainer>
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: '#9ca3af', 
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>Dimensions:</span>
          <span style={{
            background: 'rgba(99, 102, 241, 0.2)',
            padding: '2px 8px',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            fontSize: '11px'
          }}>
            {matrix.length} × {matrix[0]?.length || 0}
          </span>
        </div>
      </Section>
    );
  };

  return (
    <Container>
      <Section>
        <SectionTitle>Matrix Generation</SectionTitle>
        <Button 
          onClick={() => {
            console.log('🔥 Button was clicked!');
            console.log('loading:', loading);
            console.log('nodes.length:', nodes.length);
            generateMatrices();
          }} 
          disabled={loading || nodes.length === 0}
        >
          {loading ? 'Generating...' : 'Generate Matrix'}
        </Button>
        
        {error && (
          <ErrorMessage style={{ marginTop: '12px' }}>
            {error}
          </ErrorMessage>
        )}
      </Section>

      {loading && (
        <LoadingSpinner>
          Generating matrices...
        </LoadingSpinner>
      )}

      {matrixData && (
        <>
          <Section>
            <SectionTitle>Code Parameters</SectionTitle>
            <InfoGrid>
              <InfoItem>
                <span>Code Length (n):</span>
                <span>{matrixData.n}</span>
              </InfoItem>
              <InfoItem>
                <span>Information Bits (k):</span>
                <span>{matrixData.k}</span>
              </InfoItem>
              <InfoItem>
                <span>Parity Bits (m):</span>
                <span>{matrixData.n - matrixData.k}</span>
              </InfoItem>
              <InfoItem>
                <span>Code Rate (R):</span>
                <span>{(matrixData.k / matrixData.n).toFixed(3)}</span>
              </InfoItem>
              <InfoItem>
                <span>Minimum Distance:</span>
                <span>{matrixData.minDistance}</span>
              </InfoItem>
              <InfoItem>
                <span>Error Correction Capability:</span>
                <span>{Math.floor((matrixData.minDistance - 1) / 2)}</span>
              </InfoItem>
            </InfoGrid>
          </Section>

          {renderMatrix(matrixData.H, 'Parity Check Matrix H')}
          {renderMatrix(matrixData.G, 'Generator Matrix G')}
        </>
      )}
    </Container>
  );
};