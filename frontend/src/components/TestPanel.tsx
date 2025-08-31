import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { testAPI } from '../services/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
`;

const Section = styled.div`
  background: rgba(30, 30, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 24px;
  flex: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Button = styled.button`
  padding: 20px 40px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 700;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 100%;
  
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
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
    
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

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 12px;
  background: rgba(68, 71, 90, 0.5);
  border-radius: 8px;
  overflow: hidden;
  margin: 16px 0;
  border: 1px solid rgba(99, 102, 241, 0.3);
  position: relative;
  
  &::after {
    content: '';
    display: block;
    width: ${({ progress }) => progress}%;
    height: 100%;
    background: linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%);
    border-radius: 7px;
    transition: width 0.3s ease;
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const NoDataMessage = styled.div`
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 40px 20px;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
`;

const ToggleContainer = styled.div`
  display: flex;
  background: rgba(30, 30, 46, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 16px 24px;
  background: ${({ $active }) => $active 
    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
    : 'transparent'
  };
  color: ${({ $active }) => $active ? 'white' : '#94a3b8'};
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &:hover {
    background: ${({ $active }) => $active 
      ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' 
      : 'rgba(99, 102, 241, 0.1)'
    };
    color: ${({ $active }) => $active ? 'white' : '#e2e8f0'};
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

export const TestPanel: React.FC = () => {
  const { matrixData } = useGraphStore();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<'algorithm' | 'channel' | 'ber-fer'>('algorithm');

  const errorRates = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1];
  const snrRange = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]; // More points for smoother curves
  
  // BER/FER specific configuration
  const [berferConfig, setBerferConfig] = useState({
    snrRange: { min: -2, max: 8, steps: 21 },
    framesPerPoint: 10000,
    maxErrors: 100,
    algorithm: 'belief-propagation' as 'gallager-a' | 'belief-propagation' | 'min-sum',
    channelType: 'AWGN' as 'AWGN' | 'BSC' | 'Rayleigh'
  });

  const runBERAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Get current graph data
      const graphData = matrixData;
      if (!graphData || graphData.H === undefined || graphData.G === undefined) {
        setError('Please generate LDPC code matrix first');
        setLoading(false);
        return;
      }

      if (comparisonType === 'algorithm') {
        // Algorithm comparison
        console.log('🔧 [Frontend] Starting algorithm comparison...');

        const algorithms: Array<'gallager-a' | 'belief-propagation' | 'min-sum'> = ['gallager-a', 'belief-propagation', 'min-sum'];
        
        const comparisonResult = await testAPI.runAlgorithmComparison(
          graphData.H,
          graphData.G,
          errorRates,
          200, // Increased for smoother curves
          'random', // Fixed error type
          undefined, // Burst length
          50, // Fixed maximum iterations
          algorithms
        );

        if (comparisonResult.success) {
          // Convert data format to adapt to existing visualization components
          const groupedResults = comparisonResult.results.map(result => ({
            errorRate: result.errorRate,
            algorithms: result.algorithms.map(alg => ({
              algorithm: alg.name,
              algorithmName: alg.name === 'gallager-a' ? 'Gallager-A' : 
                            alg.name === 'belief-propagation' ? 'Belief Propagation' : 'Min-Sum',
              ber: alg.ber,
              correctionRate: alg.correctionRate,
              totalTests: alg.totalTests,
              totalErrors: alg.totalErrors,
              correctedErrors: alg.correctedErrors,
              avgIterations: alg.avgIterations,
              convergenceRate: alg.convergenceRate
            }))
          }));

          console.log('🔧 [Frontend] Algorithm comparison results:', groupedResults);

          setResults({
            type: 'algorithm',
            results: groupedResults,
            algorithms: algorithms
          });
        } else {
          throw new Error('Algorithm comparison API call failed');
        }

        console.log('✅ [Frontend] Algorithm performance comparison completed');
      } else if (comparisonType === 'channel') {
        // Channel comparison
        console.log('🔧 [Frontend] Starting channel comparison...');

        const channels: Array<'BSC' | 'AWGN' | 'Rayleigh'> = ['BSC', 'AWGN', 'Rayleigh'];
        
        const comparisonResult = await testAPI.runChannelComparison(
          graphData.H,
          graphData.G,
          snrRange,
          200, // Increased for smoother curves
          'random', // Fixed error type
          undefined, // Burst length
          50, // Fixed maximum iterations
          'belief-propagation', // Fixed algorithm for channel comparison
          channels
        );

        if (comparisonResult.success) {
          // Convert data format to adapt to existing visualization components
          const groupedResults = comparisonResult.results.map(result => ({
            snr: result.snr,
            channels: result.channels.map(ch => ({
              channel: ch.name,
              channelName: ch.name,
              ber: ch.ber,
              correctionRate: ch.correctionRate,
              totalTests: ch.totalTests,
              totalErrors: ch.totalErrors,
              correctedErrors: ch.correctedErrors,
              avgIterations: ch.avgIterations,
              convergenceRate: ch.convergenceRate
            }))
          }));

          console.log('🔧 [Frontend] Channel comparison results:', groupedResults);

          setResults({
            type: 'channel',
            results: groupedResults,
            channels: channels
          });
        } else {
          throw new Error('Channel comparison API call failed');
        }

        console.log('✅ [Frontend] Channel performance comparison completed');
      } else if (comparisonType === 'ber-fer') {
        // BER/FER curve analysis
        console.log('🔧 [Frontend] Starting BER/FER analysis...');

        const berferResult = await testAPI.runBERFERAnalysis(
          graphData.H,
          graphData.G,
          berferConfig.snrRange,
          berferConfig.framesPerPoint,
          berferConfig.maxErrors,
          berferConfig.channelType,
          berferConfig.algorithm
        );

        if (berferResult.success) {
          setResults({
            type: 'ber-fer',
            results: berferResult.results,
            metadata: berferResult.metadata
          });
          console.log('✅ [Frontend] BER/FER analysis completed');
        } else {
          throw new Error('BER/FER analysis API call failed');
        }
      }
    } catch (err: any) {
      console.error('❌ [Frontend] Analysis failed:', err);
      setError(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const canRunTest = !loading && matrixData?.H;

  return (
    <Container>
      <Section>
        <SectionTitle>Performance Analysis</SectionTitle>
        
        <ToggleContainer>
          <ToggleButton 
            $active={comparisonType === 'algorithm'}
            onClick={() => setComparisonType('algorithm')}
          >
            Algorithm Comparison
          </ToggleButton>
          <ToggleButton 
            $active={comparisonType === 'channel'}
            onClick={() => setComparisonType('channel')}
          >
            Channel Comparison
          </ToggleButton>
          <ToggleButton 
            $active={comparisonType === 'ber-fer'}
            onClick={() => setComparisonType('ber-fer')}
          >
            BER/FER Curves
          </ToggleButton>
        </ToggleContainer>
        
        {matrixData && matrixData.H && matrixData.G ? (
          <div style={{ 
            background: '#1e293b', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: '20px',
            fontSize: '13px',
            color: '#10b981',
            border: '1px solid #10b981',
            fontWeight: '500'
          }}>
            ✅ LDPC code matrix loaded (n={matrixData.n}, k={matrixData.k}, min distance={matrixData.minDistance})
          </div>
        ) : (
          <div style={{ 
            background: '#7f1d1d', 
            padding: '12px 16px', 
            borderRadius: '6px', 
            marginBottom: '20px',
            fontSize: '13px',
            color: '#ef4444',
            border: '1px solid #ef4444',
            fontWeight: '500'
          }}>
            ❌ Please generate LDPC code matrix first
          </div>
        )}

        {/* BER/FER Configuration Panel */}
        {comparisonType === 'ber-fer' && (
          <div style={{
            background: 'rgba(30, 30, 46, 0.8)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#e2e8f0', marginBottom: '16px', fontSize: '16px' }}>
              🎯 BER/FER Simulation Configuration
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  SNR Range (dB)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={berferConfig.snrRange.min}
                    onChange={(e) => setBerferConfig(prev => ({
                      ...prev,
                      snrRange: { ...prev.snrRange, min: Number(e.target.value) }
                    }))}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      background: '#374151',
                      border: '1px solid #4b5563',
                      borderRadius: '4px',
                      color: '#e2e8f0',
                      fontSize: '13px'
                    }}
                  />
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>to</span>
                  <input
                    type="number"
                    value={berferConfig.snrRange.max}
                    onChange={(e) => setBerferConfig(prev => ({
                      ...prev,
                      snrRange: { ...prev.snrRange, max: Number(e.target.value) }
                    }))}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      background: '#374151',
                      border: '1px solid #4b5563',
                      borderRadius: '4px',
                      color: '#e2e8f0',
                      fontSize: '13px'
                    }}
                  />
                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                    ({berferConfig.snrRange.steps} points)
                  </span>
                </div>
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Frames per SNR Point
                </label>
                <select
                  value={berferConfig.framesPerPoint}
                  onChange={(e) => setBerferConfig(prev => ({
                    ...prev,
                    framesPerPoint: Number(e.target.value)
                  }))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '13px'
                  }}
                >
                  <option value={1000}>Fast (1K frames)</option>
                  <option value={5000}>Standard (5K frames)</option>
                  <option value={10000}>Precise (10K frames)</option>
                  <option value={20000}>High Precision (20K frames)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Decoding Algorithm
                </label>
                <select
                  value={berferConfig.algorithm}
                  onChange={(e) => setBerferConfig(prev => ({
                    ...prev,
                    algorithm: e.target.value as any
                  }))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '13px'
                  }}
                >
                  <option value="belief-propagation">Belief Propagation</option>
                  <option value="gallager-a">Gallager-A</option>
                  <option value="min-sum">Min-Sum</option>
                </select>
              </div>

              <div>
                <label style={{ color: '#94a3b8', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  Channel Type
                </label>
                <select
                  value={berferConfig.channelType}
                  onChange={(e) => setBerferConfig(prev => ({
                    ...prev,
                    channelType: e.target.value as any
                  }))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    background: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '13px'
                  }}
                >
                  <option value="AWGN">AWGN Channel</option>
                  <option value="BSC">Binary Symmetric Channel</option>
                  <option value="Rayleigh">Rayleigh Fading Channel</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        <Button onClick={runBERAnalysis} disabled={!canRunTest}>
          {loading ? 'Analyzing...' : 
            comparisonType === 'algorithm' ? 'Start Algorithm Comparison' :
            comparisonType === 'channel' ? 'Start Channel Comparison' :
            'Start BER/FER Analysis'
          }
        </Button>

        {loading && (
          <div style={{ marginTop: '16px' }}>
            <ProgressBar progress={0} />
            <div style={{ fontSize: '13px', color: '#4a9eff', textAlign: 'center', marginTop: '8px', fontWeight: '500' }}>
              🔄 {comparisonType === 'algorithm' 
                ? 'Analyzing BER performance across different algorithms...' 
                : comparisonType === 'channel'
                ? 'Analyzing BER performance across different channels...'
                : 'Generating BER/FER curves across SNR range...'}
            </div>
          </div>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Section>

      {results && (
          <Section>
          <SectionTitle>
            {results.type === 'algorithm' ? 'Algorithm' : 
             results.type === 'channel' ? 'Channel' : 'BER/FER'} Performance Analysis Results
          </SectionTitle>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#e2e8f0', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {results.type === 'algorithm' 
              ? 'BER vs Error Rate - Algorithm Performance Comparison'
              : results.type === 'channel'
              ? 'BER vs SNR - Channel Performance Comparison'
              : 'BER/FER vs SNR - Error Rate Curves'
            }
          </div>
          
          <svg width="100%" height="400px" viewBox="0 0 800 400" style={{ 
            background: 'rgba(15, 15, 25, 0.8)',
            borderRadius: '8px',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            padding: '20px'
          }}>
            {/* Background grid */}
            {(() => {
              const gridLines = [];
              for (let i = 0; i <= 10; i++) {
                const x = (i / 10) * 700 + 50;
                gridLines.push(
                  <line key={`v${i}`} x1={x} y1="30" x2={x} y2="350" 
                        stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                );
              }
              for (let i = 0; i <= 8; i++) {
                const y = (i / 8) * 320 + 30;
                gridLines.push(
                  <line key={`h${i}`} x1="50" y1={y} x2="750" y2={y} 
                        stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                );
              }
              return gridLines;
            })()}
            
            {/* Coordinate axes */}
            <line x1="50" y1="350" x2="750" y2="350" stroke="#94a3b8" strokeWidth="2" />
            <line x1="50" y1="30" x2="50" y2="350" stroke="#94a3b8" strokeWidth="2" />
            
            {/* X-axis labels */}
            {results.type === 'algorithm' ? (
              errorRates.map((rate, index) => {
                const x = (index / (errorRates.length - 1)) * 700 + 50;
                return (
                  <text key={`x${index}`} x={x} y="370" textAnchor="middle" 
                        fill="#94a3b8" fontSize="12" fontWeight="500">
                    {(rate * 100).toFixed(1)}%
                  </text>
                );
              })
            ) : results.type === 'channel' ? (
              snrRange.map((snr, index) => {
                const x = (index / (snrRange.length - 1)) * 700 + 50;
                return (
                  <text key={`x${index}`} x={x} y="370" textAnchor="middle" 
                        fill="#94a3b8" fontSize="12" fontWeight="500">
                    {snr}dB
                  </text>
                );
              })
            ) : (
              // BER/FER SNR range labels
              (() => {
                const snrPoints = [];
                const { min, max, steps } = berferConfig.snrRange;
                for (let i = 0; i < steps; i++) {
                  const snr = min + (i / (steps - 1)) * (max - min);
                  const x = (i / (steps - 1)) * 700 + 50;
                  if (i % 3 === 0) { // Show every 3rd label to avoid crowding
                    snrPoints.push(
                      <text key={`x${i}`} x={x} y="370" textAnchor="middle" 
                            fill="#94a3b8" fontSize="12" fontWeight="500">
                        {snr.toFixed(1)}dB
                      </text>
                    );
                  }
                }
                return snrPoints;
              })()
            )}
            
            {/* Y-axis labels - Logarithmic scale */}
            {(() => {
              const labels = [];
              // Use logarithmic scale from 10^-5 to 10^-1
              const logValues = [-5, -4, -3, -2, -1]; // 10^-5 to 10^-1
              
              logValues.forEach((logValue, index) => {
                const y = 350 - (index / (logValues.length - 1)) * 320;
                const berValue = Math.pow(10, logValue);
                
                labels.push(
                  <text key={`y${index}`} x="35" y={y + 4} textAnchor="end" 
                        fill="#94a3b8" fontSize="12" fontWeight="500">
                    10^{logValue}
                  </text>
                );
                
                // Add minor grid lines for intermediate values
                if (index < logValues.length - 1) {
                  for (let minor = 2; minor <= 9; minor++) {
                    const minorValue = minor * berValue;
                    const nextMajorValue = Math.pow(10, logValues[index + 1]);
                    if (minorValue < nextMajorValue) {
                      const minorLogValue = Math.log10(minorValue);
                      const minorIndex = (minorLogValue - logValues[0]) / (logValues[logValues.length - 1] - logValues[0]);
                      const minorY = 350 - minorIndex * 320;
                      
                      labels.push(
                        <line key={`minor-${index}-${minor}`} x1="45" y1={minorY} x2="50" y2={minorY}
                              stroke="rgba(148, 163, 184, 0.3)" strokeWidth="1" />
                      );
                    }
                  }
                }
              });
              
              return labels;
            })()}
            
            {/* Data lines and points */}
            {(() => {
              const algorithmColors = {
                'gallager-a': '#f59e0b',
                'belief-propagation': '#10b981', 
                'min-sum': '#3b82f6'
              };
              
              const channelColors = {
                'BSC': '#f59e0b',
                'AWGN': '#10b981',
                'Rayleigh': '#3b82f6'
              };
              
              console.log('🔧 [Frontend] Starting chart rendering, results data:', results);
              
              if (results.type === 'algorithm') {
                return results.algorithms.map((algorithm: string) => {
                  const color = algorithmColors[algorithm as keyof typeof algorithmColors];
                  const points = [];
                  const lines = [];
                  
                  console.log(`🔧 [Frontend] Rendering algorithm ${algorithm}, color: ${color}`);
                  
                  results.results.forEach((group: any, index: number) => {
                    const algorithmData = group.algorithms.find((a: any) => a.algorithm === algorithm);
                    if (!algorithmData) {
                      console.log(`⚠️ [Frontend] Algorithm ${algorithm} has no data at error rate ${group.errorRate}`);
                      return;
                    }
                    
                    console.log(`🔧 [Frontend] Algorithm ${algorithm} at error rate ${group.errorRate} BER: ${algorithmData.ber}`);
                    
                    const x = (index / (results.results.length - 1)) * 700 + 50;
                    
                    // Use logarithmic scale for Y-axis (BER from 10^-5 to 10^-1)
                    const berValue = Math.max(algorithmData.ber, 1e-5); // Prevent log(0)
                    const logBER = Math.log10(berValue);
                    const minLog = -5; // 10^-5
                    const maxLog = -1; // 10^-1
                    const normalizedLog = (logBER - minLog) / (maxLog - minLog);
                    const y = 350 - normalizedLog * 320;
                    
                    points.push(
                      <circle key={`${algorithm}-point-${index}`} cx={x} cy={y} r="4" 
                              fill={color} stroke="white" strokeWidth="2" />
                    );
                    
                    if (index > 0) {
                      const prevGroup = results.results[index - 1];
                      const prevAlgorithmData = prevGroup.algorithms.find((a: any) => a.algorithm === algorithm);
                      if (prevAlgorithmData) {
                        const prevX = ((index - 1) / (results.results.length - 1)) * 700 + 50;
                        
                        // Use logarithmic scale for previous point too
                        const prevBerValue = Math.max(prevAlgorithmData.ber, 1e-5);
                        const prevLogBER = Math.log10(prevBerValue);
                        const prevNormalizedLog = (prevLogBER - minLog) / (maxLog - minLog);
                        const prevY = 350 - prevNormalizedLog * 320;
                        
                        lines.push(
                          <line key={`${algorithm}-line-${index}`} x1={prevX} y1={prevY} x2={x} y2={y}
                                stroke={color} strokeWidth="3" strokeLinecap="round" />
                        );
                      }
                    }
                  });
                  
                  return [...lines, ...points];
                });
              } else if (results.type === 'channel') {
                // Channel comparison rendering
                return results.channels.map((channel: string) => {
                  const color = channelColors[channel as keyof typeof channelColors];
                  const points = [];
                  const lines = [];
                  
                  console.log(`🔧 [Frontend] Rendering channel ${channel}, color: ${color}`);
                  
                  results.results.forEach((group: any, index: number) => {
                    const channelData = group.channels.find((c: any) => c.channel === channel);
                    if (!channelData) {
                      console.log(`⚠️ [Frontend] Channel ${channel} has no data at SNR ${group.snr}`);
                      return;
                    }
                    
                    console.log(`🔧 [Frontend] Channel ${channel} at SNR ${group.snr} BER: ${channelData.ber}`);
                    
                    const x = (index / (results.results.length - 1)) * 700 + 50;
                    
                    // Use logarithmic scale for Y-axis (BER from 10^-5 to 10^-1)
                    const berValue = Math.max(channelData.ber, 1e-5); // Prevent log(0)
                    const logBER = Math.log10(berValue);
                    const minLog = -5; // 10^-5
                    const maxLog = -1; // 10^-1
                    const normalizedLog = (logBER - minLog) / (maxLog - minLog);
                    const y = 350 - normalizedLog * 320;
                    
                    points.push(
                      <circle key={`${channel}-point-${index}`} cx={x} cy={y} r="4" 
                              fill={color} stroke="white" strokeWidth="2" />
                    );
                    
                    if (index > 0) {
                      const prevGroup = results.results[index - 1];
                      const prevChannelData = prevGroup.channels.find((c: any) => c.channel === channel);
                      if (prevChannelData) {
                        const prevX = ((index - 1) / (results.results.length - 1)) * 700 + 50;
                        
                        // Use logarithmic scale for previous point too
                        const prevBerValue = Math.max(prevChannelData.ber, 1e-5);
                        const prevLogBER = Math.log10(prevBerValue);
                        const prevNormalizedLog = (prevLogBER - minLog) / (maxLog - minLog);
                        const prevY = 350 - prevNormalizedLog * 320;
                        
                        lines.push(
                          <line key={`${channel}-line-${index}`} x1={prevX} y1={prevY} x2={x} y2={y}
                                stroke={color} strokeWidth="3" strokeLinecap="round" />
                        );
                      }
                    }
                  });
                  
                  return [...lines, ...points];
                });
              } else {
                // BER/FER curve rendering with Uncoded BER comparison
                const snrPoints = results.results.snrPoints || [];
                const berPoints = [];
                const ferPoints = [];
                const uncodedPoints = [];
                const berLines = [];
                const ferLines = [];
                const uncodedLines = [];
                
                snrPoints.forEach((point: any, index: number) => {
                  const x = (index / (snrPoints.length - 1)) * 700 + 50;
                  
                  // Coded BER curve (green)
                  const berValue = Math.max(point.ber, 1e-6);
                  const berLogValue = Math.log10(berValue);
                  const berNormalizedLog = (berLogValue - (-6)) / ((-1) - (-6)); // 10^-6 to 10^-1
                  const berY = 350 - berNormalizedLog * 320;
                  
                  berPoints.push(
                    <circle key={`ber-point-${index}`} cx={x} cy={berY} r="4" 
                            fill="#10b981" stroke="white" strokeWidth="2" />
                  );
                  
                  // FER curve (red)
                  const ferValue = Math.max(point.fer, 1e-6);
                  const ferLogValue = Math.log10(ferValue);
                  const ferNormalizedLog = (ferLogValue - (-6)) / ((-1) - (-6));
                  const ferY = 350 - ferNormalizedLog * 320;
                  
                  ferPoints.push(
                    <circle key={`fer-point-${index}`} cx={x} cy={ferY} r="4" 
                            fill="#ef4444" stroke="white" strokeWidth="2" />
                  );
                  
                  // Uncoded BER curve (gray dashed)
                  const uncodedValue = Math.max(point.uncodedBER, 1e-6);
                  const uncodedLogValue = Math.log10(uncodedValue);
                  const uncodedNormalizedLog = (uncodedLogValue - (-6)) / ((-1) - (-6));
                  const uncodedY = 350 - uncodedNormalizedLog * 320;
                  
                  uncodedPoints.push(
                    <circle key={`uncoded-point-${index}`} cx={x} cy={uncodedY} r="3" 
                            fill="#94a3b8" stroke="white" strokeWidth="1" />
                  );
                  
                  // Connect lines
                  if (index > 0) {
                    const prevPoint = snrPoints[index - 1];
                    const prevX = ((index - 1) / (snrPoints.length - 1)) * 700 + 50;
                    
                    // Coded BER line
                    const prevBerValue = Math.max(prevPoint.ber, 1e-6);
                    const prevBerLogValue = Math.log10(prevBerValue);
                    const prevBerNormalizedLog = (prevBerLogValue - (-6)) / ((-1) - (-6));
                    const prevBerY = 350 - prevBerNormalizedLog * 320;
                    
                    berLines.push(
                      <line key={`ber-line-${index}`} x1={prevX} y1={prevBerY} x2={x} y2={berY}
                            stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                    );
                    
                    // FER line
                    const prevFerValue = Math.max(prevPoint.fer, 1e-6);
                    const prevFerLogValue = Math.log10(prevFerValue);
                    const prevFerNormalizedLog = (prevFerLogValue - (-6)) / ((-1) - (-6));
                    const prevFerY = 350 - prevFerNormalizedLog * 320;
                    
                    ferLines.push(
                      <line key={`fer-line-${index}`} x1={prevX} y1={prevFerY} x2={x} y2={ferY}
                            stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    );
                    
                    // Uncoded BER line (dashed)
                    const prevUncodedValue = Math.max(prevPoint.uncodedBER, 1e-6);
                    const prevUncodedLogValue = Math.log10(prevUncodedValue);
                    const prevUncodedNormalizedLog = (prevUncodedLogValue - (-6)) / ((-1) - (-6));
                    const prevUncodedY = 350 - prevUncodedNormalizedLog * 320;
                    
                    uncodedLines.push(
                      <line key={`uncoded-line-${index}`} x1={prevX} y1={prevUncodedY} x2={x} y2={uncodedY}
                            stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" 
                            strokeDasharray="8,4" />
                    );
                  }
                });
                
                return [...uncodedLines, ...berLines, ...ferLines, ...uncodedPoints, ...berPoints, ...ferPoints];
              }
            })()}
            
            {/* Axis titles */}
            <text x="400" y="390" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600">
              {results.type === 'algorithm' ? 'Error Rate (%)' : 'SNR (dB)'}
            </text>
            <text x="15" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="14" fontWeight="600" 
                  transform="rotate(-90 15 190)">
              {results.type === 'ber-fer' ? 'Error Rate (log scale)' : 'BER (log scale)'}
            </text>
            
            {/* Legend - placed directly in top-right corner of chart */}
            <g transform="translate(600, 50)">
              {results.type === 'algorithm' ? [
                { color: '#f59e0b', name: 'Gallager-A', desc: 'Hard decision algorithm' },
                { color: '#10b981', name: 'Belief Propagation', desc: 'Soft decision algorithm' },
                { color: '#3b82f6', name: 'Min-Sum', desc: 'Simplified belief propagation' }
              ].map((item, index) => (
                <g key={index} transform={`translate(0, ${index * 25})`}>
                  <rect x="0" y="0" width="12" height="12" fill={item.color} rx="2" />
                  <text x="20" y="9" fill="#e2e8f0" fontSize="12" fontWeight="600">
                    {item.name}
                  </text>
                  <text x="20" y="22" fill="#94a3b8" fontSize="10">
                    {item.desc}
                  </text>
                </g>
              )) : results.type === 'channel' ? [
                { color: '#f59e0b', name: 'BSC', desc: 'Binary Symmetric Channel' },
                { color: '#10b981', name: 'AWGN', desc: 'Additive White Gaussian Noise' },
                { color: '#3b82f6', name: 'Rayleigh', desc: 'Rayleigh Fading Channel' }
              ].map((item, index) => (
                <g key={index} transform={`translate(0, ${index * 25})`}>
                  <rect x="0" y="0" width="12" height="12" fill={item.color} rx="2" />
                  <text x="20" y="9" fill="#e2e8f0" fontSize="12" fontWeight="600">
                    {item.name}
                  </text>
                  <text x="20" y="22" fill="#94a3b8" fontSize="10">
                    {item.desc}
                  </text>
                </g>
              )) : [
                { color: '#10b981', name: 'Coded BER', desc: 'LDPC Coded Bit Error Rate' },
                { color: '#ef4444', name: 'FER', desc: 'Frame Error Rate' },
                { color: '#94a3b8', name: 'Uncoded BER', desc: 'Theoretical Uncoded BER', dashed: true }
              ].map((item: any, index) => (
                <g key={index} transform={`translate(0, ${index * 25})`}>
                  {item.dashed ? (
                    <line x1="0" y1="6" x2="12" y2="6" stroke={item.color} strokeWidth="2" 
                          strokeDasharray="4,2" strokeLinecap="round" />
                  ) : (
                    <rect x="0" y="0" width="12" height="12" fill={item.color} rx="2" />
                  )}
                  <text x="20" y="9" fill="#e2e8f0" fontSize="12" fontWeight="600">
                    {item.name}
                  </text>
                  <text x="20" y="22" fill="#94a3b8" fontSize="10">
                    {item.desc}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </Section>
      )}
    </Container>
  );
};