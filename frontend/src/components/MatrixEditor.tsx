import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const EditorHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  gap: 8px;
`;

const Button = styled.button`
  padding: 6px 12px;
  background: #4a9eff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.2s ease;
  
  &:hover {
    background: #357abd;
  }
  
  &:disabled {
    background: #666;
    cursor: not-allowed;
  }
`;

const MatrixTable = styled.table`
  border-collapse: collapse;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 4px;
  overflow: hidden;
`;

const MatrixCell = styled.td<{ editable?: boolean; highlighted?: boolean }>`
  width: 30px;
  height: 25px;
  text-align: center;
  border: 1px solid #333;
  background: ${({ highlighted, editable }) => 
    highlighted ? '#4a9eff20' : 
    editable ? '#333' : '#1a1a1a'
  };
  cursor: ${({ editable }) => editable ? 'pointer' : 'default'};
  
  input {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    text-align: center;
    color: white;
    font-size: 11px;
    font-family: 'Courier New', monospace;
    
    &:focus {
      outline: 2px solid #4a9eff;
      background: #2a2a2a;
    }
  }
`;

const MatrixLabel = styled.th`
  background: #2a2a2a;
  color: #4a9eff;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: bold;
  border: 1px solid #333;
`;

const ToolBar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const StatusBar = styled.div`
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 8px;
  font-size: 11px;
  color: #999;
`;

interface MatrixEditorProps {
  matrix: number[][];
  matrixType: 'H' | 'G';
  editable?: boolean;
  onMatrixChange?: (matrix: number[][]) => void;
  onSyncToGraph?: () => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({
  matrix,
  matrixType,
  editable = false,
  onMatrixChange,
  onSyncToGraph,
}) => {
  const [localMatrix, setLocalMatrix] = useState<number[][]>(matrix);
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const [highlightedCol, setHighlightedCol] = useState<number | null>(null);

  useEffect(() => {
    setLocalMatrix(matrix);
  }, [matrix]);

  const handleCellChange = (row: number, col: number, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || (numValue !== 0 && numValue !== 1)) return;

    const newMatrix = localMatrix.map((r, i) => 
      i === row ? r.map((c, j) => j === col ? numValue : c) : [...r]
    );
    
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!editable) return;
    
    if (editingCell?.row === row && editingCell?.col === col) {
      setEditingCell(null);
    } else {
      setEditingCell({ row, col });
    }
  };

  const addRow = () => {
    if (!editable || localMatrix.length === 0) return;
    
    const newRow = Array(localMatrix[0].length).fill(0);
    const newMatrix = [...localMatrix, newRow];
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const addColumn = () => {
    if (!editable) return;
    
    const newMatrix = localMatrix.map(row => [...row, 0]);
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const removeRow = (rowIndex: number) => {
    if (!editable || localMatrix.length <= 1) return;
    
    const newMatrix = localMatrix.filter((_, i) => i !== rowIndex);
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const removeColumn = (colIndex: number) => {
    if (!editable || localMatrix[0]?.length <= 1) return;
    
    const newMatrix = localMatrix.map(row => row.filter((_, j) => j !== colIndex));
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const clearMatrix = () => {
    if (!editable) return;
    
    const newMatrix = localMatrix.map(row => row.map(() => 0));
    setLocalMatrix(newMatrix);
    onMatrixChange?.(newMatrix);
  };

  const calculateStats = () => {
    if (localMatrix.length === 0) return { density: 0, ones: 0, total: 0 };
    
    const total = localMatrix.length * localMatrix[0].length;
    const ones = localMatrix.reduce((sum, row) => 
      sum + row.reduce((rowSum, cell) => rowSum + (cell === 1 ? 1 : 0), 0), 0
    );
    
    return {
      density: (ones / total * 100).toFixed(1),
      ones,
      total
    };
  };

  const stats = calculateStats();

  if (localMatrix.length === 0) {
    return (
      <Container>
        <div style={{ color: '#999', fontSize: '12px' }}>
          Matrix is empty
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <EditorHeader>
        <h4 style={{ margin: 0, fontSize: '13px', color: '#4a9eff' }}>
          {matrixType} Matrix Editor {editable ? '(Editable)' : '(Read-only)'}
        </h4>
      </EditorHeader>

      {editable && (
        <ToolBar>
          <Button onClick={addRow}>Add Row</Button>
          <Button onClick={addColumn}>Add Column</Button>
          <Button onClick={clearMatrix}>Clear</Button>
          {onSyncToGraph && (
            <Button onClick={onSyncToGraph}>Sync to Graph</Button>
          )}
        </ToolBar>
      )}

      <div style={{ maxHeight: '300px', overflow: 'auto' }}>
        <MatrixTable>
          <thead>
            <tr>
              <MatrixLabel></MatrixLabel>
              {localMatrix[0]?.map((_, j) => (
                <MatrixLabel 
                  key={j}
                  onMouseEnter={() => setHighlightedCol(j)}
                  onMouseLeave={() => setHighlightedCol(null)}
                >
                  {j + 1}
                  {editable && localMatrix[0].length > 1 && (
                    <button
                      onClick={() => removeColumn(j)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff6b6b',
                        cursor: 'pointer',
                        fontSize: '8px',
                        marginLeft: '4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </MatrixLabel>
              ))}
            </tr>
          </thead>
          <tbody>
            {localMatrix.map((row, i) => (
              <tr key={i}>
                <MatrixLabel
                  onMouseEnter={() => setHighlightedRow(i)}
                  onMouseLeave={() => setHighlightedRow(null)}
                >
                  {i + 1}
                  {editable && localMatrix.length > 1 && (
                    <button
                      onClick={() => removeRow(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff6b6b',
                        cursor: 'pointer',
                        fontSize: '8px',
                        marginLeft: '4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </MatrixLabel>
                {row.map((cell, j) => (
                  <MatrixCell
                    key={j}
                    editable={editable}
                    highlighted={highlightedRow === i || highlightedCol === j}
                    onClick={() => handleCellClick(i, j)}
                  >
                    {editable && editingCell?.row === i && editingCell?.col === j ? (
                      <input
                        type="number"
                        min="0"
                        max="1"
                        value={cell}
                        onChange={(e) => handleCellChange(i, j, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingCell(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: cell === 1 ? '#4a9eff' : '#666' }}>
                        {cell}
                      </span>
                    )}
                  </MatrixCell>
                ))}
              </tr>
            ))}
          </tbody>
        </MatrixTable>
      </div>

      <StatusBar>
        Dimensions: {localMatrix.length} × {localMatrix[0]?.length || 0} | 
        Density: {stats.density}% | 
        Non-zero elements: {stats.ones}/{stats.total}
        {editable && ' | Click cell to edit, right-click menu for row/column operations'}
      </StatusBar>
    </Container>
  );
};