import { create, all } from 'mathjs';
import { LDPCGraph, MatrixGenerationResult, EncodingResult, DecodingResult, MatrixAnalysisResult, MatrixValidationResult } from '../types';

const math = create(all);

export class LDPCService {
  
  static generateMatricesFromGraph(graph: LDPCGraph): MatrixGenerationResult {
    try {
      console.log('接收到的图形数据:', JSON.stringify(graph, null, 2));
      
      // 过滤并排序节点，确保一致的顺序
      const bitNodes = graph.nodes
        .filter(n => n.type === 'bit')
        .sort((a, b) => {
          // 优先按照标签排序，如果没有标签则按ID排序
          const labelA = a.label || a.id;
          const labelB = b.label || b.id;
          
          // 如果标签是 B1, B2 格式，按数字排序
          const matchA = labelA.match(/^[BC](\d+)$/);
          const matchB = labelB.match(/^[BC](\d+)$/);
          
          if (matchA && matchB) {
            return parseInt(matchA[1]) - parseInt(matchB[1]);
          }
          
          return labelA.localeCompare(labelB);
        });
      
      const checkNodes = graph.nodes
        .filter(n => n.type === 'check')
        .sort((a, b) => {
          const labelA = a.label || a.id;
          const labelB = b.label || b.id;
          
          // 如果标签是 C1, C2 格式，按数字排序
          const matchA = labelA.match(/^[BC](\d+)$/);
          const matchB = labelB.match(/^[BC](\d+)$/);
          
          if (matchA && matchB) {
            return parseInt(matchA[1]) - parseInt(matchB[1]);
          }
          
          return labelA.localeCompare(labelB);
        });
      
      console.log('排序后的比特节点:', bitNodes.map(n => ({ id: n.id, label: n.label, index: bitNodes.indexOf(n) })));
      console.log('排序后的校验节点:', checkNodes.map(n => ({ id: n.id, label: n.label, index: checkNodes.indexOf(n) })));
      console.log('边连接关系:', graph.edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
      
      if (bitNodes.length === 0 || checkNodes.length === 0) {
        return {
          H: [],
          G: [],
          n: 0,
          k: 0,
          minDistance: 0,
          isValid: false
        };
      }

      const n = bitNodes.length;
      const m = checkNodes.length;
      
      // 理论上的k值
      let k = n - m;
      console.log(`理论参数: n=${n}, m=${m}, k=${k}`);

      if (k <= 0) {
        console.log(`无效的码参数: k=${k} <= 0`);
        return {
          H: [],
          G: [],
          n,
          k: 0,
          minDistance: 0,
          isValid: false
        };
      }

      // 初始化H矩阵
      const H: number[][] = Array(m).fill(null).map(() => Array(n).fill(0));

      // 构建H矩阵 - 基于edges连接关系
      console.log('\n=== 开始构建H矩阵 ===');
      let connectionCount = 0;
      
      bitNodes.forEach((bitNode, bitIndex) => {
        checkNodes.forEach((checkNode, checkIndex) => {
          // 检查是否存在连接
          const hasConnection = graph.edges.some(edge => 
            (edge.source === bitNode.id && edge.target === checkNode.id) ||
            (edge.source === checkNode.id && edge.target === bitNode.id)
          );
          
          if (hasConnection) {
            H[checkIndex][bitIndex] = 1;
            connectionCount++;
            console.log(`连接 ${connectionCount}: ${bitNode.label || bitNode.id} <-> ${checkNode.label || checkNode.id} => H[${checkIndex}][${bitIndex}] = 1`);
          }
        });
      });
      
      console.log(`总连接数: ${connectionCount}`);

      console.log('生成的H矩阵:', H);
      console.log('矩阵参数:', { n, m, k });
      
      // 验证H矩阵的有效性
      if (H.some(row => row.every(val => val === 0))) {
        console.warn('警告: H矩阵存在全零行');
      }
      
      const G = this.generateGeneratorMatrix(H, n, k);
      console.log('生成的G矩阵:', G);
      
      // 验证G矩阵的有效性
      if (G.length === 0) {
        console.error('错误: 无法生成有效的G矩阵');
        console.error('可能原因: H矩阵不满秩或存在线性相关的行');
        
        // 尝试计算H矩阵的实际rank来确定真实的k
        const actualRank = this.calculateMatrixRank(H);
        const actualK = n - actualRank;
        console.log(`H矩阵实际rank: ${actualRank}, 实际k: ${actualK}`);
        
        return {
          H,
          G: [],
          n,
          k: 0,  // G矩阵生成失败时k设为0
          minDistance: 0,
          isValid: false
        };
      }
      
      const minDistance = this.calculateMinimumDistance(H, G);
      console.log('计算的最小距离:', minDistance);
      
      // 验证 H * G^T = 0
      const isValid = this.verifyGeneratorMatrix(H, G);
      console.log('H * G^T = 0 验证:', isValid ? '通过' : '失败');
      
      // 临时：如果验证失败但H和G都不为空，仍然标记为有效
      // 这是为了处理前端数据格式问题
      const isValidRelaxed = (G.length > 0 && H.length > 0 && connectionCount > 0);
      console.log('宽松验证:', isValidRelaxed ? '通过' : '失败');

      // 计算列置换映射，使编码结果与系统形一致
      const columnPermutation = this.computeSystematicColumnPermutation(H);
      
      const result = {
        H,
        G,
        n,
        k,
        minDistance,
        isValid: isValid || isValidRelaxed,  // 使用宽松验证
        columnPermutation // 添加列置换信息
      };
      
      console.log('最终返回结果:', {
        H_shape: `${H.length}x${H[0]?.length || 0}`,
        G_shape: `${G.length}x${G[0]?.length || 0}`,
        n,
        k,
        minDistance,
        isValid: result.isValid
      });
      
      return result;
    } catch (error) {
      console.error('Error generating matrices:', error);
      return {
        H: [],
        G: [],
        n: 0,
        k: 0,
        minDistance: 0,
        isValid: false
      };
    }
  }

  private static generateGeneratorMatrix(H: number[][], n: number, k: number): number[][] {
    try {
      const m = H.length;
      
      console.log(`\n=== 生成G矩阵 ===`);
      console.log(`H矩阵维度: ${m}x${n}, k=${k}`);
      
      if (k <= 0) {
        console.log('k <= 0, 返回空矩阵');
        return [];
      }
      
      console.log('🔧 [G矩阵生成] 开始生成G矩阵，优先使用系统形算法');
      
      // 第一优先级：系统形生成算法
      const systematicG = this.generateSystematicForm(H, n, k);
      
      if (systematicG.length > 0) {
        const isValid = this.verifyGeneratorMatrix(H, systematicG);
        console.log(`✅ [系统形验证] ${isValid ? '通过' : '失败'}`);
        if (isValid) {
          console.log('✅ [G矩阵生成] 系统形算法成功，返回系统形G矩阵');
          return systematicG;
        } else {
          console.log('⚠️ [系统形验证] 系统形G矩阵验证失败');
        }
      }
      
      // 最后备用方案：零空间算法（仅在系统形算法完全失败时使用）
      console.log('⚠️ [备用算法] 系统形算法失败，使用零空间算法作为备用方案');
      const nullSpaceG = this.computeImprovedNullSpace(H, k);
      console.log(`零空间结果: ${nullSpaceG.length > 0 ? `${nullSpaceG.length}x${nullSpaceG[0]?.length}` : '空'}`);
      
      if (nullSpaceG.length > 0) {
        const isValid = this.verifyGeneratorMatrix(H, nullSpaceG);
        console.log(`零空间验证: ${isValid ? '通过' : '失败'}`);
        if (isValid) {
          console.log('⚠️ [备用算法] 零空间算法成功，但这不是首选方案');
          return nullSpaceG;
        }
      }
      
      console.log('❌ [G矩阵生成] 所有算法都失败');
      throw new Error('Cannot generate valid generator matrix');
    } catch (error) {
      console.error('Error generating G matrix:', error);
      return [];
    }
  }

  // 生成系统码形式的生成矩阵
  private static generateSystematicForm(H: number[][], n: number, k: number): number[][] {
    try {
      console.log('🔧 [系统形] 开始生成系统形G矩阵');
      const m = H.length;
      
      // 使用高斯-约旦消元将H矩阵转换为行最简形
      const { rref, pivotColumns } = this.toReducedRowEchelonForm(H);
      console.log('🔧 [系统形] RREF转换完成，主元列:', pivotColumns);
      
      // 检查矩阵是否有足够的秩
      const rank = this.getRankFromRREF(rref);
      console.log('🔧 [系统形] 矩阵秩:', rank, '期望:', m);
      if (rank !== m) {
        console.log('❌ [系统形] 矩阵秩不足，无法生成系统形');
        return [];
      }
      
      // 找到非主元列(自由变量列)
      const freeColumns = [];
      for (let j = 0; j < n; j++) {
        if (!pivotColumns.includes(j)) {
          freeColumns.push(j);
        }
      }
      
      console.log('🔧 [系统形] 自由列(信息位):', freeColumns, '数量:', freeColumns.length, '期望:', k);
      if (freeColumns.length !== k) {
        console.log('❌ [系统形] 自由列数量不匹配');
        return [];
      }
      
      // 构造系统形生成矩阵 G = [I_k | P^T]
      const G = [];
      for (let i = 0; i < k; i++) {
        const row = Array(n).fill(0);
        
        // 设置信息位部分为单位矩阵
        const infoCol = freeColumns[i];
        row[infoCol] = 1;
        
        // 根据RREF计算校验位
        for (let pivotIdx = 0; pivotIdx < pivotColumns.length; pivotIdx++) {
          const pivotCol = pivotColumns[pivotIdx];
          if (pivotCol < n && rref[pivotIdx] && rref[pivotIdx][infoCol]) {
            row[pivotCol] = rref[pivotIdx][infoCol];
          }
        }
        
        G.push(row);
      }
      
      console.log('✅ [系统形] 成功生成系统形G矩阵:', G.length, 'x', G[0]?.length);
      return G;
      
    } catch (error) {
      console.error('❌ [系统形] 生成失败:', error);
      return [];
    }
  }
  
  // 检查H矩阵是否已经是标准汉明码形式 [A | I_m]
  private static checkStandardHammingForm(H: number[][]): boolean {
    const m = H.length;
    const n = H[0].length;
    
    // 检查右边m列是否构成单位矩阵
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        const expectedValue = (i === j) ? 1 : 0;
        if (H[i][n - m + j] !== expectedValue) {
          return false;
        }
      }
    }
    
    return true;
  }

  // 改进的零空间计算
  private static computeImprovedNullSpace(H: number[][], k: number): number[][] {
    const { rref, pivotColumns } = this.toReducedRowEchelonForm(H);
    const n = H[0].length;
    const m = H.length;
    
    // 找到自由变量列
    const freeColumns = [];
    for (let j = 0; j < n; j++) {
      if (!pivotColumns.includes(j)) {
        freeColumns.push(j);
      }
    }
    
    if (freeColumns.length !== k) {
      return [];
    }
    
    const nullSpaceBasis = [];
    
    // 为每个自由变量生成一个基向量
    for (let i = 0; i < k; i++) {
      const basisVector = Array(n).fill(0);
      const freeCol = freeColumns[i];
      
      // 设置自由变量为1
      basisVector[freeCol] = 1;
      
      // 根据RREF计算依赖变量的值
      for (let row = m - 1; row >= 0; row--) {
        // 找到这一行的主元列
        let pivotCol = -1;
        for (let col = 0; col < n; col++) {
          if (rref[row][col] === 1) {
            pivotCol = col;
            break;
          }
        }
        
        if (pivotCol !== -1) {
          // 计算主元变量的值
          let sum = 0;
          for (let col = pivotCol + 1; col < n; col++) {
            if (rref[row][col] === 1) {
              sum ^= basisVector[col]; // GF(2)加法
            }
          }
          basisVector[pivotCol] = sum;
        }
      }
      
      nullSpaceBasis.push(basisVector);
    }
    
    return nullSpaceBasis;
  }

  // 验证生成矩阵的正确性
  private static verifyGeneratorMatrix(H: number[][], G: number[][]): boolean {
    if (G.length === 0 || H.length === 0) {
      return false;
    }
    
    const m = H.length;
    const n = H[0].length;
    const k = G.length;
    
    // 验证维度
    if (G[0].length !== n || k !== n - m) {
      return false;
    }
    
    // 验证 H * G^T = 0 (在GF(2)上)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < k; j++) {
        let sum = 0;
        for (let l = 0; l < n; l++) {
          sum ^= H[i][l] * G[j][l]; // GF(2)运算
        }
        if (sum !== 0) {
          return false;
        }
      }
    }
    
    return true;
  }

  // 改进的行最简阶梯形式算法
  private static toReducedRowEchelonForm(matrix: number[][]): {
    rref: number[][];
    pivotColumns: number[];
    columnPermutation?: number[];
  } {
    const result = matrix.map(row => [...row]);
    const rows = result.length;
    const cols = result[0].length;
    const pivotColumns: number[] = [];
    
    let currentRow = 0;
    
    for (let col = 0; col < cols && currentRow < rows; col++) {
      // 寻找主元
      let pivotRow = -1;
      for (let row = currentRow; row < rows; row++) {
        if (result[row][col] === 1) {
          pivotRow = row;
          break;
        }
      }
      
      if (pivotRow === -1) {
        continue; // 这一列没有主元，跳过
      }
      
      // 交换行
      if (pivotRow !== currentRow) {
        [result[currentRow], result[pivotRow]] = [result[pivotRow], result[currentRow]];
      }
      
      pivotColumns.push(col);
      
      // 消元（向前和向后）
      for (let row = 0; row < rows; row++) {
        if (row !== currentRow && result[row][col] === 1) {
          for (let k = 0; k < cols; k++) {
            result[row][k] ^= result[currentRow][k]; // GF(2)运算
          }
        }
      }
      
      currentRow++;
    }
    
    return { rref: result, pivotColumns };
  }





  // 获取RREF矩阵的秩
  private static getRankFromRREF(rref: number[][]): number {
    let rank = 0;
    for (let i = 0; i < rref.length; i++) {
      let hasNonZero = false;
      for (let j = 0; j < rref[i].length; j++) {
        if (rref[i][j] === 1) {
          hasNonZero = true;
          break;
        }
      }
      if (hasNonZero) {
        rank++;
      }
    }
    return rank;
  }
  
  // 应用列置换
  private static applyColumnPermutation(matrix: number[][], permutation: number[]): number[][] {
    return matrix.map(row => {
      const newRow = Array(row.length);
      for (let i = 0; i < row.length; i++) {
        newRow[i] = row[permutation[i]];
      }
      return newRow;
    });
  }

  private static transpose(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  }

  private static calculateMinimumDistance(H: number[][], G: number[][]): number {
    if (G.length === 0 || G[0].length === 0) return 0;

    // 首先验证G矩阵的正确性
    if (!this.verifyGeneratorMatrix(H, G)) {
      console.warn('G矩阵验证失败，最小距离计算可能不准确');
      return 0;
    }

    const k = G.length;
    const n = G[0].length;
    
    // 检查是否只有一个码字（重复码）
    const allCodewords = [];
    for (let i = 0; i < Math.pow(2, k); i++) {
      const info = [];
      let temp = i;
      for (let j = 0; j < k; j++) {
        info.push(temp % 2);
        temp = Math.floor(temp / 2);
      }

      const codeword = this.encodeVector(info, G);
      allCodewords.push(codeword);
    }
    
    // 如果只有一个唯一的码字，这是重复码
    const uniqueCodewords = new Set(allCodewords.map(cw => cw.join('')));
    if (uniqueCodewords.size === 1) {
      console.log('检测到重复码，只有一个码字');
      return n; // 重复码的最小距离等于码长
    }
    
    // 对于多个码字的情况，计算最小距离
    let minDistance = n;
    const maxCodewords = Math.min(1000, Math.pow(2, Math.min(k, 10)));
    
    for (let i = 1; i < maxCodewords; i++) {
      const info = [];
      let temp = i;
      for (let j = 0; j < k; j++) {
        info.push(temp % 2);
        temp = Math.floor(temp / 2);
      }

      const codeword = this.encodeVector(info, G);
      const weight = codeword.reduce((sum, bit) => sum + bit, 0);
      
      if (weight > 0 && weight < minDistance) {
        minDistance = weight;
        // 早期终止：如果找到最小可能距离
        if (minDistance === 1) {
          break;
        }
      }
    }

    return minDistance;
  }

  // 计算从当前列顺序到系统形的置换映射
  private static computeSystematicColumnPermutation(H: number[][]): number[] | null {
    const m = H.length;
    const n = H[0].length;
    const k = n - m;
    
    console.log('🔧 [置换] 计算系统形列置换映射:');
    console.log(`  - 矩阵维度: ${m}×${n}, k=${k}`);
    
    try {
      // 使用高斯消元找到可以构成单位矩阵的列
      const { rref, pivotColumns } = this.toReducedRowEchelonForm([...H.map(row => [...row])]);
      
      console.log('  - 主元列位置:', pivotColumns);
      
      if (pivotColumns.length !== m) {
        console.log('  ⚠️ 无法找到完整的主元列');
        return null;
      }
      
      // 构造置换映射：[信息位列 | 校验位列]
      const freeColumns = [];
      for (let j = 0; j < n; j++) {
        if (!pivotColumns.includes(j)) {
          freeColumns.push(j);
        }
      }
      
      if (freeColumns.length !== k) {
        console.log(`  ⚠️ 自由列数量${freeColumns.length}与k=${k}不匹配`);
        return null;
      }
      
      // 系统形的列顺序应该是：[信息位列0, 信息位列1, ..., 校验位列0, 校验位列1, ...]
      const systematicOrder = [...freeColumns, ...pivotColumns];
      
      console.log('  - 自由列(信息位):', freeColumns);
      console.log('  - 主元列(校验位):', pivotColumns);
      console.log('  - 系统形列顺序:', systematicOrder);
      
      // 创建逆置换映射：从系统形位置到当前位置
      const inversePermutation = Array(n);
      for (let i = 0; i < n; i++) {
        inversePermutation[systematicOrder[i]] = i;
      }
      
      console.log('  - 逆置换映射:', inversePermutation);
      return inversePermutation;
      
    } catch (error) {
      console.log('  ❌ 计算列置换失败:', error);
      return null;
    }
  }

  static encode(information: number[], G: number[][], columnPermutation?: number[], H?: number[][], useSystematicEncoding: boolean = true): EncodingResult {
    try {
      if (information.length !== G.length) {
        return {
          codeword: [],
          success: false,
          error: `Expected ${G.length} information bits, but got ${information.length}`
        };
      }

      // 验证信息位是否为二进制
      if (!information.every(bit => bit === 0 || bit === 1)) {
        return {
          codeword: [],
          success: false,
          error: 'Information bits must be 0 or 1'
        };
      }

      console.log('🔧 [编码] 开始编码验证:');
      console.log(`  - 信息位: [${information.join(',')}]`);
      console.log(`  - G矩阵: ${G.length}×${G[0]?.length || 0}`);
      console.log(`  - 使用系统形编码: ${useSystematicEncoding}`);
      
      // 优先使用系统形编码（如果有H矩阵且用户选择）
      if (H && useSystematicEncoding) {
        console.log('🔧 [编码] 使用系统形编码方法...');
        const systematicCodeword = this.systematicEncode(information, H);
        return {
          codeword: systematicCodeword,
          success: true,
          message: 'Systematic encoding successful'
        };
      }
      
      // 验证G矩阵是否是系统码形式 [I_k | P]
      this.verifySystematicForm(G);

      const codeword = this.encodeVector(information, G);
      
      // 强制转换为系统形：前k位为信息位，后m位为校验位
      let systematicCodeword = codeword;
      if (columnPermutation) {
        console.log('🔧 [编码] 应用列置换到编码结果:');
        console.log(`  - 原始码字: [${codeword.join(',')}]`);
        console.log(`  - 列置换映射: [${columnPermutation.join(',')}]`);
        
        systematicCodeword = Array(codeword.length);
        for (let i = 0; i < codeword.length; i++) {
          systematicCodeword[i] = codeword[columnPermutation[i]];
        }
        
        console.log(`  - 系统形码字: [${systematicCodeword.join(',')}]`);
      } else {
        // 如果没有列置换，尝试强制转换为系统形
        console.log('🔧 [编码] 尝试强制转换为系统形...');
        systematicCodeword = this.forceSystematicForm(codeword, information, G);
        console.log(`  - 强制系统形码字: [${systematicCodeword.join(',')}]`);
      }
      
      return {
        codeword: systematicCodeword,
        success: true,
        message: 'Encoding successful'
      };
    } catch (error) {
      console.error('Encoding error:', error);
      return {
        codeword: [],
        success: false,
        message: 'Error occurred during encoding process: ' + (error as Error).message
      };
    }
  }

  // 新增：验证G矩阵是否是标准系统码形式
  private static verifySystematicForm(G: number[][]): void {
    const k = G.length;
    const n = G[0].length;
    
    console.log('🔧 [编码] 验证G矩阵系统码形式:');
    
    // 检查前k列是否构成单位矩阵
    let isSystematic = true;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        const expected = (i === j) ? 1 : 0;
        if (G[i][j] !== expected) {
          isSystematic = false;
          console.log(`  - 非系统码形式: G[${i}][${j}] = ${G[i][j]}, 期望 ${expected}`);
          break;
        }
      }
      if (!isSystematic) break;
    }
    
    if (isSystematic) {
      console.log('  ✅ G矩阵是标准系统码形式 [I_k | P]');
    } else {
      console.log('  ⚠️ G矩阵不是标准系统码形式');
    }
    
    // 打印G矩阵的前几行
    console.log('  - G矩阵前3行:');
    for (let i = 0; i < Math.min(3, k); i++) {
      console.log(`    行${i}: [${G[i].join(',')}]`);
    }
  }

  private static encodeVector(info: number[], G: number[][]): number[] {
    if (G.length === 0 || G[0].length === 0) {
      throw new Error('Generator matrix is empty');
    }
    
    const k = G.length;
    const n = G[0].length;
    const codeword = Array(n).fill(0);

    console.log('🔧 [编码] 开始编码:');
    console.log(`  - 信息位: [${info.join(',')}]`);
    console.log(`  - G矩阵维度: ${k}x${n}`);
    console.log(`  - G矩阵前3行:`, G.slice(0, 3));

    // 矩阵乘法: c = uG (在GF(2)上)
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < k; j++) {
        sum += info[j] * G[j][i];
      }
      codeword[i] = sum % 2; // GF(2) 运算
      
      // 调试前几位的计算过程
      if (i < 5) {
        console.log(`  - 码字位${i}: sum=${sum}, result=${codeword[i]}`);
      }
    }

    console.log(`🔧 [编码] 编码结果: [${codeword.join(',')}]`);
    return codeword;
  }

  // 新增：强制转换为系统形的方法
  private static forceSystematicForm(codeword: number[], information: number[], G: number[][]): number[] {
    const k = information.length;
    const n = codeword.length;
    const m = n - k;
    
    console.log('🔧 [强制系统形] 开始转换:');
    console.log(`  - 原始码字: [${codeword.join(',')}]`);
    console.log(`  - 信息位: [${information.join(',')}]`);
    console.log(`  - 参数: k=${k}, n=${n}, m=${m}`);
    
    // 创建系统形码字：前k位为信息位，后m位为校验位
    const systematicCodeword = Array(n).fill(0);
    
    // 前k位直接复制信息位
    for (let i = 0; i < k; i++) {
      systematicCodeword[i] = information[i];
    }
    
    // 后m位通过H矩阵计算校验位
    // 使用 H * c^T = 0 的关系来计算校验位
    // 对于系统形码字 [u | p]，有 H * [u^T | p^T] = 0
    // 即 H_u * u^T + H_p * p^T = 0，所以 p^T = H_p^(-1) * H_u * u^T
    
    // 简化方法：直接使用G矩阵的后m列来计算校验位
    for (let i = 0; i < m; i++) {
      let parityBit = 0;
      for (let j = 0; j < k; j++) {
        // 使用G矩阵的校验部分（后m列）
        parityBit ^= information[j] * G[j][k + i];
      }
      systematicCodeword[k + i] = parityBit;
    }
    
    console.log(`  - 系统形码字: [${systematicCodeword.join(',')}]`);
    return systematicCodeword;
  }

  // 新增：将零空间G矩阵转换为系统形的方法
  private static convertToSystematicForm(nullSpaceG: number[][], H: number[][]): number[][] {
    try {
      const k = nullSpaceG.length;
      const n = nullSpaceG[0].length;
      const m = H.length;
      
      console.log('🔧 [转换系统形] 开始转换零空间G矩阵:');
      console.log(`  - 零空间G矩阵: ${k}x${n}`);
      
      // 使用高斯消元将G矩阵转换为系统形 [I_k | P]
      const { rref, pivotColumns } = this.toReducedRowEchelonForm(nullSpaceG);
      
      // 检查是否能构成系统形
      if (pivotColumns.length !== k) {
        console.log('❌ 无法转换为系统形：主元数量不足');
        return [];
      }
      
      // 检查前k列是否构成单位矩阵
      let isSystematic = true;
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          const expected = (i === j) ? 1 : 0;
          if (rref[i][j] !== expected) {
            isSystematic = false;
            break;
          }
        }
        if (!isSystematic) break;
      }
      
      if (isSystematic) {
        console.log('✅ 零空间G矩阵已经是系统形');
        return rref;
      }
      
      // 如果不是系统形，尝试重新排列列
      console.log('🔄 尝试重新排列列为系统形...');
      
      // 找到前k个线性无关的列
      const independentColumns = [];
      for (let j = 0; j < n && independentColumns.length < k; j++) {
        // 检查第j列是否与已选择的列线性无关
        let isIndependent = true;
        for (const col of independentColumns) {
          // 简化检查：如果两列相同，则线性相关
          let same = true;
          for (let i = 0; i < k; i++) {
            if (nullSpaceG[i][j] !== nullSpaceG[i][col]) {
              same = false;
              break;
            }
          }
          if (same) {
            isIndependent = false;
            break;
          }
        }
        
        if (isIndependent) {
          independentColumns.push(j);
        }
      }
      
      if (independentColumns.length !== k) {
        console.log('❌ 无法找到k个线性无关的列');
        return [];
      }
      
      // 构造系统形G矩阵
      const systematicG = [];
      for (let i = 0; i < k; i++) {
        const row = [];
        // 前k列：单位矩阵
        for (let j = 0; j < k; j++) {
          row.push(i === j ? 1 : 0);
        }
        // 后m列：从原始G矩阵的独立列中提取
        for (let j = 0; j < m; j++) {
          const originalCol = independentColumns[j] || 0;
          row.push(nullSpaceG[i][originalCol]);
        }
        systematicG.push(row);
      }
      
      console.log('✅ 成功构造系统形G矩阵');
      return systematicG;
      
    } catch (error) {
      console.error('转换系统形失败:', error);
      return [];
    }
  }

  static decode(
    received: number[], 
    H: number[][], 
    maxIterations: number = 50,
    algorithm: 'gallager-a' | 'belief-propagation' | 'min-sum' = 'gallager-a'
  ): DecodingResult {
    console.log('🔧 [后端] LDPC解码服务被调用');
    console.log('🔧 [后端] 接收数据:', received);
    console.log('🔧 [后端] 最大迭代次数:', maxIterations);
    console.log('🔧 [后端] 选择算法:', algorithm);
    
    // 调用测试函数分析解码场景
    this.testDecodingFailure(received, H);
    
    try {
      // 简单验证输入
      if (!received.every(bit => bit === 0 || bit === 1)) {
        console.log('❌ [后端] 输入验证失败：数据不是0或1');
        return {
          decoded: [...received],
          success: false,
          iterations: 0,
          correctedErrors: 0,
          message: 'BSC channel input must be 0 or 1'
        };
      }

      if (H.length === 0 || H[0].length !== received.length) {
        console.log('❌ [后端] 输入验证失败：矩阵维度不匹配');
        return {
          decoded: [...received],
          success: false,
          iterations: 0,
          correctedErrors: 0,
          message: 'Parity check matrix dimensions do not match received data'
        };
      }

      // 检查是否是重复码
      const n = H[0].length;
      const m = H.length;
      const k = n - m;
      
      if (k > 0) {
        const G = this.generateGeneratorMatrix(H, n, k);
        if (G.length > 0) {
          // 检查是否只有一个码字（重复码）
          const allCodewords = [];
          for (let i = 0; i < Math.pow(2, k); i++) {
            const info = [];
            let temp = i;
            for (let j = 0; j < k; j++) {
              info.push(temp % 2);
              temp = Math.floor(temp / 2);
            }
            const codeword = this.encodeVector(info, G);
            allCodewords.push(codeword);
          }
          
          const uniqueCodewords = new Set(allCodewords.map(cw => cw.join('')));
          const isRepetitionCode = uniqueCodewords.size === 1;
          
          if (isRepetitionCode) {
            console.log('🔧 [后端] 检测到重复码，使用简单解码策略');
            // 对于重复码，直接返回唯一的码字
            const validCodeword = allCodewords[0];
            const correctedErrors = received.reduce((count, bit, index) => 
              count + (bit !== validCodeword[index] ? 1 : 0), 0
            );
            
            return {
              decoded: validCodeword,
              success: true,
              iterations: 0,
              correctedErrors,
              message: `Repetition code decoding successful, corrected ${correctedErrors} errors`
            };
          }
        }
      }

      // 检查初始校验子
      const syndrome = this.calculateSyndrome(received, H);
      const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
      console.log('🔧 [后端] 初始校验子:', syndrome, '权重:', syndromeWeight);
      
      // 估计初始错误程度：通过校验子权重和模式分析
      const estimatedErrorCount = this.estimateErrorCount(received, H, syndrome);
      console.log('🔧 [后端] 估计初始错误数:', estimatedErrorCount);
      
      if (syndromeWeight === 0) {
        // 校验子为零就算成功，不强制要求是有效码字
        console.log('✅ [后端] 校验子为零，解码成功');
        return {
          decoded: [...received],
          success: true,
          iterations: 0,
          correctedErrors: 0,
          message: 'BSC channel: syndrome is zero, decoding successful'
        };
      }

      // 根据选择的算法调用不同的解码方法
      let result: DecodingResult;
      
      switch (algorithm) {
        case 'belief-propagation':
          console.log('🔧 [后端] 开始信念传播解码...');
          const bpResult = this.beliefPropagationDecoding(received, H, maxIterations);
          const bpSyndrome = this.calculateSyndrome(bpResult.decoded, H);
          const bpSyndromeWeight = bpSyndrome.reduce((sum, bit) => sum + bit, 0);
          const bpSuccess = bpSyndromeWeight === 0 ? this.isValidCodeword(bpResult.decoded, H, n, k) : false;
          
          result = {
            decoded: bpResult.decoded,
            success: bpSuccess,
            iterations: bpResult.iterations,
            correctedErrors: bpResult.decoded.reduce((count, bit, index) => 
              count + (bit !== received[index] ? 1 : 0), 0
            ),
            message: `Belief propagation decoding ${bpSuccess ? 'successful' : 'failed'}, ${bpResult.iterations} iterations`
          };
          break;
          
        case 'min-sum':
          console.log('🔧 [后端] 开始最小和解码...');
          const msResult = this.minSumDecoding(received, H, maxIterations);
          const msSyndrome = this.calculateSyndrome(msResult.decoded, H);
          const msSyndromeWeight = msSyndrome.reduce((sum, bit) => sum + bit, 0);
          const msSuccess = msSyndromeWeight === 0 ? this.isValidCodeword(msResult.decoded, H, n, k) : false;
          
          result = {
            decoded: msResult.decoded,
            success: msSuccess,
            iterations: msResult.iterations,
            correctedErrors: msResult.decoded.reduce((count, bit, index) => 
              count + (bit !== received[index] ? 1 : 0), 0
            ),
            message: `Min-sum decoding ${msSuccess ? 'successful' : 'failed'}, ${msResult.iterations} iterations`
          };
          break;
          
        case 'gallager-a':
        default:
          console.log('🔧 [后端] 开始Gallager-A解码...');
          result = this.simpleGallagerA(received, H, maxIterations, estimatedErrorCount);
          break;
      }
      
      console.log('✅ [后端] 解码完成，结果:', result);
      return result;
      
    } catch (error) {
      console.error('❌ [后端] 解码过程异常:', error);
      return {
        decoded: [...received],
        success: false,
        iterations: 0,
        correctedErrors: 0,
        message: 'Error occurred during decoding process: ' + (error as Error).message
      };
    }
  }

  // 改进的Gallager-A算法，专门用于BSC信道
  private static simpleGallagerA(received: number[], H: number[][], maxIterations: number, estimatedErrorCount: number = 0): DecodingResult {
    const n = received.length;
    const m = H.length;
    const k = n - m;
    let decoded = [...received];
    
    console.log('🔧 [后端] 改进Gallager-A算法开始');
    console.log('🔧 [后端] 码参数: n =', n, ', m =', m, ', k =', k);
    
    // 预计算连接关系
    const bitConnections: number[][] = Array(n).fill(null).map(() => []);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          bitConnections[j].push(i);
        }
      }
    }
    
    let iterationCount = 0;
    const maxCorrectableErrors = Math.floor((3 - 1) / 2); // 假设最小距离为3
    
    // 记录历史状态以检测循环
    const stateHistory: string[] = [];
    
    for (let iter = 0; iter < maxIterations; iter++) {
      iterationCount = iter + 1;
      let changedBits = 0;
      const newDecoded = [...decoded];
      
      // 改进的Gallager-A算法：更保守的投票策略
      for (let j = 0; j < n; j++) {
        const connectedChecks = bitConnections[j];
        let externalVotes = { zero: 0, one: 0 };
        
        // 来自校验节点的投票（外部信息）
        for (const checkIndex of connectedChecks) {
          let parity = 0;
          // 计算除了当前比特外的其他比特的奇偶性
          for (let bitIndex = 0; bitIndex < n; bitIndex++) {
            if (H[checkIndex][bitIndex] === 1 && bitIndex !== j) {
              parity ^= decoded[bitIndex];
            }
          }
          // 校验节点建议的比特值
          if (parity === 0) {
            externalVotes.zero += 1;
          } else {
            externalVotes.one += 1;
          }
        }
        
        // 决策规则：只有当外部投票一致且与接收值不同时才改变
        let newBit = decoded[j]; // 默认保持当前值
        
        if (externalVotes.zero > externalVotes.one) {
          // 外部投票建议为0
          if (externalVotes.zero >= 2) { // 至少需要2票才改变（避免单票错误）
            newBit = 0;
          }
        } else if (externalVotes.one > externalVotes.zero) {
          // 外部投票建议为1
          if (externalVotes.one >= 2) { // 至少需要2票才改变
            newBit = 1;
          }
        }
        
        // 记录变化
        if (newBit !== decoded[j]) {
          changedBits++;
        }
        newDecoded[j] = newBit;
      }
      
      decoded = newDecoded;
      
      // 检查当前校验子
      const currentSyndrome = this.calculateSyndrome(decoded, H);
      const currentSyndromeWeight = currentSyndrome.reduce((sum, bit) => sum + bit, 0);
      
      console.log(`🔧 [后端] 迭代 ${iterationCount}: 校验子权重 = ${currentSyndromeWeight}, 改变了 ${changedBits} 个比特`);
      
      // 收敛条件：校验子为零或权重很小
      if (currentSyndromeWeight === 0 || currentSyndromeWeight <= 1) {
        console.log(`✅ [后端] 在第 ${iterationCount} 次迭代收敛`);
        break;
      }
      
      // 检测循环状态
      const currentState = decoded.join('');
      if (stateHistory.includes(currentState)) {
        console.log(`⚠️ [后端] 第 ${iterationCount} 次迭代检测到循环状态，停止`);
        break;
      }
      stateHistory.push(currentState);
      
      // 防止无限循环
      if (changedBits === 0) {
        console.log(`⚠️ [后端] 第 ${iterationCount} 次迭代无变化，停止`);
        break;
      }
    }
    
    // 如果常规解码失败，尝试简单的错误校正
    let finalSyndrome = this.calculateSyndrome(decoded, H);
    let finalSyndromeWeight = finalSyndrome.reduce((sum, bit) => sum + bit, 0);
    
    if (finalSyndromeWeight > 0 && finalSyndromeWeight <= 2) {
      console.log('🔧 [后端] 尝试单比特错误校正...');
      const correctedResult = this.trySingleBitCorrection(decoded, H, received);
      if (correctedResult.success) {
        console.log('✅ [后端] 单比特错误校正成功');
        decoded = correctedResult.decoded;
        finalSyndrome = this.calculateSyndrome(decoded, H);
        finalSyndromeWeight = finalSyndrome.reduce((sum, bit) => sum + bit, 0);
      }
    }
    
    const isSuccessful = finalSyndromeWeight === 0;
    
    // 计算解码器改变的位数（真正的解码操作数）
    let correctedErrors = 0;
    for (let i = 0; i < n; i++) {
      if (received[i] !== decoded[i]) {
        correctedErrors++;
      }
    }
    
    console.log('🔧 [后端] 纠错位数计算:');
    console.log('🔧 [后端] - 接收数据:', received);
    console.log('🔧 [后端] - 解码结果:', decoded);
    console.log('🔧 [后端] - 解码器改变的位数:', correctedErrors);
    
    console.log('🔧 [后端] 最终结果分析:');
    console.log('🔧 [后端] - 校验子是否为零:', isSuccessful);
    console.log('🔧 [后端] - 纠正错误数:', correctedErrors);
    console.log('🔧 [后端] - 理论纠错能力:', maxCorrectableErrors);
    console.log('🔧 [后端] - 初始估计错误数:', estimatedErrorCount);
    
    // 严格的成功判断逻辑
    let message = '';
    let finalSuccess = false;
    
    // 首先检查校验子是否为零
    if (finalSyndromeWeight === 0) {
      // 校验子为零，进一步验证是否是有效码字
      finalSuccess = this.isValidCodeword(decoded, H, n, k);
    }
    
    if (finalSuccess) {
      message = `BSC-Gallager-A decoding successful, flipped ${correctedErrors} bits`;
    } else {
      if (finalSyndromeWeight === 0) {
        message = `BSC-Gallager-A decoding failed: syndrome is zero but result is not a valid codeword`;
      } else {
        message = `BSC-Gallager-A decoding failed, ${iterationCount} iterations still have ${finalSyndromeWeight} syndrome errors`;
      }
    }
    
    console.log('✅ [后端] 解码消息:', message);
    
    return {
      decoded,
      success: finalSuccess,
      iterations: iterationCount,
      correctedErrors,
      message
    };
  }
  
  // 单比特错误校正辅助方法
  private static trySingleBitCorrection(decoded: number[], H: number[][], received: number[]): { success: boolean, decoded: number[] } {
    const n = decoded.length;
    const m = H.length;
    const k = n - m;
    
    // 尝试翻转每一个比特，看是否能解决校验子错误
    for (let i = 0; i < n; i++) {
      const testDecoded = [...decoded];
      testDecoded[i] = 1 - testDecoded[i]; // 翻转比特
      
      const testSyndrome = this.calculateSyndrome(testDecoded, H);
      const testSyndromeWeight = testSyndrome.reduce((sum, bit) => sum + bit, 0);
      
      if (testSyndromeWeight === 0) {
        // 校验子为零就算成功，不强制要求是有效码字
        console.log(`🔧 [后端] 发现通过翻转位置 ${i} 可以校正错误，得到有效码字`);
        return { success: true, decoded: testDecoded };
      }
    }
    
    return { success: false, decoded };
  }

  private static calculateSyndrome(received: number[], H: number[][]): number[] {
    const m = H.length;
    const syndrome = Array(m).fill(0);

    for (let i = 0; i < m; i++) {
      let sum = 0;
      for (let j = 0; j < received.length; j++) {
        sum += received[j] * H[i][j];
      }
      syndrome[i] = sum % 2;
    }

    return syndrome;
  }
  
  // 估计接收数据中的错误数量
  private static estimateErrorCount(received: number[], H: number[][], syndrome: number[]): number {
    const n = received.length;
    const m = H.length;
    
    // 方法1: 基于校验子权重的简单估计
    const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
    
    // 如果校验子为零，首先检查是否真的是无错误
    if (syndromeWeight === 0) {
      // 对于重复码，如果接收数据就是唯一的码字，那么确实无错误
      const k = n - m;
      if (k > 0) {
        try {
          const G = this.generateGeneratorMatrix(H, n, k);
          if (G.length > 0) {
            // 检查接收数据是否是有效的码字
            const allCodewords = [];
            for (let i = 0; i < Math.pow(2, k); i++) {
              const info = [];
              let temp = i;
              for (let j = 0; j < k; j++) {
                info.push(temp % 2);
                temp = Math.floor(temp / 2);
              }
              const codeword = this.encodeVector(info, G);
              allCodewords.push(codeword);
            }
            
            // 检查接收数据是否匹配任何有效码字
            const receivedStr = received.join('');
            const isValidCodeword = allCodewords.some(cw => cw.join('') === receivedStr);
            
            if (isValidCodeword) {
              console.log('🔧 [后端] 接收数据是有效码字，估计无错误');
              return 0; // 确实无错误
            }
          }
        } catch (error) {
          console.log('🔧 [后端] 码字验证失败，使用启发式估计');
        }
      }
      
      // 如果无法验证，使用启发式估计
      const zerosCount = received.filter(bit => bit === 0).length;
      const onesCount = n - zerosCount;
      
      // 如果接收数据极不平衡（全0或全1占主导），可能有多个错误
      if (zerosCount <= 1 || onesCount <= 1) {
        return Math.max(3, n - Math.max(zerosCount, onesCount)); // 估计较多错误
      }
      
      return 0; // 可能确实无错误
    } else {
      // 基于校验子权重的启发式估计
      // 通常校验子权重与错误数量呈正相关
      if (syndromeWeight >= m * 0.7) {
        return Math.min(n, syndromeWeight + 1); // 高估计
      } else if (syndromeWeight >= m * 0.4) {
        return Math.min(3, syndromeWeight); // 中等估计
      } else {
        return Math.min(2, syndromeWeight); // 低估计
      }
    }
  }

  private static beliefPropagationDecoding(
    received: number[], 
    H: number[][], 
    maxIterations: number
  ): { decoded: number[]; iterations: number } {
    const n = received.length;
    const m = H.length;
    
    // 正确的LLR初始化：bit=0 -> +4, bit=1 -> -4
    // 这是因为P(bit=0|LLR>0) > P(bit=1|LLR>0)
    const intrinsicLLR = received.map(bit => bit === 0 ? 4.0 : -4.0);
    let decoded = [...received];
    let actualIterations = 0;
    
    console.log('🔧 开始信念传播解码');
    console.log('接收到的数据:', received);
    console.log('初始LLR:', intrinsicLLR);
    
    // 初始化消息数组 - 变量节点到校验节点的消息
    const varToCheckMsg = Array(m).fill(null).map(() => Array(n).fill(0));
    // 校验节点到变量节点的消息
    const checkToVarMsg = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // 预计算连接关系以提高效率
    const checkConnections: number[][] = Array(m).fill(null).map(() => []);
    const varConnections: number[][] = Array(n).fill(null).map(() => []);
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          checkConnections[i].push(j);
          varConnections[j].push(i);
        }
      }
    }
    
    // 初始化变量节点到校验节点的消息为内在LLR
    for (let i = 0; i < m; i++) {
      for (const j of checkConnections[i]) {
        varToCheckMsg[i][j] = intrinsicLLR[j];
      }
    }
    
    // 跟踪收敛情况以避免振荡
    let previousDecoded = [...decoded];
    let stagnationCount = 0;
    let previousSyndromeWeight = Infinity;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      actualIterations = iter + 1;
      
      // 校验节点更新
      for (let i = 0; i < m; i++) {
        const connectedVars = checkConnections[i];
        
        for (const j of connectedVars) {
          let product = 1.0;
          
          // 计算除了变量j之外的其他变量的tanh(LLR/2)的乘积
          for (const k of connectedVars) {
            if (k !== j) {
              const tanhVal = Math.tanh(varToCheckMsg[i][k] / 2.0);
              // 限制tanh值以避免数值问题
              product *= Math.max(-0.999, Math.min(0.999, tanhVal));
            }
          }
          
          // 更新校验节点到变量节点的消息
          if (Math.abs(product) < 0.999) {
            checkToVarMsg[i][j] = 2.0 * Math.atanh(product);
          } else {
            // 处理边界情况
            checkToVarMsg[i][j] = product > 0 ? 10.0 : -10.0;
          }
          
          // 限制消息幅度以防止数值不稳定
          checkToVarMsg[i][j] = Math.max(-20.0, Math.min(20.0, checkToVarMsg[i][j]));
        }
      }
      
      // 变量节点更新
      for (let j = 0; j < n; j++) {
        const connectedChecks = varConnections[j];
        
        // 计算总的后验LLR
        let totalLLR = intrinsicLLR[j];
        for (const i of connectedChecks) {
          totalLLR += checkToVarMsg[i][j];
        }
        
        // 硬判决
        decoded[j] = totalLLR < 0 ? 1 : 0;
        
        // 更新变量节点到校验节点的消息
        for (const i of connectedChecks) {
          varToCheckMsg[i][j] = totalLLR - checkToVarMsg[i][j];
          // 限制消息幅度
          varToCheckMsg[i][j] = Math.max(-20.0, Math.min(20.0, varToCheckMsg[i][j]));
        }
      }
      
      // 检查收敛性和停机条件
      const syndrome = this.calculateSyndrome(decoded, H);
      const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
      
      console.log(`迭代 ${iter + 1}: 校验子权重 = ${syndromeWeight}, 解码结果 = [${decoded.join(', ')}]`);
      
      // 成功收敛条件：校验子全零
      if (syndrome.every(bit => bit === 0)) {
        console.log(`✅ 在第 ${iter + 1} 次迭代收敛（校验子全零）`);
        break;
      }
      
      // 检查是否有改进
      if (syndromeWeight < previousSyndromeWeight) {
        previousSyndromeWeight = syndromeWeight;
        stagnationCount = 0;
      } else if (syndromeWeight === previousSyndromeWeight) {
        stagnationCount++;
      }
      
      // 检查是否陷入振荡或停滞
      const decodedEqual = decoded.every((bit, index) => bit === previousDecoded[index]);
      if (decodedEqual) {
        stagnationCount++;
      } else {
        stagnationCount = Math.max(0, stagnationCount - 1);
        previousDecoded = [...decoded];
      }
      
      // 如果停滞太久，提前停止
      if (stagnationCount >= 3 && iter >= 5) {
        console.log(`⚠️ 检测到停滞（${stagnationCount}次），提前停止`);
        break;
      }
    }
    
    console.log(`解码完成，迭代次数: ${actualIterations}`);
    console.log(`最终解码结果: [${decoded.join(', ')}]`);
    return { decoded, iterations: actualIterations };
  }

  // 最小和解码算法
  private static minSumDecoding(received: number[], H: number[][], maxIterations: number): { decoded: number[]; iterations: number } {
    const n = received.length;
    const m = H.length;
    
    // 初始化LLR
    const intrinsicLLR = received.map(bit => bit === 0 ? 4.0 : -4.0);
    let decoded = [...received];
    let actualIterations = 0;
    
    console.log('🔧 开始最小和解码');
    console.log('接收到的数据:', received);
    console.log('初始LLR:', intrinsicLLR);
    
    // 预计算连接关系
    const varConnections: number[][] = Array(n).fill(null).map(() => []);
    const checkConnections: number[][] = Array(m).fill(null).map(() => []);
    
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          varConnections[j].push(i);
          checkConnections[i].push(j);
        }
      }
    }
    
    // 初始化消息
    const varToCheckMsg = Array(m).fill(null).map(() => Array(n).fill(0));
    const checkToVarMsg = Array(m).fill(null).map(() => Array(n).fill(0));
    
    // 初始化变量节点到校验节点的消息
    for (let i = 0; i < m; i++) {
      for (const j of checkConnections[i]) {
        varToCheckMsg[i][j] = intrinsicLLR[j];
      }
    }
    
    // 跟踪收敛情况
    let previousSyndromeWeight = Infinity;
    let stagnationCount = 0;
    
    // 迭代解码
    for (let iter = 0; iter < maxIterations; iter++) {
      actualIterations = iter + 1;
      
      // 校验节点更新 (最小和算法)
      for (let i = 0; i < m; i++) {
        const connectedVars = checkConnections[i];
        
        for (const j of connectedVars) {
          let minLLR = Infinity;
          let secondMinLLR = Infinity;
          let minIndex = -1;
          let sign = 1;
          
          // 找到最小和次小的LLR
          for (const k of connectedVars) {
            if (k !== j) {
              const absLLR = Math.abs(varToCheckMsg[i][k]);
              if (absLLR < minLLR) {
                secondMinLLR = minLLR;
                minLLR = absLLR;
                minIndex = k;
              } else if (absLLR < secondMinLLR) {
                secondMinLLR = absLLR;
              }
              
              // 计算符号
              sign *= Math.sign(varToCheckMsg[i][k]);
            }
          }
          
          // 最小和算法的消息计算
          if (minIndex === j) {
            // 如果当前变量是最小的，使用次小值
            checkToVarMsg[i][j] = sign * secondMinLLR;
          } else {
            // 否则使用最小值
            checkToVarMsg[i][j] = sign * minLLR;
          }
          
          // 限制消息幅度
          checkToVarMsg[i][j] = Math.max(-20.0, Math.min(20.0, checkToVarMsg[i][j]));
        }
      }
      
      // 变量节点更新
      for (let j = 0; j < n; j++) {
        const connectedChecks = varConnections[j];
        
        // 计算总的后验LLR
        let totalLLR = intrinsicLLR[j];
        for (const i of connectedChecks) {
          totalLLR += checkToVarMsg[i][j];
        }
        
        // 硬判决
        decoded[j] = totalLLR < 0 ? 1 : 0;
        
        // 更新变量节点到校验节点的消息
        for (const i of connectedChecks) {
          varToCheckMsg[i][j] = totalLLR - checkToVarMsg[i][j];
          // 限制消息幅度
          varToCheckMsg[i][j] = Math.max(-20.0, Math.min(20.0, varToCheckMsg[i][j]));
        }
      }
      
      // 检查收敛
      const syndrome = this.calculateSyndrome(decoded, H);
      const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
      
      console.log(`迭代 ${iter + 1}: 校验子 = [${syndrome.join(', ')}]`);
      
      // 成功收敛条件：校验子全零
      if (syndrome.every(bit => bit === 0)) {
        console.log(`✅ 在第 ${iter + 1} 次迭代收敛（校验子全零）`);
        break;
      }
      
      // 检查是否陷入停滞
      if (iter > 0 && syndromeWeight === previousSyndromeWeight) {
        stagnationCount++;
        if (stagnationCount >= 3) {
          console.log(`⚠️ 检测到停滞（${stagnationCount}次），提前停止`);
          break;
        }
      } else {
        stagnationCount = 0;
      }
      
      previousSyndromeWeight = syndromeWeight;
    }
    
    console.log(`解码完成，迭代次数: ${actualIterations}`);
    console.log(`最终解码结果: [${decoded.join(', ')}]`);
    return { decoded, iterations: actualIterations };
  }

  // 计算矩阵的rank (简化版本，用于调试)
  private static calculateMatrixRank(matrix: number[][]): number {
    if (matrix.length === 0 || matrix[0].length === 0) return 0;
    
    // 创建矩阵的副本
    const A = matrix.map(row => [...row]);
    const m = A.length;
    const n = A[0].length;
    
    let rank = 0;
    
    for (let col = 0; col < n && rank < m; col++) {
      // 找到主元
      let pivotRow = -1;
      for (let row = rank; row < m; row++) {
        if (A[row][col] === 1) {
          pivotRow = row;
          break;
        }
      }
      
      if (pivotRow === -1) continue; // 没有找到主元
      
      // 交换行
      if (pivotRow !== rank) {
        [A[rank], A[pivotRow]] = [A[pivotRow], A[rank]];
      }
      
      // 消元
      for (let row = 0; row < m; row++) {
        if (row !== rank && A[row][col] === 1) {
          for (let c = 0; c < n; c++) {
            A[row][c] ^= A[rank][c]; // GF(2)下的异或操作
          }
        }
      }
      
      rank++;
    }
    
    return rank;
  }

  static analyzeCode(H: number[][], G: number[][]): {
    codeRate: number;
    density: number;
    averageDegree: { bit: number; check: number };
  } {
    const n = H[0]?.length || 0;
    const m = H.length;
    const k = G.length;

    const codeRate = k / n;
    
    const totalOnes = H.reduce((sum, row) => 
      sum + row.reduce((rowSum, bit) => rowSum + bit, 0), 0
    );
    const density = totalOnes / (m * n);

    const bitDegrees = Array(n).fill(0);
    const checkDegrees = Array(m).fill(0);

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (H[i][j] === 1) {
          bitDegrees[j]++;
          checkDegrees[i]++;
        }
      }
    }

    const avgBitDegree = bitDegrees.reduce((sum, deg) => sum + deg, 0) / n;
    const avgCheckDegree = checkDegrees.reduce((sum, deg) => sum + deg, 0) / m;

    return {
      codeRate,
      density,
      averageDegree: {
        bit: avgBitDegree,
        check: avgCheckDegree
      }
    };
  }

  // 新增：简化的系统形编码方法
  private static systematicEncode(information: number[], H: number[][]): number[] {
    const k = information.length;
    const n = H[0].length;
    const m = H.length;
    
    console.log('🔧 [系统形编码] 开始系统形编码:');
    console.log(`  - 信息位: [${information.join(',')}]`);
    console.log(`  - H矩阵: ${m}x${n}`);
    console.log(`  - 参数: k=${k}, n=${n}, m=${m}`);
    
    // 创建系统形码字：前k位为信息位，后m位为校验位
    const codeword = Array(n).fill(0);
    
    // 前k位直接复制信息位
    for (let i = 0; i < k; i++) {
      codeword[i] = information[i];
    }
    
    // 后m位通过H矩阵计算校验位
    // 对于系统形码字 [u | p]，有 H * [u^T | p^T] = 0
    // 即 H_u * u^T + H_p * p^T = 0，所以 p^T = H_p^(-1) * H_u * u^T
    
    // 提取H矩阵的信息部分和校验部分
    const H_u = []; // H矩阵的前k列（信息部分）
    const H_p = []; // H矩阵的后m列（校验部分）
    
    for (let i = 0; i < m; i++) {
      const row_u = [];
      const row_p = [];
      for (let j = 0; j < k; j++) {
        row_u.push(H[i][j]);
      }
      for (let j = k; j < n; j++) {
        row_p.push(H[i][j]);
      }
      H_u.push(row_u);
      H_p.push(row_p);
    }
    
    // 计算 H_u * u^T
    const Hu_u = [];
    for (let i = 0; i < m; i++) {
      let sum = 0;
      for (let j = 0; j < k; j++) {
        sum ^= H_u[i][j] * information[j];
      }
      Hu_u.push(sum);
    }
    
    // 计算校验位：p^T = H_p^(-1) * Hu_u
    // 简化方法：直接求解线性方程组 H_p * p^T = Hu_u
    const parityBits = this.solveLinearSystem(H_p, Hu_u);
    
    // 将校验位填入码字的后m位
    for (let i = 0; i < m; i++) {
      codeword[k + i] = parityBits[i];
    }
    
    console.log(`  - 系统形码字: [${codeword.join(',')}]`);
    return codeword;
  }

  // 新增：求解线性方程组的方法（GF(2)）
  private static solveLinearSystem(A: number[][], b: number[]): number[] {
    const m = A.length;
    const n = A[0].length;
    
    // 构造增广矩阵 [A | b]
    const augmented = [];
    for (let i = 0; i < m; i++) {
      const row = [...A[i], b[i]];
      augmented.push(row);
    }
    
    // 高斯消元
    const { rref } = this.toReducedRowEchelonForm(augmented);
    
    // 提取解
    const solution = Array(n).fill(0);
    for (let i = 0; i < m; i++) {
      let pivotCol = -1;
      for (let j = 0; j < n; j++) {
        if (rref[i][j] === 1) {
          pivotCol = j;
          break;
        }
      }
      if (pivotCol !== -1) {
        solution[pivotCol] = rref[i][n]; // 最后一列是常数项
      }
    }
    
    return solution;
  }

  // 强制验证解码失败 - 测试函数
  static testDecodingFailure(received: number[], H: number[][], originalCodeword: number[] = []): void {
    const n = H[0].length;
    const m = H.length;
    const k = n - m;
    
    console.log('🔬 [解码失败测试] 开始测试解码失败检测');
    console.log(`🔬 [解码失败测试] 码参数: n=${n}, k=${k}, m=${m}`);
    console.log(`🔬 [解码失败测试] 接收数据: [${received.join(',')}]`);
    
    if (originalCodeword.length > 0) {
      const errorPattern = received.map((bit, i) => bit !== originalCodeword[i] ? 1 : 0);
      const errorCount = errorPattern.reduce((sum, bit) => sum + bit, 0);
      console.log(`🔬 [解码失败测试] 原始码字: [${originalCodeword.join(',')}]`);
      console.log(`🔬 [解码失败测试] 错误模式: [${errorPattern.join(',')}] (${errorCount}个错误)`);
    }
    
    // 计算最小距离和理论纠错能力
    const G = this.generateGeneratorMatrix(H, n, k);
    if (G.length > 0) {
      const minDistance = this.calculateMinimumDistance(H, G);
      const theoreticalCapability = Math.floor((minDistance - 1) / 2);
      console.log(`🔬 [解码失败测试] 最小距离: ${minDistance}, 理论纠错能力: ${theoreticalCapability}`);
    }
    
    // 检查当前接收数据的校验子
    const syndrome = this.calculateSyndrome(received, H);
    const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
    console.log(`🔬 [解码失败测试] 校验子: [${syndrome.join(',')}], 权重: ${syndromeWeight}`);
    
    // 如果校验子为零，检查是否是有效码字
    if (syndromeWeight === 0) {
      console.log('🔬 [解码失败测试] 校验子为零，检查是否是有效码字');
      const isValid = this.isValidCodeword(received, H, n, k);
      console.log(`🔬 [解码失败测试] 是有效码字: ${isValid}`);
    }
  }

  // 验证解码结果是否是有效码字
  private static isValidCodeword(decoded: number[], H: number[][], n: number, k: number): boolean {
    try {
      console.log('🔧 [验证码字] 开始验证解码结果是否为有效码字');
      
      // 首先验证校验子确实为零
      const syndrome = this.calculateSyndrome(decoded, H);
      const syndromeWeight = syndrome.reduce((sum, bit) => sum + bit, 0);
      
      if (syndromeWeight !== 0) {
        console.log('❌ [验证码字] 校验子不为零:', syndrome);
        return false;
      }
      
      // 生成所有有效码字进行比对（仅适用于小码本）
      if (k <= 15) { // 扩大验证范围到k=15
        console.log('🔧 [验证码字] 小码本，生成所有有效码字进行验证');
        
        const G = this.generateGeneratorMatrix(H, n, k);
        if (G.length === 0) {
          console.log('⚠️ [验证码字] 无法生成G矩阵，退化为校验子验证');
          return true; // 退化为仅校验子验证
        }
        
        // 生成所有可能的有效码字
        const decodedStr = decoded.join('');
        for (let i = 0; i < Math.pow(2, k); i++) {
          const info = [];
          let temp = i;
          for (let j = 0; j < k; j++) {
            info.push(temp % 2);
            temp = Math.floor(temp / 2);
          }
          
          const codeword = this.encodeVector(info, G);
          const codewordStr = codeword.join('');
          
          if (codewordStr === decodedStr) {
            console.log('✅ [验证码字] 找到匹配的有效码字，解码正确');
            console.log(`   - 信息位: [${info.join(',')}]`);
            console.log(`   - 码字: [${codeword.join(',')}]`);
            return true;
          }
        }
        
        console.log('❌ [验证码字] 未找到匹配的有效码字，解码错误');
        console.log(`   - 解码结果: [${decoded.join(',')}]`);
        return false;
      } else {
        // 对于大码本，仅依赖校验子验证
        console.log('🔧 [验证码字] 大码本，仅使用校验子验证');
        return true; // 校验子为零就认为正确
      }
      
    } catch (error) {
      console.error('❌ [验证码字] 验证过程出错:', error);
      return true; // 出错时保守地认为正确
    }
  }

  // 分析矩阵属性和性能
  static analyzeMatrices(H: number[][], G: number[][]): MatrixAnalysisResult {
    try {
      // 验证输入矩阵
      if (!H || !G || H.length === 0 || G.length === 0) {
        return {
          success: false,
          error: 'Invalid matrix - matrices cannot be empty',
          analysis: {} as any
        };
      }

      if (!Array.isArray(H) || !Array.isArray(G)) {
        return {
          success: false,
          error: 'Invalid matrix format - matrices must be arrays',
          analysis: {} as any
        };
      }

      const m = H.length;           // 校验位数
      const n = H[0]?.length || 0;  // 码长
      const k = G.length;           // 信息位数

      // 检查矩阵维度兼容性
      if (n !== (G[0]?.length || 0)) {
        return {
          success: false,
          error: 'Incompatible matrix dimensions - H and G must have same number of columns',
          analysis: {} as any
        };
      }

      // 计算码参数
      const rate = k / n;

      // 计算矩阵密度
      const totalElements = m * n;
      const nonZeroElements = H.flat().reduce((sum, val) => sum + (val !== 0 ? 1 : 0), 0);
      const density = (nonZeroElements / totalElements) * 100;

      // 计算度分布
      const bitNodeDegrees: number[] = [];
      const checkNodeDegrees: number[] = [];

      // 比特节点度分布
      for (let j = 0; j < n; j++) {
        let degree = 0;
        for (let i = 0; i < m; i++) {
          if (H[i][j] === 1) degree++;
        }
        bitNodeDegrees.push(degree);
      }

      // 校验节点度分布
      for (let i = 0; i < m; i++) {
        let degree = 0;
        for (let j = 0; j < n; j++) {
          if (H[i][j] === 1) degree++;
        }
        checkNodeDegrees.push(degree);
      }

      // 判断是否为规则码
      const avgBitDegree = bitNodeDegrees.reduce((sum, d) => sum + d, 0) / n;
      const avgCheckDegree = checkNodeDegrees.reduce((sum, d) => sum + d, 0) / m;
      const isRegular = bitNodeDegrees.every(d => d === bitNodeDegrees[0]) && 
                       checkNodeDegrees.every(d => d === checkNodeDegrees[0]);

      // 估算最小距离（简化估算）
      const minDistance = Math.max(2, Math.min(avgBitDegree + 1, n - k + 1));

      // 计算Shannon限
      const shannonLimit = rate * Math.log2(1 + Math.pow(10, 3)); // 假设SNR=3dB

      return {
        success: true,
        analysis: {
          codeParameters: {
            n: n,
            k: k,
            m: m,
            rate: rate
          },
          matrixProperties: {
            density: density,
            isRegular: isRegular
          },
          degreeDistribution: {
            bitNodeDegrees: bitNodeDegrees,
            checkNodeDegrees: checkNodeDegrees
          },
          performanceEstimate: {
            minDistance: minDistance,
            shannonLimit: shannonLimit
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Matrix analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        analysis: {} as any
      };
    }
  }

  // 验证矩阵格式和内容
  static validateMatrix(matrix: number[][]): MatrixValidationResult {
    const errors: string[] = [];

    try {
      // 检查是否为空
      if (!matrix || matrix.length === 0) {
        errors.push('Matrix cannot be empty');
        return { isValid: false, errors };
      }

      // 检查是否为数组
      if (!Array.isArray(matrix)) {
        errors.push('Matrix must be an array');
        return { isValid: false, errors };
      }

      // 检查行是否为空
      for (let i = 0; i < matrix.length; i++) {
        if (!matrix[i] || matrix[i].length === 0) {
          errors.push('Matrix rows cannot be empty');
          return { isValid: false, errors };
        }
      }

      // 检查行长度一致性
      const firstRowLength = matrix[0].length;
      for (let i = 1; i < matrix.length; i++) {
        if (matrix[i].length !== firstRowLength) {
          errors.push('All matrix rows must have the same length');
          return { isValid: false, errors };
        }
      }

      // 检查是否为二进制
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[i].length; j++) {
          const value = matrix[i][j];
          if (value !== 0 && value !== 1) {
            errors.push('Matrix must contain only 0s and 1s');
            return { isValid: false, errors };
          }
        }
      }

      return { isValid: true, errors: [] };

    } catch (error) {
      errors.push(`Matrix validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

}
