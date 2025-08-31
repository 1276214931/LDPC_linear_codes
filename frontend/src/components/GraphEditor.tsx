import React, { useCallback, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { GraphNode } from '../types';
import styled from 'styled-components';

const EditorContainer = styled.div<{ $currentTool?: string }>`
  width: 100%;
  height: 100%;
  position: relative;
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  overflow: hidden;
  cursor: ${({ $currentTool }) => $currentTool === 'connect' ? 'crosshair' : 'default'};
  box-shadow: inset 0 0 30px rgba(99, 102, 241, 0.1);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }
`;

const Canvas = styled.svg<{ $isPanning?: boolean; $currentTool?: string }>`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  cursor: ${({ $isPanning, $currentTool }) => {
    if ($isPanning) return 'grabbing';
    if ($currentTool === 'connect') return 'crosshair';
    return 'grab';
  }};
`;

const NodeElement = styled.g<{ selected: boolean; type: 'bit' | 'check'; $currentTool?: string }>`
  filter: none;
  cursor: ${({ $currentTool }) => $currentTool === 'connect' ? 'crosshair' : 'pointer'};
  
  circle {
    fill: ${({ type, selected }) => 
      selected 
        ? 'url(#selectedGradient)' 
        : type === 'bit' 
          ? 'url(#bitGradient)' 
          : 'url(#checkGradient)'
    };
    stroke: ${({ selected, type }) => 
      selected 
        ? '#ffffff' 
        : type === 'bit'
          ? 'rgba(255, 255, 255, 0.3)'
          : 'rgba(0, 0, 0, 0.3)'
    };
    stroke-width: ${({ selected }) => selected ? '3' : '2'};
    transition: stroke 0.2s ease;
    filter: none;
  }
  
  text {
    fill: ${({ type }) => type === 'bit' ? '#ffffff' : '#000000'};
    font-size: 11px;
    font-weight: 600;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
    user-select: none;
    text-shadow: ${({ type }) => 
      type === 'bit' 
        ? '0 1px 2px rgba(0, 0, 0, 0.8)' 
        : '0 1px 2px rgba(255, 255, 255, 0.8)'
    };
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  &:hover {
    circle {
      stroke: #6366f1;
      stroke-width: 3;
    }
  }
`;

const EdgeElement = styled.line`
  stroke: transparent;
  stroke-width: 12;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  &:hover {
    stroke: rgba(99, 102, 241, 0.2);
  }
`;

const EdgeVisual = styled.line<{ $selected: boolean }>`
  stroke: ${({ $selected }) => $selected ? '#6366f1' : '#94a3b8'};
  stroke-width: ${({ $selected }) => $selected ? 3 : 2};
  transition: stroke 0.2s ease;
  pointer-events: none;
  opacity: 1;
  filter: none;
`;

const EdgeGroup = styled.g<{ $selected: boolean }>`
  &:hover ${EdgeVisual} {
    stroke: url(#edgeHoverGradient);
    stroke-width: 3;
    opacity: 1;
  }
`;

const Toolbar = styled.div`
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  z-index: 100;
  background: rgba(15, 15, 35, 0.95);
  backdrop-filter: blur(16px);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
`;

const HelpPanel = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(15, 15, 35, 0.95);
  backdrop-filter: blur(16px);
  color: #e2e8f0;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-size: 12px;
  line-height: 1.5;
  z-index: 100;
  display: ${({ $visible }) => $visible ? 'block' : 'none'};
  max-width: 280px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  h4 {
    margin: 0 0 16px 0;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 15px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    
    &::before {
      content: '💡';
      -webkit-text-fill-color: initial;
    }
  }
  
  .shortcut-group {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .shortcut {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 6px 0;
    
    &:first-child {
      font-weight: 600;
      color: #a5b4fc;
      margin-bottom: 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      
      span:last-child {
        display: none;
      }
    }
  }
  
  .key {
    background: rgba(68, 71, 90, 0.8);
    color: #e2e8f0;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 10px;
    font-weight: 600;
    border: 1px solid rgba(99, 102, 241, 0.3);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
`;

const ToolButton = styled.button<{ $active?: boolean }>`
  padding: 10px 14px;
  background: ${({ $active }) => 
    $active 
      ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
      : 'rgba(68, 71, 90, 0.4)'
  };
  color: ${({ $active }) => $active ? 'white' : '#e2e8f0'};
  border: 1px solid ${({ $active }) => 
    $active 
      ? 'rgba(99, 102, 241, 0.5)' 
      : 'rgba(68, 71, 90, 0.6)'
  };
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  
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
    background: ${({ $active }) => 
      $active 
        ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' 
        : 'rgba(99, 102, 241, 0.2)'
    };
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

type Tool = 'select' | 'bit' | 'check' | 'connect';

export const GraphEditor: React.FC = () => {
  const {
    nodes,
    edges,
    selectedNodes,
    selectedEdges,
    addNode,
    removeNode,
    moveNode,
    addEdge,
    removeEdge,
    selectNode,
    selectEdge,
    removeSelectedEdges,
    clearSelection,
    selectAll,
    copy,
    paste,
    undo,
    redo,
    canUndo,
    canRedo,
    } = useGraphStore();

  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  
  // Connection state management
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  
  // Canvas panning state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);

  const addNodeWithAutoLayout = useCallback((nodeType: 'bit' | 'check') => {
    const existingNodes = nodes.filter(n => n.type === nodeType);
    const nodeIndex = existingNodes.length + 1;
    
    // Calculate position for new node
    const baseY = nodeType === 'bit' ? 120 : 320;
    const spacing = 120;
    const startX = 100;
    
    const position = {
      x: startX + existingNodes.length * spacing,
      y: baseY
    };
    
    addNode({
      type: nodeType,
      position,
      label: `${nodeType === 'bit' ? 'B' : 'C'}${nodeIndex}`,
      connections: [],
    });
    
    // Keep current tool state, don't auto switch
  }, [nodes, addNode]);

  const getSVGCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Node selection and connection functionality
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start dragging when clicking canvas itself, not nodes or edges
    if (e.target !== svgRef.current) return;
    
    // Only allow canvas dragging in select mode and when no node is being dragged
    if (currentTool === 'select' && e.button === 0 && !e.ctrlKey && !e.metaKey && !draggedNode) {
      setIsPanning(true);
      const rect = svgRef.current!.getBoundingClientRect();
      setPanStart({
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y
      });
      clearSelection();
    }
  }, [currentTool, clearSelection, pan, draggedNode]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only handle clicks on canvas itself, not nodes or edges
    if (e.target !== svgRef.current) return;
    
    if (currentTool === 'select') {
      clearSelection();
    } else if (currentTool === 'connect') {
      // In connect mode, clicking canvas only cancels current connection, doesn't exit connect mode
      setConnectingFrom(null);
      setIsConnecting(false);
    }
  }, [currentTool, clearSelection]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    // Prevent event bubbling to canvas
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    // Immediately stop canvas dragging
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
    
    if (currentTool === 'select') {
      // Select mode: handle node selection and dragging
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      // Handle selection
      if (e.ctrlKey || e.metaKey) {
        // Multi-select: toggle selection state
        selectNode(nodeId);
      } else {
        // Single select: clear other selections, select current node
        if (!selectedNodes.includes(nodeId)) {
          clearSelection();
          selectNode(nodeId);
        }
      }
      
      // Set drag state
      setDraggedNode(nodeId);
      const coords = getSVGCoordinates(e.clientX, e.clientY);
      setDragOffset({
        x: coords.x - pan.x - node.position.x,
        y: coords.y - pan.y - node.position.y,
      });
      
    } else if (currentTool === 'connect') {
      // Connect mode: simple click to connect
      if (connectingFrom === null) {
        // Select first node
        setConnectingFrom(nodeId);
        setIsConnecting(true);
      } else if (connectingFrom !== nodeId) {
        // Select second node, connect directly
        addEdge(connectingFrom, nodeId);
        setConnectingFrom(null);
        setIsConnecting(false);
      } else {
        // Click same node, cancel connection
        setConnectingFrom(null);
        setIsConnecting(false);
      }
    }
  }, [currentTool, nodes, selectedNodes, connectingFrom, getSVGCoordinates, selectNode, addEdge, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode && currentTool === 'select') {
      // Node dragging: handle with priority
      e.preventDefault();
      const coords = getSVGCoordinates(e.clientX, e.clientY);
      const newPosition = {
        x: coords.x - pan.x - dragOffset.x,
        y: coords.y - pan.y - dragOffset.y,
      };
      moveNode(draggedNode, newPosition);
    } else if (isPanning && svgRef.current && !draggedNode) {
      // Canvas dragging: only handle when no node is being dragged
      const rect = svgRef.current.getBoundingClientRect();
      const newPan = {
        x: e.clientX - rect.left - panStart.x,
        y: e.clientY - rect.top - panStart.y
      };
      setPan(newPan);
    }
  }, [draggedNode, currentTool, getSVGCoordinates, moveNode, dragOffset, isPanning, panStart, pan]);

  const handleMouseUp = useCallback(() => {
    // Reset all drag states
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete') {
      if (selectedNodes.length > 0) {
        selectedNodes.forEach(nodeId => removeNode(nodeId));
      }
      if (selectedEdges.length > 0) {
        removeSelectedEdges();
      }
    } else if (e.key === 'Escape') {
      clearSelection();
      if (currentTool === 'connect') {
        setCurrentTool('select');
      }
      setConnectingFrom(null);
      setIsConnecting(false);
    } else if (e.key.toLowerCase() === 's' && !e.ctrlKey) {
      setCurrentTool('select');
      setConnectingFrom(null);
      setIsConnecting(false);
    } else if (e.key.toLowerCase() === 'b' && !e.ctrlKey) {
      addNodeWithAutoLayout('bit');
    } else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.altKey) {
      addNodeWithAutoLayout('check');
    } else if (e.key.toLowerCase() === 'l' && !e.ctrlKey) {
      if (currentTool === 'connect') {
        setCurrentTool('select');
        setConnectingFrom(null);
        setIsConnecting(false);
      } else {
        setCurrentTool('connect');
        setConnectingFrom(null);
        setIsConnecting(false);
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAll();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedNodes.length > 0) {
      e.preventDefault();
      copy();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      paste();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
      e.preventDefault();
      redo();
    } else if (e.key === 'F1' || (e.key.toLowerCase() === 'h' && !e.ctrlKey)) {
      e.preventDefault();
      setShowHelp(!showHelp);
    } else if (e.key === 'Home' || (e.ctrlKey && e.key === '0')) {
      e.preventDefault();
      setPan({ x: 0, y: 0 });
    }
  }, [selectedNodes, selectedEdges, removeNode, removeSelectedEdges, clearSelection, setCurrentTool, selectAll, copy, paste, undo, redo, showHelp, addNodeWithAutoLayout]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getNodeRadius = (nodeType: 'bit' | 'check') => {
    return nodeType === 'bit' ? 15 : 18;
  };

  const handleEdgeClick = useCallback((e: React.MouseEvent, edgeId: string) => {
    // Prevent event bubbling to canvas
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    // Prevent canvas dragging
    setIsPanning(false);
    setPanStart({ x: 0, y: 0 });
    
    if (currentTool === 'select') {
      selectEdge(edgeId);
    }
  }, [currentTool, selectEdge]);

  return (
    <EditorContainer $currentTool={currentTool}>
      <Toolbar>
        <ToolButton 
          $active={currentTool === 'select'} 
          onClick={() => setCurrentTool('select')}
        >
          Select
        </ToolButton>
        <ToolButton 
          $active={false} 
          onClick={() => addNodeWithAutoLayout('bit')}
        >
          Add Bit Node
        </ToolButton>
        <ToolButton 
          $active={false} 
          onClick={() => addNodeWithAutoLayout('check')}
        >
          Add Check Node
        </ToolButton>
        <ToolButton 
          $active={currentTool === 'connect'} 
          onClick={() => {
            if (currentTool === 'connect') {
              // If already in connect mode, clicking button exits connect mode
              setCurrentTool('select');
              setConnectingFrom(null);
              setIsConnecting(false);
            } else {
              // If not in connect mode, clicking button enters connect mode
              setCurrentTool('connect');
              setConnectingFrom(null);
              setIsConnecting(false);
            }
          }}
        >
          Connect
        </ToolButton>
        <ToolButton 
          $active={showHelp} 
          onClick={() => setShowHelp(!showHelp)}
        >
          Help (H)
        </ToolButton>
      </Toolbar>

      <HelpPanel $visible={showHelp}>
        <h4>Keyboard Shortcuts Help</h4>
        
        <div className="shortcut-group">
          <div className="shortcut">
            <span>Tool Switching</span>
            <span></span>
          </div>
          <div className="shortcut">
            <span>Select Tool</span>
            <span className="key">S</span>
          </div>
          <div className="shortcut">
            <span>Add Bit Node</span>
            <span className="key">B</span>
          </div>
          <div className="shortcut">
            <span>Add Check Node</span>
            <span className="key">C</span>
          </div>
          <div className="shortcut">
            <span>Connect Tool</span>
            <span className="key">L</span>
          </div>
        </div>
        
        <div className="shortcut-group">
          <div className="shortcut">
            <span>Edit Operations</span>
            <span></span>
          </div>
          <div className="shortcut">
            <span>Select All</span>
            <span className="key">Ctrl+A</span>
          </div>
          <div className="shortcut">
            <span>Copy</span>
            <span className="key">Ctrl+C</span>
          </div>
          <div className="shortcut">
            <span>Paste</span>
            <span className="key">Ctrl+V</span>
          </div>
          <div className="shortcut">
            <span>Delete Nodes/Edges</span>
            <span className="key">Delete</span>
          </div>
          <div className="shortcut">
            <span>Undo</span>
            <span className="key">Ctrl+Z</span>
          </div>
          <div className="shortcut">
            <span>Redo</span>
            <span className="key">Ctrl+Y</span>
          </div>
        </div>
        
        <div className="shortcut-group">
          <div className="shortcut">
            <span>Other</span>
            <span></span>
          </div>
          <div className="shortcut">
            <span>Cancel Selection/Connection</span>
            <span className="key">Esc</span>
          </div>
          <div className="shortcut">
            <span>Show Help</span>
            <span className="key">H / F1</span>
          </div>
          <div className="shortcut">
            <span>Reset View</span>
            <span className="key">Home / Ctrl+0</span>
          </div>
        </div>
        
        <div className="shortcut-group">
          <div className="shortcut">
            <span>Canvas Operations</span>
            <span></span>
          </div>
          <div className="shortcut">
            <span>Drag Canvas</span>
            <span className="key">Left Mouse Drag</span>
          </div>
        </div>
      </HelpPanel>

              <Canvas
          ref={svgRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          $isPanning={isPanning}
          $currentTool={currentTool}
        >
        <defs>
          {/* Node gradients */}
          <linearGradient id="bitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#2d2d2d" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          
          <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8f9fa" />
            <stop offset="50%" stopColor="#e9ecef" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          
          <linearGradient id="selectedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          
          {/* Edge gradients */}
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          
          <linearGradient id="edgeSelectedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          
          <linearGradient id="edgeHoverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        
        {/* Main content group with pan transform */}
        <g transform={`translate(${pan.x}, ${pan.y})`}>
        {/* Render edges first, ensure they're below nodes */}
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (!sourceNode || !targetNode) {
            return null;
          }
          
          const isSelected = selectedEdges.includes(edge.id);
          
          return (
            <EdgeGroup key={`edge-${edge.id}`} $selected={isSelected}>
              {/* Transparent thick line for clicking */}
              <EdgeElement
                x1={sourceNode.position.x}
                y1={sourceNode.position.y}
                x2={targetNode.position.x}
                y2={targetNode.position.y}
                onClick={(e) => handleEdgeClick(e, edge.id)}
                stroke="transparent"
              />
              {/* Thin line for display */}
              <EdgeVisual
                x1={sourceNode.position.x}
                y1={sourceNode.position.y}
                x2={targetNode.position.x}
                y2={targetNode.position.y}
                $selected={isSelected}
              />
            </EdgeGroup>
          );
        })}

        {/* Render nodes after, ensure they're above edges */}
        {nodes.map(node => (
          <NodeElement
            key={node.id}
            selected={selectedNodes.includes(node.id)}
            type={node.type}
            $currentTool={currentTool}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            {/* Large transparent click area */}
            <circle 
              cx={node.position.x} 
              cy={node.position.y} 
              r={getNodeRadius(node.type) + 12} 
              fill="transparent"
              stroke="transparent"
            />
            {/* Actual node circle */}
            <circle 
              cx={node.position.x} 
              cy={node.position.y} 
              r={getNodeRadius(node.type)} 
            />
            <text x={node.position.x} y={node.position.y}>{node.label}</text>
          </NodeElement>
        ))}


        </g>
      </Canvas>
    </EditorContainer>
  );
};