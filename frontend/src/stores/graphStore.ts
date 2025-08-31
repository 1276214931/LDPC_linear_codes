import { create } from 'zustand';
import { GraphNode, GraphEdge, LDPCGraph, MatrixGenerationResult } from '../types';

interface EncodingResult {
  codeword: number[];
  success: boolean;
  message?: string;
  timestamp: number;
}

interface DecodingResult {
  decoded: number[];
  success: boolean;
  iterations: number;
  correctedErrors: number;
  message?: string;
  algorithm?: string;
  timestamp: number;
}

interface HistoryAction {
  type: 'add_node' | 'remove_node' | 'add_edge' | 'remove_edge' | 'move_node' | 'update_node';
  data: any;
  timestamp: number;
}

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodes: string[];
  selectedEdges: string[];
  matrixData: MatrixGenerationResult | null;
  encodingResult: EncodingResult | null;
  decodingResult: DecodingResult | null;
  history: HistoryAction[];
  historyIndex: number;
  clipboard: { nodes: GraphNode[]; edges: GraphEdge[] } | null;
  
  addNode: (node: Omit<GraphNode, 'id'>) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<GraphNode>) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;
  removeSelectedEdges: () => void;
  
  selectNode: (nodeId: string) => void;
  selectMultipleNodes: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  copy: () => void;
  paste: (position?: { x: number; y: number }) => void;
  duplicate: () => void;
  
  setMatrixData: (data: MatrixGenerationResult | null) => void;
  clearMatrixData: () => void;
  setEncodingResult: (result: EncodingResult | null) => void;
  setDecodingResult: (result: DecodingResult | null) => void;
  autoConnect: (strategy?: 'random' | 'regular' | 'sparse') => void;
  
  validateGraph: () => { isValid: boolean; errors: string[] };
  clearGraph: () => void;
  loadGraph: (graph: LDPCGraph) => void;
  exportGraph: () => LDPCGraph;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  matrixData: null,
  encodingResult: null,
  decodingResult: null,
  history: [],
  historyIndex: -1,
  clipboard: null,

  addNode: (nodeData) => {
    const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const node: GraphNode = {
      ...nodeData,
      id,
      connections: [],
    };
    
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        type: 'add_node',
        data: { node },
        timestamp: Date.now()
      });
      
      return {
        nodes: [...state.nodes, node],
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  removeNode: (nodeId) => {
    set((state) => {
      const updatedEdges = state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      
      const updatedNodes = state.nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => ({
          ...node,
          connections: node.connections.filter((id) => id !== nodeId),
        }));

      return {
        nodes: updatedNodes,
        edges: updatedEdges,
        selectedNodes: state.selectedNodes.filter((id) => id !== nodeId),
      };
    });
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }));
  },

  moveNode: (nodeId, position) => {
    console.log('moveNode 被调用:', nodeId, '新位置:', position);
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
    }));
  },

  addEdge: (sourceId, targetId) => {
    set((state) => {
      if (sourceId === targetId) {
        return state;
      }
      
      const sourceNode = state.nodes.find((n) => n.id === sourceId);
      const targetNode = state.nodes.find((n) => n.id === targetId);
      
      if (!sourceNode || !targetNode) {
        return state;
      }
      
      // 检查节点类型：不能连接相同类型的节点
      if (sourceNode.type === targetNode.type) {
        return state;
      }
      
      // 检查是否已存在相同的连线
      const existingEdge = state.edges.find(
        (edge) =>
          (edge.source === sourceId && edge.target === targetId) ||
          (edge.source === targetId && edge.target === sourceId)
      );
      
      if (existingEdge) {
        return state;
      }

      const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newEdge: GraphEdge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
      };

      return {
        ...state,
        edges: [...state.edges, newEdge],
        nodes: state.nodes.map((node) => {
          if (node.id === sourceId || node.id === targetId) {
            const otherId = node.id === sourceId ? targetId : sourceId;
            return {
              ...node,
              connections: [...node.connections, otherId],
            };
          }
          return node;
        }),
      };
    });
  },

  removeEdge: (edgeId) => {
    set((state) => {
      const edge = state.edges.find((e) => e.id === edgeId);
      if (!edge) return state;

      return {
        edges: state.edges.filter((e) => e.id !== edgeId),
        nodes: state.nodes.map((node) => {
          if (node.id === edge.source || node.id === edge.target) {
            const otherId = node.id === edge.source ? edge.target : edge.source;
            return {
              ...node,
              connections: node.connections.filter((id) => id !== otherId),
            };
          }
          return node;
        }),
      };
    });
  },

  selectNode: (nodeId) => {
    set((state) => ({
      selectedNodes: state.selectedNodes.includes(nodeId)
        ? state.selectedNodes.filter((id) => id !== nodeId)
        : [...state.selectedNodes, nodeId],
    }));
  },

  selectMultipleNodes: (nodeIds) => {
    set({ selectedNodes: nodeIds });
  },

  clearSelection: () => {
    set({ selectedNodes: [], selectedEdges: [] });
  },

  setMatrixData: (data) => {
    set({ matrixData: data });
  },

  clearMatrixData: () => {
    set({ matrixData: null });
  },

  setEncodingResult: (result) => {
    set({ encodingResult: result });
  },

  setDecodingResult: (result) => {
    set({ decodingResult: result });
  },

  autoConnect: (strategy = 'random') => {
    const { nodes, edges } = get();
    const bitNodes = nodes.filter(n => n.type === 'bit');
    const checkNodes = nodes.filter(n => n.type === 'check');
    
    if (bitNodes.length === 0 || checkNodes.length === 0) {
      return;
    }

    // 清除现有连接
    set({ edges: [] });
    
    // 更新节点连接数组
    const updatedNodes = nodes.map(node => ({
      ...node,
      connections: []
    }));

    const newEdges: GraphEdge[] = [];
    let edgeIdCounter = 0;

    const addEdge = (bitNodeId: string, checkNodeId: string) => {
      const edgeId = `edge_auto_${edgeIdCounter++}`;
      newEdges.push({
        id: edgeId,
        source: bitNodeId,
        target: checkNodeId,
      });
      
      // 更新连接
      const bitNodeIndex = updatedNodes.findIndex(n => n.id === bitNodeId);
      const checkNodeIndex = updatedNodes.findIndex(n => n.id === checkNodeId);
      
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
        // 规则连接：每个比特节点连接固定数量的校验节点
        const bitDegree = Math.max(2, Math.min(4, Math.ceil(checkNodes.length / 2)));
        bitNodes.forEach((bitNode, bitIndex) => {
          for (let d = 0; d < bitDegree; d++) {
            const checkIndex = (bitIndex * bitDegree + d) % checkNodes.length;
            addEdge(bitNode.id, checkNodes[checkIndex].id);
          }
        });
        break;

      case 'sparse':
        // 稀疏连接：较少的连接，确保每个节点至少有一个连接
        bitNodes.forEach((bitNode, bitIndex) => {
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
        bitNodes.forEach((bitNode, bitIndex) => {
          const hasConnection = newEdges.some(edge => 
            edge.source === bitNode.id || edge.target === bitNode.id
          );
          if (!hasConnection) {
            const checkIndex = bitIndex % checkNodes.length;
            addEdge(bitNode.id, checkNodes[checkIndex].id);
          }
        });
        
        checkNodes.forEach((checkNode, checkIndex) => {
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

    set({ 
      edges: newEdges,
      nodes: updatedNodes,
      matrixData: null // 清除旧的矩阵数据
    });
  },

  validateGraph: () => {
    const { nodes, edges } = get();
    const errors: string[] = [];
    
    if (nodes.length === 0) {
      errors.push('Graph must contain at least one node');
    }
    
    const bitNodes = nodes.filter((n) => n.type === 'bit');
    const checkNodes = nodes.filter((n) => n.type === 'check');
    
    if (bitNodes.length === 0) {
      errors.push('Graph must contain at least one bit node');
    }
    
    if (checkNodes.length === 0) {
      errors.push('Graph must contain at least one check node');
    }
    
    const isolatedNodes = nodes.filter((node) => node.connections.length === 0);
    if (isolatedNodes.length > 0) {
      errors.push(`Found ${isolatedNodes.length} isolated nodes`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  clearGraph: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
      matrixData: null,
      encodingResult: null,
      decodingResult: null,
    });
  },

  loadGraph: (graph) => {
    set({
      nodes: graph.nodes,
      edges: graph.edges,
      selectedNodes: [],
      selectedEdges: [],
      matrixData: null,
      encodingResult: null,
      decodingResult: null,
    });
  },

  exportGraph: () => {
    const { nodes, edges } = get();
    
    // 确保每个节点都有connections属性
    const nodesWithConnections = nodes.map(node => ({
      ...node,
      connections: node.connections || []
    }));
    
    // 检查数据完整性：确保所有边引用的节点都存在
    const nodeIds = new Set(nodes.map(n => n.id));
    const missingNodes = new Set();
    
    console.log('🔍 数据完整性检查:');
    console.log('- 现有节点ID:', Array.from(nodeIds));
    console.log('- 边数量:', edges.length);
    console.log('- 边引用的节点:', edges.map(e => `${e.source} -> ${e.target}`));
    
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        console.log(`❌ 缺失源节点: ${edge.source}`);
        missingNodes.add(edge.source);
      }
      if (!nodeIds.has(edge.target)) {
        console.log(`❌ 缺失目标节点: ${edge.target}`);
        missingNodes.add(edge.target);
      }
    });
    
    console.log('- 缺失节点总数:', missingNodes.size);
    console.log('- 缺失节点列表:', Array.from(missingNodes));
    
    if (missingNodes.size > 0) {
      console.error('数据完整性错误: 以下节点被边引用但不存在于节点数组中:', Array.from(missingNodes));
      console.error('现有节点:', nodes.map(n => ({ id: n.id, type: n.type, label: n.label })));
      console.error('边连接:', edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
      
      // 自动创建缺失的节点
      const additionalNodes = [];
      missingNodes.forEach(nodeId => {
        // 分析这个节点在边中的角色来判断类型
        const isSource = edges.some(e => e.source === nodeId);
        const isTarget = edges.some(e => e.target === nodeId);
        
        let nodeType: 'bit' | 'check';
        let label: string;
        
        if (typeof nodeId === 'string' && (nodeId.startsWith('c') || nodeId.toLowerCase().includes('check'))) {
          nodeType = 'check';
          label = nodeId.startsWith('c') ? nodeId.toUpperCase() : 'CHECK';
        } else if (typeof nodeId === 'string' && (nodeId.startsWith('b') || nodeId.toLowerCase().includes('bit'))) {
          nodeType = 'bit';
          label = nodeId.startsWith('b') ? nodeId.toUpperCase() : 'BIT';
        } else {
          // 基于边连接模式推断：如果主要是目标节点，可能是校验节点
          const sourceCount = edges.filter(e => e.source === nodeId).length;
          const targetCount = edges.filter(e => e.target === nodeId).length;
          
          if (targetCount > sourceCount) {
            nodeType = 'check';
            label = 'C' + (additionalNodes.filter(n => n.type === 'check').length + 1);
          } else {
            nodeType = 'bit';
            label = 'B' + (additionalNodes.filter(n => n.type === 'bit').length + 1);
          }
        }
        
        console.log(`🔧 创建节点: ${nodeId} -> ${nodeType} (${label})`);
        
        additionalNodes.push({
          id: nodeId,
          type: nodeType,
          position: { x: nodeType === 'check' ? 200 : 100, y: nodeType === 'check' ? 200 : 100 },
          label: label,
          connections: []
        });
      });
      
      console.log('🔧 自动创建缺失节点:', additionalNodes.map(n => ({ id: n.id, type: n.type, label: n.label })));
      const allNodes = [...nodesWithConnections, ...additionalNodes];
      
      console.log('✅ 修复后的图形数据:', { 
        nodes: allNodes.map(n => ({ id: n.id, type: n.type, label: n.label })), 
        edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
        nodeCount: allNodes.length,
        edgeCount: edges.length,
        bitNodes: allNodes.filter(n => n.type === 'bit').length,
        checkNodes: allNodes.filter(n => n.type === 'check').length
      });
      
      return { 
        nodes: allNodes, 
        edges 
      };
    }
    
    console.log('导出的图形数据:', { 
      nodes: nodesWithConnections, 
      edges,
      nodeCount: nodesWithConnections.length,
      edgeCount: edges.length
    });
    
    return { 
      nodes: nodesWithConnections, 
      edges 
    };
  },

  selectEdge: (edgeId) => {
    set((state) => ({
      selectedEdges: state.selectedEdges.includes(edgeId)
        ? state.selectedEdges.filter((id) => id !== edgeId)
        : [...state.selectedEdges, edgeId],
    }));
  },

  removeSelectedEdges: () => {
    set((state) => {
      const edgesToRemove = state.selectedEdges;
      if (edgesToRemove.length === 0) return state;

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        type: 'remove_edge',
        data: { edges: state.edges.filter(e => edgesToRemove.includes(e.id)) },
        timestamp: Date.now()
      });

      const updatedEdges = state.edges.filter(e => !edgesToRemove.includes(e.id));
      const updatedNodes = state.nodes.map(node => ({
        ...node,
        connections: node.connections.filter(connId => {
          // 检查是否有边被删除影响了这个连接
          return !edgesToRemove.some(edgeId => {
            const edge = state.edges.find(e => e.id === edgeId);
            return edge && (
              (edge.source === node.id && edge.target === connId) ||
              (edge.target === node.id && edge.source === connId)
            );
          });
        })
      }));

      return {
        edges: updatedEdges,
        nodes: updatedNodes,
        selectedEdges: [],
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedNodes: state.nodes.map(n => n.id),
      selectedEdges: state.edges.map(e => e.id)
    }));
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex < 0) return state;
      
      const action = state.history[state.historyIndex];
      let newState = { ...state, historyIndex: state.historyIndex - 1 };
      
      switch (action.type) {
        case 'add_node':
          newState.nodes = state.nodes.filter(n => n.id !== action.data.node.id);
          newState.edges = state.edges.filter(e => 
            e.source !== action.data.node.id && e.target !== action.data.node.id
          );
          break;
        case 'remove_node':
          newState.nodes = [...state.nodes, action.data.node];
          newState.edges = [...state.edges, ...action.data.edges];
          break;
        case 'add_edge':
          newState.edges = state.edges.filter(e => e.id !== action.data.edge.id);
          break;
        case 'remove_edge':
          newState.edges = [...state.edges, ...action.data.edges];
          break;
      }
      
      return newState;
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      
      const action = state.history[state.historyIndex + 1];
      let newState = { ...state, historyIndex: state.historyIndex + 1 };
      
      switch (action.type) {
        case 'add_node':
          newState.nodes = [...state.nodes, action.data.node];
          break;
        case 'remove_node':
          newState.nodes = state.nodes.filter(n => n.id !== action.data.node.id);
          newState.edges = state.edges.filter(e => 
            e.source !== action.data.node.id && e.target !== action.data.node.id
          );
          break;
        case 'add_edge':
          newState.edges = [...state.edges, action.data.edge];
          break;
        case 'remove_edge':
          newState.edges = state.edges.filter(e => !action.data.edges.some((removedEdge: GraphEdge) => removedEdge.id === e.id));
          break;
      }
      
      return newState;
    });
  },

  canUndo: () => {
    const state = get();
    return state.historyIndex >= 0;
  },

  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },

  copy: () => {
    const { nodes, edges, selectedNodes, selectedEdges } = get();
    
    const selectedNodeObjs = nodes.filter(n => selectedNodes.includes(n.id));
    const selectedEdgeObjs = edges.filter(e => 
      selectedEdges.includes(e.id) || 
      (selectedNodes.includes(e.source) && selectedNodes.includes(e.target))
    );
    
    set({
      clipboard: {
        nodes: selectedNodeObjs,
        edges: selectedEdgeObjs
      }
    });
  },

  paste: (position = { x: 100, y: 100 }) => {
    const { clipboard } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    
    const nodeIdMap: Record<string, string> = {};
    const newNodes: GraphNode[] = [];
    const newEdges: GraphEdge[] = [];
    
    // 复制节点
    clipboard.nodes.forEach((node, index) => {
      const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      nodeIdMap[node.id] = newId;
      
      newNodes.push({
        ...node,
        id: newId,
        position: {
          x: position.x + (index % 3) * 80,
          y: position.y + Math.floor(index / 3) * 80
        },
        connections: []
      });
    });
    
    // 复制边
    clipboard.edges.forEach(edge => {
      if (nodeIdMap[edge.source] && nodeIdMap[edge.target]) {
        const newEdgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newEdges.push({
          ...edge,
          id: newEdgeId,
          source: nodeIdMap[edge.source],
          target: nodeIdMap[edge.target]
        });
      }
    });
    
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({
        type: 'add_node',
        data: { nodes: newNodes, edges: newEdges },
        timestamp: Date.now()
      });
      
      // 更新节点连接
      const updatedNodes = [...state.nodes, ...newNodes].map(node => {
        const connections = [...node.connections];
        newEdges.forEach(edge => {
          if (edge.source === node.id && !connections.includes(edge.target)) {
            connections.push(edge.target);
          }
          if (edge.target === node.id && !connections.includes(edge.source)) {
            connections.push(edge.source);
          }
        });
        return { ...node, connections };
      });
      
      return {
        nodes: updatedNodes,
        edges: [...state.edges, ...newEdges],
        selectedNodes: newNodes.map(n => n.id),
        selectedEdges: newEdges.map(e => e.id),
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  },

  duplicate: () => {
    const { copy, paste } = get();
    copy();
    paste({ x: 150, y: 150 });
  }
}));