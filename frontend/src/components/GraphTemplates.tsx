import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGraphStore } from '../stores/graphStore';
import { graphAPI, Template } from '../services/api';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TemplateCard = styled.div`
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: #333;
    border-color: #4a9eff;
  }
`;

const TemplateTitle = styled.h4`
  margin: 0 0 6px 0;
  font-size: 13px;
  color: #4a9eff;
`;

const TemplateDesc = styled.p`
  margin: 0 0 8px 0;
  font-size: 11px;
  color: #999;
  line-height: 1.4;
`;

const TemplateParams = styled.div`
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #666;
`;

const LoadingMsg = styled.div`
  color: #999;
  text-align: center;
  padding: 20px;
  font-size: 12px;
`;

const ErrorMsg = styled.div`
  color: #ff6b6b;
  text-align: center;
  padding: 20px;
  font-size: 12px;
`;

export const GraphTemplates: React.FC = () => {
  const { loadGraph, clearGraph } = useGraphStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        setError(null);
        const templatesData = await graphAPI.getTemplates();
        setTemplates(templatesData);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleLoadTemplate = (template: Template) => {
    if (confirm(`Are you sure you want to load template "${template.name}"? The current graph will be replaced.`)) {
      clearGraph();
      setTimeout(() => {
        loadGraph(template.graph);
      }, 100);
    }
  };

  const calculateParams = (graph: any) => {
    const bitNodes = graph.nodes.filter((n: any) => n.type === 'bit');
    const checkNodes = graph.nodes.filter((n: any) => n.type === 'check');
    const n = bitNodes.length;
    const k = Math.max(0, n - checkNodes.length);
    const rate = k > 0 ? `${k}/${n}` : '0/n';
    
    return { n, k, rate };
  };

  if (loading) {
    return (
      <Container>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4a9eff' }}>
          Standard Code Templates
        </h3>
        <LoadingMsg>Loading templates...</LoadingMsg>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4a9eff' }}>
          Standard Code Templates
        </h3>
        <ErrorMsg>
          {error}
          <br />
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              background: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Retry
          </button>
        </ErrorMsg>
      </Container>
    );
  }

  return (
    <Container>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#4a9eff' }}>
        Standard Code Templates
      </h3>
      
      {templates.map((template, index) => {
        const params = calculateParams(template.graph);
        return (
          <TemplateCard key={index} onClick={() => handleLoadTemplate(template)}>
            <TemplateTitle>{template.name}</TemplateTitle>
            <TemplateDesc>{template.description}</TemplateDesc>
            <TemplateParams>
              <span>n={params.n}</span>
              <span>k={params.k}</span>
              <span>R={params.rate}</span>
              <span>LDPC Code</span>
            </TemplateParams>
          </TemplateCard>
        );
      })}
    </Container>
  );
};