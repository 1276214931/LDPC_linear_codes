import express from 'express';
import { LDPCGraph } from '../types';

const router = express.Router();

router.post('/validate', (req, res) => {
  try {
    const graph: LDPCGraph = req.body.graph;
    
    if (!graph || !graph.nodes || !graph.edges) {
      return res.status(400).json({
        error: 'Invalid graph data'
      });
    }

    const errors: string[] = [];
    
    if (graph.nodes.length === 0) {
      errors.push('Graph must contain at least one node');
    }
    
    const bitNodes = graph.nodes.filter(n => n.type === 'bit');
    const checkNodes = graph.nodes.filter(n => n.type === 'check');
    
    if (bitNodes.length === 0) {
      errors.push('Graph must contain at least one bit node');
    }
    
    if (checkNodes.length === 0) {
      errors.push('Graph must contain at least one check node');
    }
    
    const isolatedNodes = graph.nodes.filter(node => {
      return !graph.edges.some(edge => 
        edge.source === node.id || edge.target === node.id
      );
    });
    
    if (isolatedNodes.length > 0) {
      errors.push(`Found ${isolatedNodes.length} isolated nodes`);
    }
    
    graph.edges.forEach((edge, index) => {
      const sourceNode = graph.nodes.find(n => n.id === edge.source);
      const targetNode = graph.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode) {
        errors.push(`Edge ${index + 1} source node does not exist`);
      }
      
      if (!targetNode) {
        errors.push(`Edge ${index + 1} target node does not exist`);
      }
      
      if (sourceNode && targetNode && sourceNode.type === targetNode.type) {
        errors.push(`Edge ${index + 1} connects nodes of the same type`);
      }
    });

    res.json({
      isValid: errors.length === 0,
      errors
    });
  } catch (error) {
    console.error('Graph validation error:', error);
    res.status(500).json({
      error: 'Error occurred during graph validation'
    });
  }
});

router.post('/export', (req, res) => {
  try {
    const { graph, format = 'json' } = req.body;
    
    if (!graph) {
      return res.status(400).json({
        error: 'No graph data provided'
      });
    }

    let exportData: string;
    
    if (format === 'json') {
      exportData = JSON.stringify(graph, null, 2);
    } else if (format === 'csv') {
      const nodesCsv = 'id,type,x,y,label\n' + 
        graph.nodes.map(node => 
          `${node.id},${node.type},${node.position.x},${node.position.y},${node.label}`
        ).join('\n');
      
      const edgesCsv = 'id,source,target\n' + 
        graph.edges.map(edge => 
          `${edge.id},${edge.source},${edge.target}`
        ).join('\n');
      
      exportData = `# Nodes\n${nodesCsv}\n\n# Edges\n${edgesCsv}`;
    } else {
      return res.status(400).json({
        error: 'Unsupported export format'
      });
    }

    res.json({
      success: true,
      data: exportData,
      format,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Graph export error:', error);
    res.status(500).json({
      error: 'Error occurred during graph export'
    });
  }
});

router.post('/import', (req, res) => {
  try {
    const { data, format = 'json' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        error: 'No data provided'
      });
    }

    let graph: LDPCGraph;
    
    if (format === 'json') {
      try {
        graph = JSON.parse(data);
      } catch {
        return res.status(400).json({
          error: 'Invalid JSON data'
        });
      }
    } else if (format === 'csv') {
      return res.status(400).json({
        error: 'CSV import functionality not implemented'
      });
    } else {
      return res.status(400).json({
        error: 'Unsupported import format'
      });
    }

    if (!graph.nodes || !graph.edges || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      return res.status(400).json({
        error: 'Invalid graph data format'
      });
    }

    res.json({
      success: true,
      graph,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Graph import error:', error);
    res.status(500).json({
      error: 'Error occurred during graph import'
    });
  }
});

router.get('/templates', (req, res) => {
  try {
    const templates = [
      {
        name: 'Simple LDPC Code (3,6)',
        description: 'Basic LDPC code with 3 bit nodes and 2 check nodes',
        graph: {
          nodes: [
            { id: 'b1', type: 'bit', position: { x: 100, y: 100 }, label: 'B1', connections: ['c1', 'c2'] },
            { id: 'b2', type: 'bit', position: { x: 200, y: 100 }, label: 'B2', connections: ['c1'] },
            { id: 'b3', type: 'bit', position: { x: 300, y: 100 }, label: 'B3', connections: ['c2'] },
            { id: 'c1', type: 'check', position: { x: 150, y: 200 }, label: 'C1', connections: ['b1', 'b2'] },
            { id: 'c2', type: 'check', position: { x: 250, y: 200 }, label: 'C2', connections: ['b1', 'b3'] }
          ],
          edges: [
            { id: 'e1', source: 'b1', target: 'c1' },
            { id: 'e2', source: 'b2', target: 'c1' },
            { id: 'e3', source: 'b1', target: 'c2' },
            { id: 'e4', source: 'b3', target: 'c2' }
          ]
        }
      },
      {
        name: 'Regular LDPC Code (7,4)',
        description: 'Regular LDPC code with 7 bit nodes and 3 check nodes',
        graph: {
          nodes: [
            { id: 'b1', type: 'bit', position: { x: 80, y: 80 }, label: 'B1', connections: [] },
            { id: 'b2', type: 'bit', position: { x: 160, y: 80 }, label: 'B2', connections: [] },
            { id: 'b3', type: 'bit', position: { x: 240, y: 80 }, label: 'B3', connections: [] },
            { id: 'b4', type: 'bit', position: { x: 320, y: 80 }, label: 'B4', connections: [] },
            { id: 'b5', type: 'bit', position: { x: 400, y: 80 }, label: 'B5', connections: [] },
            { id: 'b6', type: 'bit', position: { x: 480, y: 80 }, label: 'B6', connections: [] },
            { id: 'b7', type: 'bit', position: { x: 560, y: 80 }, label: 'B7', connections: [] },
            { id: 'c1', type: 'check', position: { x: 200, y: 200 }, label: 'C1', connections: [] },
            { id: 'c2', type: 'check', position: { x: 320, y: 200 }, label: 'C2', connections: [] },
            { id: 'c3', type: 'check', position: { x: 440, y: 200 }, label: 'C3', connections: [] }
          ],
          edges: []
        }
      }
    ];

    res.json({
      success: true,
      templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      error: 'Error occurred while fetching templates'
    });
  }
});

router.post('/auto-connect', (req, res) => {
  try {
    const { graph, strategy = 'random' } = req.body;
    
    if (!graph || !graph.nodes) {
      return res.status(400).json({
        error: 'Invalid graph data'
      });
    }

    const bitNodes = graph.nodes.filter((n: any) => n.type === 'bit');
    const checkNodes = graph.nodes.filter((n: any) => n.type === 'check');
    
    if (bitNodes.length === 0 || checkNodes.length === 0) {
      return res.status(400).json({
        error: 'Graph must contain both bit nodes and check nodes'
      });
    }

    // 清除现有连接
    const updatedNodes = graph.nodes.map((node: any) => ({
      ...node,
      connections: []
    }));

    const newEdges: any[] = [];
    let edgeIdCounter = 0;

    const addEdge = (bitNodeId: string, checkNodeId: string) => {
      const edgeId = `edge_auto_${edgeIdCounter++}`;
      newEdges.push({
        id: edgeId,
        source: bitNodeId,
        target: checkNodeId,
      });
      
      // 更新连接
      const bitNodeIndex = updatedNodes.findIndex((n: any) => n.id === bitNodeId);
      const checkNodeIndex = updatedNodes.findIndex((n: any) => n.id === checkNodeId);
      
      if (bitNodeIndex !== -1) {
        updatedNodes[bitNodeIndex].connections.push(checkNodeId);
      }
      if (checkNodeIndex !== -1) {
        updatedNodes[checkNodeIndex].connections.push(bitNodeId);
      }
    };

    // 确定性随机数生成器（基于节点数量作为种子）
    let seed = bitNodes.length * checkNodes.length + bitNodes.length + checkNodes.length;
    const deterministicRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280.0;
    };

    switch (strategy) {
      case 'regular':
        // 改进的规则连接：确保H矩阵的行不完全相同
        const bitDegree = Math.min(checkNodes.length, Math.max(2, Math.ceil(checkNodes.length * 0.6)));
        bitNodes.forEach((bitNode: any, bitIndex: number) => {
          // 为每个比特节点创建不同的连接模式
          const startOffset = bitIndex % checkNodes.length;
          const connections = new Set<number>();
          
          // 首先添加基本连接
          connections.add(startOffset);
          
          // 根据位置添加额外连接
          let step = 1;
          while (connections.size < bitDegree && step < checkNodes.length) {
            const nextCheck = (startOffset + step) % checkNodes.length;
            // 避免创建过于规律的模式
            if (step <= 2 || (bitIndex + step) % 3 !== 0) {
              connections.add(nextCheck);
            }
            step++;
          }
          
          // 如果还需要更多连接，随机添加
          while (connections.size < bitDegree && connections.size < checkNodes.length) {
            const randomCheck = Math.floor(deterministicRandom() * checkNodes.length);
            connections.add(randomCheck);
          }
          
          connections.forEach(checkIndex => {
            addEdge(bitNode.id, checkNodes[checkIndex].id);
          });
        });
        break;

      case 'sparse':
        // 稀疏连接：较少的连接，确保每个节点至少有一个连接
        bitNodes.forEach((bitNode: any, bitIndex: number) => {
          // 每个比特节点连接1-2个校验节点
          const connectionCount = 1 + (deterministicRandom() > 0.7 ? 1 : 0);
          const connectedChecks = new Set<number>();
          
          for (let i = 0; i < connectionCount; i++) {
            let checkIndex;
            do {
              checkIndex = Math.floor(deterministicRandom() * checkNodes.length);
            } while (connectedChecks.has(checkIndex) && connectedChecks.size < checkNodes.length);
            
            connectedChecks.add(checkIndex);
            addEdge(bitNode.id, checkNodes[checkIndex].id);
          }
        });
        break;

      default: // 'random'
        // 随机连接：平衡的连接模式
        const targetDensity = 0.3; // 30% 的连接密度
        const maxConnections = Math.floor(bitNodes.length * checkNodes.length * targetDensity);
        const connectionSet = new Set<string>();
        
        let attempts = 0;
        while (connectionSet.size < maxConnections && attempts < maxConnections * 3) {
          const bitIndex = Math.floor(deterministicRandom() * bitNodes.length);
          const checkIndex = Math.floor(deterministicRandom() * checkNodes.length);
          const key = `${bitIndex}-${checkIndex}`;
          
          if (!connectionSet.has(key)) {
            connectionSet.add(key);
            addEdge(bitNodes[bitIndex].id, checkNodes[checkIndex].id);
          }
          attempts++;
        }
        
        // 确保每个节点至少有一个连接
        bitNodes.forEach((bitNode: any, bitIndex: number) => {
          const hasConnection = newEdges.some(edge => 
            edge.source === bitNode.id || edge.target === bitNode.id
          );
          if (!hasConnection) {
            const checkIndex = bitIndex % checkNodes.length;
            addEdge(bitNode.id, checkNodes[checkIndex].id);
          }
        });
        
        checkNodes.forEach((checkNode: any, checkIndex: number) => {
          const hasConnection = newEdges.some(edge => 
            edge.source === checkNode.id || edge.target === checkNode.id
          );
          if (!hasConnection) {
            const bitIndex = checkIndex % bitNodes.length;
            addEdge(bitNodes[bitIndex].id, checkNode.id);
          }
        });
        break;
    }

    const resultGraph = {
      ...graph,
      nodes: updatedNodes,
      edges: newEdges
    };

    res.json({
      success: true,
      graph: resultGraph,
      strategy,
      statistics: {
        bitNodes: bitNodes.length,
        checkNodes: checkNodes.length,
        connections: newEdges.length,
        density: newEdges.length / (bitNodes.length * checkNodes.length)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auto-connect error:', error);
    res.status(500).json({
      error: 'Error occurred during auto-connect'
    });
  }
});

export default router;