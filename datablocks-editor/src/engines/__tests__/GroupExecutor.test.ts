import { describe, it, expect, beforeEach } from 'vitest';
import { GroupExecutor } from '../executors/BaseExecutors';
import type { Dataset, ExecutionContext } from '../../types';

describe('GroupExecutor', () => {
  let executor: GroupExecutor;
  let mockDataset: Dataset;

  beforeEach(() => {
    executor = new GroupExecutor();
    
    // Create mock dataset
    mockDataset = {
      columns: ['id', 'name', 'department', 'salary', 'age'],
      rows: [
        [1, '张三', '技术部', 8000, 25],
        [2, '李四', '市场部', 7500, 30],
        [3, '王五', '人事部', 6500, 28],
        [4, '赵六', '技术部', 9000, 32],
        [5, '孙七', '财务部', 7000, 26],
        [6, '周八', '市场部', 8500, 29],
        [7, '吴九', '技术部', 7800, 27],
        [8, '郑十', '财务部', 6800, 31],
      ],
      metadata: {
        rowCount: 8,
        columnCount: 5,
        types: {
          id: 'number',
          name: 'string',
          department: 'string',
          salary: 'number',
          age: 'number',
        },
        nullable: {},
        unique: {},
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('execute', () => {
    it('should group data by single column with count aggregation', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: '', function: 'count' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();

      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'count_']);
      expect(output.rows).toHaveLength(4); // 4 departments
      
      // Check that we have the expected departments and counts
      const departmentCounts = new Map(output.rows.map(row => [row[0], row[1]]));
      expect(departmentCounts.get('技术部')).toBe(3);
      expect(departmentCounts.get('市场部')).toBe(2);
      expect(departmentCounts.get('人事部')).toBe(1);
      expect(departmentCounts.get('财务部')).toBe(2);
    });

    it('should group data by single column with sum aggregation', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'salary', function: 'sum', alias: 'total_salary' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'total_salary']);
      
      // Check salary sums
      const departmentSalaries = new Map(output.rows.map(row => [row[0], row[1]]));
      expect(departmentSalaries.get('技术部')).toBe(24800); // 8000 + 9000 + 7800
      expect(departmentSalaries.get('市场部')).toBe(16000); // 7500 + 8500
      expect(departmentSalaries.get('人事部')).toBe(6500);
      expect(departmentSalaries.get('财务部')).toBe(13800); // 7000 + 6800
    });

    it('should group data by single column with average aggregation', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'salary', function: 'avg', alias: 'avg_salary' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'avg_salary']);
      
      // Check salary averages
      const departmentAvgs = new Map(output.rows.map(row => [row[0], row[1]]));
      expect(departmentAvgs.get('技术部')).toBeCloseTo(8266.67, 1); // (8000 + 9000 + 7800) / 3
      expect(departmentAvgs.get('市场部')).toBe(8000); // (7500 + 8500) / 2
      expect(departmentAvgs.get('人事部')).toBe(6500);
      expect(departmentAvgs.get('财务部')).toBe(6900); // (7000 + 6800) / 2
    });

    it('should group data by single column with min/max aggregations', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'salary', function: 'min', alias: 'min_salary' },
            { column: 'salary', function: 'max', alias: 'max_salary' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'min_salary', 'max_salary']);
      
      // Check min/max salaries for 技术部
      const techRow = output.rows.find(row => row[0] === '技术部');
      expect(techRow).toBeDefined();
      expect(techRow![1]).toBe(7800); // min
      expect(techRow![2]).toBe(9000); // max
    });

    it('should group data by multiple columns', async () => {
      // Add more data with age groups for testing
      const extendedDataset = {
        ...mockDataset,
        columns: ['id', 'name', 'department', 'salary', 'age_group'],
        rows: [
          [1, '张三', '技术部', 8000, '20-30'],
          [2, '李四', '市场部', 7500, '30-40'],
          [3, '王五', '人事部', 6500, '20-30'],
          [4, '赵六', '技术部', 9000, '30-40'],
          [5, '孙七', '财务部', 7000, '20-30'],
          [6, '周八', '市场部', 8500, '20-30'],
          [7, '吴九', '技术部', 7800, '20-30'],
          [8, '郑十', '财务部', 6800, '30-40'],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: extendedDataset },
        config: {
          groupColumns: ['department', 'age_group'],
          aggregations: [
            { column: '', function: 'count' },
            { column: 'salary', function: 'avg', alias: 'avg_salary' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'age_group', 'count_', 'avg_salary']);
      
      // Should have multiple groups based on department + age_group combination
      expect(output.rows.length).toBeGreaterThan(4);
      
      // Find specific group
      const techYoungGroup = output.rows.find(row => 
        row[0] === '技术部' && row[1] === '20-30'
      );
      expect(techYoungGroup).toBeDefined();
      expect(techYoungGroup![2]).toBe(2); // count: 张三, 吴九
      expect(techYoungGroup![3]).toBe(7900); // avg: (8000 + 7800) / 2
    });

    it('should handle first and last aggregations', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'name', function: 'first', alias: 'first_name' },
            { column: 'name', function: 'last', alias: 'last_name' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      const output = result.output as Dataset;
      expect(output.columns).toEqual(['department', 'first_name', 'last_name']);
      
      // Check that first and last values are captured
      const techRow = output.rows.find(row => row[0] === '技术部');
      expect(techRow).toBeDefined();
      expect(techRow![1]).toBe('张三'); // first person in 技术部
      expect(techRow![2]).toBe('吴九'); // last person in 技术部
    });

    it('should throw error when no input dataset provided', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          groupColumns: ['department'],
          aggregations: [{ column: '', function: 'count' }],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No input dataset provided');
    });

    it('should throw error when no group columns specified', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: [],
          aggregations: [{ column: '', function: 'count' }],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('At least one group column is required');
    });

    it('should throw error when group column does not exist', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['nonexistent_column'],
          aggregations: [{ column: '', function: 'count' }],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Group column \'nonexistent_column\' not found');
    });
  });

  describe('validate', () => {
    it('should validate successfully with valid configuration', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'salary', function: 'sum' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when no input dataset', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          groupColumns: ['department'],
          aggregations: [{ column: 'salary', function: 'sum' }],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Input dataset is required');
    });

    it('should fail validation when no group columns', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: [],
          aggregations: [{ column: 'salary', function: 'sum' }],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('group column is required'))).toBe(true);
    });

    it('should fail validation when no aggregations', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('aggregation is required'))).toBe(true);
    });

    it('should fail validation when aggregation missing column (except count)', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: '', function: 'sum' } // sum requires a column
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Column selection is required'))).toBe(true);
    });

    it('should pass validation when count function has no column', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: '', function: 'count' } // count doesn't require a column
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
    });

    it('should fail validation with invalid aggregation function', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { input: mockDataset },
        config: {
          groupColumns: ['department'],
          aggregations: [
            { column: 'salary', function: 'invalid_function' }
          ],
        },
        metadata: {
          executionId: 'test-execution',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid aggregation function'))).toBe(true);
    });
  });
});