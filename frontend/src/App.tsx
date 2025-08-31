import React, { useState } from 'react';
import styled from 'styled-components';
import { GraphEditor } from './components/GraphEditor';
import { MatrixPanel } from './components/MatrixPanel';
import { TestPanel } from './components/TestPanel';
import { GraphTemplates } from './components/GraphTemplates';
import { BatchNodeTools } from './components/BatchNodeTools';
import { EncoderModule } from './components/EncoderModule';
import { ChannelModule, ChannelConfig } from './components/ChannelModule';
import { DecoderModule } from './components/DecoderModule';
import { ResultsPanel } from './components/ResultsPanel';
import { useGraphStore } from './stores/graphStore';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 40%, #16213e 100%);
  color: #e2e8f0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
  
  @media (max-width: 1024px) {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
  }
`;

const LeftPanel = styled.div`
  width: 260px;
  min-width: 260px;
  background: rgba(15, 15, 35, 0.85);
  backdrop-filter: blur(16px);
  border-right: 1px solid rgba(100, 116, 139, 0.2);
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.25);
  
  @media (max-width: 1024px) {
    width: 100%;
    min-width: auto;
    border-right: none;
    border-bottom: 1px solid rgba(100, 116, 139, 0.2);
    height: 250px;
  }
`;

const CenterPanel = styled.div`
  flex: 3;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: rgba(30, 41, 59, 0.15);
  
  @media (max-width: 1024px) {
    min-height: 500px;
  }
`;

const RightPanel = styled.div`
  flex: 1;
  min-width: 400px;
  background: rgba(40, 42, 54, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid rgba(68, 71, 90, 0.3);
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
  
  @media (max-width: 1024px) {
    width: 100%;
    min-width: auto;
    border-left: none;
    border-top: 1px solid rgba(68, 71, 90, 0.3);
    height: 350px;
  }
`;

const TabContainer = styled.div`
  display: flex;
  background: rgba(68, 71, 90, 0.2);
  border-bottom: 1px solid rgba(68, 71, 90, 0.3);
  padding: 4px;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  min-width: 70px;
  padding: 8px 10px;
  background: ${({ $active }) => 
    $active 
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
      : 'transparent'
  };
  color: ${({ $active }) => $active ? 'white' : '#a1a1aa'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? '600' : '500'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: ${({ $active }) => 
      $active 
        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
        : 'rgba(99, 102, 241, 0.1)'
    };
    color: ${({ $active }) => $active ? 'white' : '#e4e4e7'};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const PanelContent = styled.div`
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: rgba(30, 30, 46, 0.3);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(68, 71, 90, 0.1);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(99, 102, 241, 0.5);
    }
  }
`;

const Header = styled.div`
  padding: 14px 18px;
  background: rgba(68, 71, 90, 0.2);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(68, 71, 90, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
`;

const StatusBar = styled.div`
  padding: 8px 16px;
  background: rgba(68, 71, 90, 0.15);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(68, 71, 90, 0.3);
  font-size: 12px;
  color: #a1a1aa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
`;

const StatusItem = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.color || '#10b981'};
    box-shadow: 0 0 8px ${props => props.color || '#10b981'}40;
  }
`;

const Button = styled.button`
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 80px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
  
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
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background: rgba(68, 71, 90, 0.3);
    color: #64748b;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: #e4e4e7;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '';
    width: 3px;
    height: 16px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 2px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
`;

const ValidationCard = styled.div<{ $isValid: boolean }>`
  padding: 12px;
  background: ${({ $isValid }) => 
    $isValid 
      ? 'rgba(16, 185, 129, 0.1)' 
      : 'rgba(239, 68, 68, 0.1)'
  };
  border: 1px solid ${({ $isValid }) => 
    $isValid 
      ? 'rgba(16, 185, 129, 0.2)' 
      : 'rgba(239, 68, 68, 0.2)'
  };
  border-radius: 8px;
  backdrop-filter: blur(10px);
`;

const ValidationHeader = styled.div`
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ValidationIcon = styled.span<{ $isValid: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $isValid }) => 
    $isValid 
      ? 'rgba(16, 185, 129, 0.2)' 
      : 'rgba(239, 68, 68, 0.2)'
  };
  color: ${({ $isValid }) => 
    $isValid 
      ? '#10b981' 
      : '#ef4444'
  };
  font-size: 11px;
  font-weight: bold;
`;

const ValidationError = styled.div`
  font-size: 12px;
  color: #fca5a5;
  margin-bottom: 4px;
  padding-left: 6px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(68, 71, 90, 0.1);
  border: 1px solid rgba(68, 71, 90, 0.2);
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(68, 71, 90, 0.15);
    border-color: rgba(99, 102, 241, 0.3);
  }
`;

const InfoLabel = styled.span`
  font-size: 12px;
  color: #a1a1aa;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #e4e4e7;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
`;

type LeftTab = 'tools' | 'templates' | 'batch';
type RightTab = 'matrix' | 'results' | 'test';

export default function App() {
  const [leftTab, setLeftTab] = useState<LeftTab>('tools');
  const [rightTab, setRightTab] = useState<RightTab>('matrix');
  const [channelConfig, setChannelConfig] = useState<ChannelConfig | undefined>();
  
  const { nodes, edges, validateGraph, clearGraph, autoConnect } = useGraphStore();
  
  const validation = validateGraph();
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const bitNodes = nodes.filter(n => n.type === 'bit').length;
  const checkNodes = nodes.filter(n => n.type === 'check').length;

  const handleClearGraph = () => {
    if (confirm('Are you sure you want to clear the graph? This action cannot be undone.')) {
      clearGraph();
    }
  };

  return (
    <AppContainer>
      <LeftPanel>
        <Header>
          <Title>Toolbar</Title>
        </Header>
        
        <TabContainer>
          <Tab 
            $active={leftTab === 'tools'} 
            onClick={() => setLeftTab('tools')}
          >
            Tools
          </Tab>
          <Tab 
            $active={leftTab === 'templates'} 
            onClick={() => setLeftTab('templates')}
          >
            Templates
          </Tab>
          <Tab 
            $active={leftTab === 'batch'} 
            onClick={() => setLeftTab('batch')}
          >
            Batch
          </Tab>
        </TabContainer>
        
        <PanelContent>
          {leftTab === 'tools' && (
            <div>
              <SectionTitle>Graph Operations</SectionTitle>
              <ButtonGroup>
                <Button onClick={handleClearGraph}>
                  Clear Graph
                </Button>
                <Button disabled>
                  Save Graph
                </Button>
                <Button disabled>
                  Load Graph
                </Button>
              </ButtonGroup>
              
              <SectionTitle style={{ marginTop: '32px' }}>Auto Connect</SectionTitle>
              <ButtonGroup>
                <Button 
                  onClick={() => autoConnect('random')}
                  disabled={nodes.filter(n => n.type === 'bit').length === 0 || nodes.filter(n => n.type === 'check').length === 0}
                >
                  Random Connect
                </Button>
              </ButtonGroup>
              
              <SectionTitle style={{ marginTop: '32px' }}>Validation</SectionTitle>
              <ValidationCard $isValid={validation.isValid}>
                <ValidationHeader>
                  <ValidationIcon $isValid={validation.isValid}>
                    {validation.isValid ? '✓' : '✗'}
                  </ValidationIcon>
                  {validation.isValid ? 'Graph Valid' : 'Graph Invalid'}
                </ValidationHeader>
                {validation.errors.map((error, index) => (
                  <ValidationError key={index}>
                    • {error}
                  </ValidationError>
                ))}
              </ValidationCard>
              
              {/* Encoding, Decoding, Channel Modules */}
              {validation.isValid && (
                <div style={{ marginTop: '24px' }}>
                  <SectionTitle>Encoding/Decoding</SectionTitle>
                  <EncoderModule />
                  <ChannelModule onConfigChange={setChannelConfig} />
                  <DecoderModule channelConfig={channelConfig} />
                </div>
              )}
            </div>
          )}
          
          {leftTab === 'templates' && <GraphTemplates />}
          {leftTab === 'batch' && <BatchNodeTools />}
        </PanelContent>
      </LeftPanel>

      <CenterPanel>
        <Header>
          <Title>Linear Coding Graph Editor</Title>
        </Header>
        
        <div style={{ flex: 1 }}>
          <GraphEditor />
        </div>
        
        <StatusBar>
          <StatusItem>
            Status: {validation.isValid ? 'Ready' : 'Needs Correction'}
          </StatusItem>
          <StatusItem>
            Nodes: {nodeCount} | Edges: {edgeCount}
          </StatusItem>
        </StatusBar>
      </CenterPanel>

      <RightPanel>
        <Header>
          <Title>Analysis Panel</Title>
        </Header>
        
        <TabContainer>
          <Tab 
            $active={rightTab === 'matrix'} 
            onClick={() => setRightTab('matrix')}
          >
            Matrix Generation
          </Tab>
          <Tab 
            $active={rightTab === 'results'} 
            onClick={() => setRightTab('results')}
          >
            Analysis Results
          </Tab>
          <Tab 
            $active={rightTab === 'test'} 
            onClick={() => setRightTab('test')}
          >
            Simulation Test
          </Tab>
        </TabContainer>
        
        <PanelContent>
          {rightTab === 'matrix' && <MatrixPanel />}
          {rightTab === 'results' && <ResultsPanel />}
          {rightTab === 'test' && <TestPanel />}
        </PanelContent>
      </RightPanel>
    </AppContainer>
  );
}