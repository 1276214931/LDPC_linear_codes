import express from 'express';
import { LDPCService } from '../services/ldpcService';
import { LDPCGraph } from '../types';
import { error, log } from 'console';

const router = express.Router();

router.post('/generate', (req, res) => {
  try {
    console.log('=== Matrix Generate API Called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const graph: LDPCGraph = req.body.graph;
    
    if (!graph) {
      console.log('错误: 没有graph数据');
      return res.status(400).json({
        error: '没有提供图数据'
      });
    }
    
    if (!graph.nodes) {
      console.log('错误: 没有nodes数据');
      return res.status(400).json({
        error: '图数据中没有nodes'
      });
    }
    
    if (!graph.edges) {
      console.log('错误: 没有edges数据');
      return res.status(400).json({
        error: '图数据中没有edges'
      });
    }
    
    console.log('图数据验证通过:', {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length
    });
    
    // 详细检查节点类型
    const bitNodes = graph.nodes.filter(n => n.type === 'bit');
    const checkNodes = graph.nodes.filter(n => n.type === 'check');
    
    console.log('节点类型统计:', {
      totalNodes: graph.nodes.length,
      bitNodes: bitNodes.length,
      checkNodes: checkNodes.length
    });
    
    console.log('所有节点详情:', graph.nodes.map(n => ({
      id: n.id,
      type: n.type,
      label: n.label
    })));
    
    if (checkNodes.length === 0) {
      console.error('错误: 没有校验节点！');
      return res.status(400).json({
        error: '图中没有校验节点，请添加校验节点'
      });
    }

    const result = LDPCService.generateMatricesFromGraph(graph);
    
    if (!result.isValid) {
      console.log('无法从提供的图生成有效的矩阵');    
      return res.status(400).json({
        error: '无法从提供的图生成有效的矩阵',
        result
      });
    }

    const analysis = LDPCService.analyzeCode(result.H, result.G);

    const response = {
      success: true,
      H: result.H,
      G: result.G,
      n: result.n,
      k: result.k,
      minDistance: result.minDistance,
      isValid: result.isValid,
      matrices: result,
      analysis
    };
    
    console.log('发送给前端的响应:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Matrix generation error:', error);
    res.status(500).json({
      error: '矩阵生成过程中发生错误'
    });
  }
});

router.post('/analyze', (req, res) => {
  try {
    const { H, G } = req.body;
    
    if (!H || !G || !Array.isArray(H) || !Array.isArray(G)) {
      return res.status(400).json({
        error: '无效的矩阵数据'
      });
    }

    const analysis = LDPCService.analyzeCode(H, G);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Matrix analysis error:', error);
    res.status(500).json({
      error: '矩阵分析过程中发生错误'
    });
  }
});

export default router;