import React, { useState } from 'react';
import styled from 'styled-components';

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
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TypeBadge = styled.span<{ type: string }>`
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${({ type }) => {
    switch (type) {
      case 'BSC': return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      case 'AWGN': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'Rayleigh': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
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
    color: #f59e0b;
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
    border-color: rgba(245, 158, 11, 0.6);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    background: rgba(15, 15, 35, 0.9);
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
    border-color: rgba(245, 158, 11, 0.6);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
    background: rgba(15, 15, 35, 0.9);
  }
  
  &::placeholder {
    color: #9ca3af;
    font-style: italic;
  }
`;

const InfoBox = styled.div`
  background: rgba(68, 71, 90, 0.3);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  padding: 16px 18px;
  margin-top: 12px;
  font-size: 13px;
  color: #d1d5db;
  line-height: 1.5;
  font-family: 'Inter', sans-serif;
  
  div[style*="font-weight: bold"] {
    font-weight: 700;
    color: #f3f4f6;
    margin-bottom: 8px;
  }
  
  div[style*="color: #10b981"] {
    color: #10b981 !important;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
  }
`;

const PresetButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin-top: 8px;
`;

const PresetButton = styled.button`
  padding: 8px 12px;
  background: rgba(68, 71, 90, 0.4);
  backdrop-filter: blur(8px);
  color: #d1d5db;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &:hover {
    background: rgba(99, 102, 241, 0.2);
    color: #f3f4f6;
    border-color: rgba(99, 102, 241, 0.4);
    transform: translateY(-1px);
  }
  
  &.active {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    border-color: rgba(245, 158, 11, 0.5);
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
    font-weight: 700;
  }
`;

export interface ChannelConfig {
  type: 'BSC' | 'AWGN' | 'Rayleigh';
  parameter: number; // BSC: No parameter needed (fixed 0.1), AWGN/Rayleigh: SNR(dB)
  supportsSoftDecision: boolean;
  snr?: number;
}

interface ChannelModuleProps {
  onConfigChange?: (config: ChannelConfig) => void;
}

export const ChannelModule: React.FC<ChannelModuleProps> = ({ onConfigChange }) => {
  const [channelType, setChannelType] = useState<'BSC' | 'AWGN' | 'Rayleigh'>('BSC');
  const [parameter, setParameter] = useState(3);

  const channelPresets = {
    BSC: [
      { name: 'Standard', value: 3, description: 'Fixed parameter' }
    ],
    AWGN: [
      { name: 'High SNR', value: 8, description: 'Low noise' },
      { name: 'Mid SNR', value: 5, description: 'Medium noise' },
      { name: 'Low SNR', value: 2, description: 'High noise' },
      { name: 'Very Low SNR', value: 0, description: 'Very high noise' }
    ],
    Rayleigh: [
      { name: 'High SNR', value: 10, description: 'Weak fading' },
      { name: 'Mid SNR', value: 6, description: 'Medium fading' },
      { name: 'Low SNR', value: 3, description: 'Strong fading' },
      { name: 'Very Low SNR', value: 1, description: 'Very strong fading' }
    ]
  };

  const handleTypeChange = (newType: 'BSC' | 'AWGN' | 'Rayleigh') => {
    setChannelType(newType);
    
    // Set default parameters
    const defaultParam = newType === 'BSC' ? 3 : 3;
    setParameter(defaultParam);
    
    notifyConfigChange(newType, defaultParam);
  };

  const handleParameterChange = (newParam: number) => {
    setParameter(newParam);
    notifyConfigChange(channelType, newParam);
  };

  const notifyConfigChange = (type: 'BSC' | 'AWGN' | 'Rayleigh', param: number) => {
    if (onConfigChange) {
      const config: ChannelConfig = {
        type,
        parameter: param,
        supportsSoftDecision: type === 'AWGN' || type === 'Rayleigh'
      };
      
      // Set SNR parameters
      if (type === 'AWGN' || type === 'Rayleigh') {
        config.snr = param;
      }
      
      onConfigChange(config);
    }
  };


  const getParameterLabel = () => {
    return channelType === 'BSC' ? 'Channel Parameter (Fixed)' : 'SNR (dB)';
  };

  const getParameterRange = () => {
    switch (channelType) {
      case 'BSC':
        return { min: 3, max: 3, step: 1 }; // BSC fixed parameter
      case 'AWGN':
        return { min: -2, max: 12, step: 0.5 };
      case 'Rayleigh':
        return { min: 0, max: 15, step: 0.5 };
      default:
        return { min: 0, max: 10, step: 0.5 };
    }
  };

  const getChannelDescription = () => {
    switch (channelType) {
      case 'BSC':
        return 'Hard decision channel, suitable for digital communication systems';
      case 'AWGN':
        return 'Gaussian white noise channel, soft decision, with reliability information';
      case 'Rayleigh':
        return 'Rayleigh fading channel, simulates mobile communication environment';
      default:
        return '';
    }
  };

  const range = getParameterRange();

  return (
    <Container>
      <Header>
        <Title>📡 Channel Settings</Title>
        <TypeBadge type={channelType}>{channelType}</TypeBadge>
      </Header>

      <FormRow>
        <Label>Channel Type</Label>
        <Select 
          value={channelType}
          onChange={(e) => handleTypeChange(e.target.value as any)}
        >
          <option value="BSC">BSC - Binary Symmetric Channel (Hard Decision)</option>
          <option value="AWGN">AWGN - Additive White Gaussian Noise (Soft Decision)</option>
          <option value="Rayleigh">Rayleigh - Rayleigh Fading Channel (Soft Decision)</option>
        </Select>
      </FormRow>

      {channelType !== 'BSC' && (
        <FormRow>
          <Label>{getParameterLabel()}</Label>
          <Input
            type="number"
            value={parameter}
            onChange={(e) => handleParameterChange(parseFloat(e.target.value) || 0)}
            min={range.min}
            max={range.max}
            step={range.step}
          />
        </FormRow>
      )}

      <PresetButtons>
        {channelPresets[channelType].map((preset, index) => (
          <PresetButton
            key={index}
            className={parameter === preset.value ? 'active' : ''}
            onClick={() => handleParameterChange(preset.value)}
          >
            {preset.name}
          </PresetButton>
        ))}
      </PresetButtons>

      <InfoBox>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{channelType} Channel Characteristics</div>
        <div>{getChannelDescription()}</div>
        {channelType !== 'BSC' && (
          <div style={{ color: '#10b981', marginTop: '8px' }}>
            ✓ Current SNR: {parameter}dB
          </div>
        )}
      </InfoBox>

    </Container>
  );
};