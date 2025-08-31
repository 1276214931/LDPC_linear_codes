import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';

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
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }
`;

const SectionTitle = styled.h4`
  margin: 0 0 16px 0;
  font-size: 14px;
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
    height: 16px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 2px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 500;
  color: #d1d5db;
  margin-bottom: 2px;
`;

const Input = styled.input`
  padding: 10px 12px;
  background: rgba(68, 71, 90, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(68, 71, 90, 0.6);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 12px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.6);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    background: rgba(68, 71, 90, 0.6);
  }
  
  &::placeholder {
    color: #a1a1aa;
  }
`;

const Button = styled.button`
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
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
    background: rgba(68, 71, 90, 0.5);
    color: #64748b;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const BatchNodeTools: React.FC = () => {
  const { addNode, nodes, clearGraph } = useGraphStore();
  
  const [bitCount, setBitCount] = useState(6);
  const [checkCount, setCheckCount] = useState(3);
  const [layoutType, setLayoutType] = useState<'horizontal' | 'grid' | 'circular'>('horizontal');

  // Preset LDPC code configurations
  const presets = [
    { name: 'Simple Code (3,2)', bits: 3, checks: 2, description: 'Simplest LDPC code' },
    { name: 'Standard Code (6,3)', bits: 6, checks: 3, description: 'Classic teaching example' },
    { name: 'Regular Code (8,4)', bits: 8, checks: 4, description: 'Regular LDPC code' },
    { name: 'Large Code (12,6)', bits: 12, checks: 6, description: 'Larger codeword' }
  ];

  const addBatchNodes = (type: 'bit' | 'check', count: number) => {
    const existingNodes = nodes.filter(n => n.type === type);
    const startIndex = existingNodes.length + 1;
    
    for (let i = 0; i < count; i++) {
      const nodeIndex = startIndex + i;
      const position = calculatePosition(type, i, count);
      
      addNode({
        type,
        position,
        label: `${type === 'bit' ? 'B' : 'C'}${nodeIndex}`,
        connections: [],
      });
    }
  };

  const calculatePosition = (type: 'bit' | 'check', index: number, total: number) => {
    const baseY = type === 'bit' ? 80 : 200;
    const spacing = 80;
    const startX = 100;

    switch (layoutType) {
      case 'horizontal':
        return {
          x: startX + index * spacing,
          y: baseY
        };
      
      case 'grid':
        const cols = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
          x: startX + col * spacing,
          y: baseY + row * 60
        };
      
      case 'circular':
        const radius = Math.max(100, total * 15);
        const angle = (2 * Math.PI * index) / total;
        return {
          x: 300 + radius * Math.cos(angle),
          y: baseY + radius * Math.sin(angle)
        };
      
      default:
        return { x: startX + index * spacing, y: baseY };
    }
  };

  const autoLayout = () => {
    // TODO: Implement automatic layout algorithm
    console.log('Auto layout not implemented yet');
  };

  const alignNodes = (direction: 'horizontal' | 'vertical') => {
    // TODO: Implement node alignment
    console.log(`Align ${direction} not implemented yet`);
  };

  const createPresetGraph = (bits: number, checks: number) => {
    clearGraph(); // Clear current graph
    
    // Add bit nodes (top row)
    for (let i = 0; i < bits; i++) {
      addNode({
        type: 'bit',
        position: {
          x: 100 + i * 80,
          y: 80
        },
        label: `B${i + 1}`,
        connections: [],
      });
    }
    
    // Add check nodes (bottom row)
    for (let i = 0; i < checks; i++) {
      let x: number;
      if (checks === 1) {
        // Single check node placed in the center
        x = 100 + (bits - 1) * 80 / 2;
      } else {
        // Multiple check nodes evenly distributed within bit node range
        const totalWidth = (bits - 1) * 80;
        x = 100 + (totalWidth * i) / Math.max(1, checks - 1);
      }
      
      addNode({
        type: 'check',
        position: { x, y: 200 },
        label: `C${i + 1}`,
        connections: [],
      });
    }
  };

  return (
    <Container>
      <Section>
        <SectionTitle>Quick Graph Creation</SectionTitle>
        <div style={{ marginBottom: '12px' }}>
          {presets.map((preset, index) => (
            <Button
              key={index}
              onClick={() => createPresetGraph(preset.bits, preset.checks)}
              style={{
                width: '100%',
                marginBottom: '4px',
                textAlign: 'left',
                fontSize: '10px',
                padding: '6px 8px'
              }}
            >
              <div>{preset.name}</div>
              <div style={{ opacity: 0.7, fontSize: '9px' }}>{preset.description}</div>
            </Button>
          ))}
        </div>
      </Section>

      <Section>
        <SectionTitle>Quick Node Addition</SectionTitle>
        <ButtonRow style={{ marginBottom: '12px' }}>
          <Button onClick={() => addBatchNodes('bit', 3)}>
            Add 3 Bit Nodes
          </Button>
          <Button onClick={() => addBatchNodes('check', 2)}>
            Add 2 Check Nodes
          </Button>
        </ButtonRow>
        <ButtonRow>
          <Button onClick={() => addBatchNodes('bit', 6)}>
            Add 6 Bit Nodes
          </Button>
          <Button onClick={() => addBatchNodes('check', 3)}>
            Add 3 Check Nodes
          </Button>
        </ButtonRow>
      </Section>

      <Section>
        <SectionTitle>Custom Batch Addition</SectionTitle>
        
        <FormGroup>
          <Label>Number of Bit Nodes</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={bitCount}
            onChange={(e) => setBitCount(parseInt(e.target.value) || 1)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Number of Check Nodes</Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={checkCount}
            onChange={(e) => setCheckCount(parseInt(e.target.value) || 1)}
          />
        </FormGroup>

        <FormGroup>
          <Label>Layout Type</Label>
          <select
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value as any)}
            style={{
              padding: '10px 12px',
              background: 'rgba(68, 71, 90, 0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(68, 71, 90, 0.6)',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '12px',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <option value="horizontal">Horizontal Layout</option>
            <option value="grid">Grid Layout</option>
            <option value="circular">Circular Layout</option>
          </select>
        </FormGroup>

        <ButtonRow>
          <Button onClick={() => addBatchNodes('bit', bitCount)}>
            Add Bit Nodes
          </Button>
          <Button onClick={() => addBatchNodes('check', checkCount)}>
            Add Check Nodes
          </Button>
        </ButtonRow>
      </Section>

      <Section>
        <SectionTitle>Layout Tools</SectionTitle>
        
        <ButtonRow>
          <Button onClick={autoLayout} disabled>
            Auto Layout
          </Button>
          <Button onClick={() => alignNodes('horizontal')} disabled>
            Horizontal Align
          </Button>
        </ButtonRow>
        
        <ButtonRow style={{ marginTop: '8px' }}>
          <Button onClick={() => alignNodes('vertical')} disabled>
            Vertical Align
          </Button>
          <Button disabled>
            Grid Align
          </Button>
        </ButtonRow>
      </Section>

      <Section>
        <SectionTitle>Node Statistics</SectionTitle>
        <div style={{ fontSize: '11px', color: '#999' }}>
          <div>Bit Nodes: {nodes.filter(n => n.type === 'bit').length}</div>
          <div>Check Nodes: {nodes.filter(n => n.type === 'check').length}</div>
          <div>Total Nodes: {nodes.length}</div>
        </div>
      </Section>
    </Container>
  );
};