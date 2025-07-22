import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionEngine } from '../ExecutionEngine';
import { DatasetFactory } from '../../__tests__/factories/datasetFactory';
import { NodeBuilder, ConnectionBuilder } from '../../__tests__/builders/nodeBuilder';
import type { Dataset, NodeInstance, Connection } from '../../types';

describe('Data Processing Engine Integration', () => {
    let executionEngine: ExecutionEngine;
    let sampleDataset: Dataset;

    beforeEach(() => {
        executionEngine = new ExecutionEngine();
        sampleDataset = DatasetFactory.createSample();
    });

    describe('End-to-End Data Processing Pipeline', () => {
        it('should process data through multiple transformation nodes', async () => {
            const nodes: NodeInstance[] = [
                NodeBuilder.create()
                    .id('input-1')
                    .position(0, 0)
                    .label('Sample Data')
                    .exampleData(sampleDataset)
                    .build(),
                NodeBuilder.create()
                    .id('filter-1')
                    .position(200, 0)
                    .label('Age Filter')
                    .filter([{ column: 'age', operator: '>', value: 28 }])
                    .build(),
                NodeBuilder.create()
                    .id('sort-1')
                    .position(400, 0)
                    .label('Sort by Salary')
                    .sort('salary', 'desc')
                    .build(),
            ];

            const edges: Connection[] = [
                ConnectionBuilder.create().id('e1').from('input-1').to('filter-1').build(),
                ConnectionBuilder.create().id('e2').from('filter-1').to('sort-1').build(),
            ];

            const result = await executionEngine.executeGraph(nodes, edges);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(3);
            expect(result.stats.completedNodes).toBe(3);
            expect(result.stats.failedNodes).toBe(0);
        });

        it('should handle complex data transformations', async () => {
            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Sample Data',
                        config: { dataset: sampleDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'group-1',
                    type: 'group',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Group by City',
                        config: {
                            groupColumns: ['city'],
                            aggregations: [
                                { column: 'salary', operation: 'avg', alias: 'avg_salary' },
                                { column: 'age', operation: 'count', alias: 'count' },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'filter-1',
                    type: 'filter',
                    position: { x: 400, y: 0 },
                    data: {
                        label: 'Filter High Salary Cities',
                        config: {
                            conditions: [
                                { column: 'avg_salary', operator: '>', value: 55000 },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'group-1', sourceHandle: 'output', targetHandle: 'input' },
                { id: 'e2', source: 'group-1', target: 'filter-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            const result = await executionEngine.executeGraph(nodes, edges);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(3);
        });

        it('should handle JavaScript transformation nodes', async () => {
            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Sample Data',
                        config: { dataset: sampleDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'js-1',
                    type: 'javascript',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Calculate Bonus',
                        config: {
                            code: `
                return data.map(row => ({
                  ...row,
                  bonus: row.salary * 0.1
                }));
              `,
                            timeout: 5000,
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'js-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            const result = await executionEngine.executeGraph(nodes, edges);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(2);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle invalid node configurations gracefully', async () => {
            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Sample Data',
                        config: { dataset: sampleDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'filter-1',
                    type: 'filter',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Invalid Filter',
                        config: {
                            conditions: [
                                { column: 'nonexistent_column', operator: '>', value: 100 },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'filter-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            await expect(executionEngine.executeGraph(nodes, edges))
                .rejects.toThrow();
        });

        it('should handle circular dependencies', async () => {
            const nodes: NodeInstance[] = [
                {
                    id: 'node-1',
                    type: 'filter',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Filter 1',
                        config: { conditions: [] },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'node-2',
                    type: 'sort',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Sort 1',
                        config: { column: 'name', direction: 'asc' },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'node-1', target: 'node-2', sourceHandle: 'output', targetHandle: 'input' },
                { id: 'e2', source: 'node-2', target: 'node-1', sourceHandle: 'output', targetHandle: 'input' }, // Circular dependency
            ];

            await expect(executionEngine.executeGraph(nodes, edges))
                .rejects.toThrow(/circular/i);
        });

        it('should handle empty datasets', async () => {
            const emptyDataset: Dataset = {
                columns: ['name', 'age'],
                rows: [],
                metadata: {
                    rowCount: 0,
                    columnCount: 2,
                    types: {
                        name: 'string',
                        age: 'number'
                    },
                    nullable: {
                        name: false,
                        age: false
                    },
                    unique: {
                        name: false,
                        age: false
                    },
                    created: new Date(),
                    modified: new Date()
                }
            };

            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Empty Data',
                        config: { dataset: emptyDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'filter-1',
                    type: 'filter',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Filter',
                        config: {
                            conditions: [
                                { column: 'age', operator: '>', value: 18 },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'filter-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            const result = await executionEngine.executeGraph(nodes, edges);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(2);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large datasets efficiently', async () => {
            const largeDataset: Dataset = {
                columns: ['id', 'value', 'category'],
                rows: Array.from({ length: 10000 }, (_, i) => [
                    i,
                    Math.random() * 1000,
                    `category_${i % 10}`,
                ]),
                metadata: {
                    rowCount: 10000,
                    columnCount: 3,
                    types: {
                        id: 'number',
                        value: 'number',
                        category: 'string'
                    },
                    nullable: {
                        id: false,
                        value: false,
                        category: false
                    },
                    unique: {
                        id: true,
                        value: false,
                        category: false
                    },
                    created: new Date(),
                    modified: new Date()
                }
            };

            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Large Dataset',
                        config: { dataset: largeDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'filter-1',
                    type: 'filter',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Value Filter',
                        config: {
                            conditions: [
                                { column: 'value', operator: '>', value: 500 },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'group-1',
                    type: 'group',
                    position: { x: 400, y: 0 },
                    data: {
                        label: 'Group by Category',
                        config: {
                            groupColumns: ['category'],
                            aggregations: [
                                { column: 'value', operation: 'avg', alias: 'avg_value' },
                                { column: 'id', operation: 'count', alias: 'count' },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'filter-1', sourceHandle: 'output', targetHandle: 'input' },
                { id: 'e2', source: 'filter-1', target: 'group-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            const startTime = Date.now();
            const result = await executionEngine.executeGraph(nodes, edges);
            const endTime = Date.now();

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(3);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        });

        it('should handle concurrent executions', async () => {
            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Sample Data',
                        config: { dataset: sampleDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'sort-1',
                    type: 'sort',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Sort by Name',
                        config: {
                            column: 'name',
                            direction: 'asc',
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'sort-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            // Execute multiple pipelines concurrently
            const promises = Array.from({ length: 5 }, () =>
                executionEngine.executeGraph(nodes, edges)
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(result.success).toBe(true);
                expect(result.stats).toBeDefined();
                expect(result.stats.totalNodes).toBe(2);
            });
        });
    });

    describe('Data Type Handling', () => {
        it('should preserve data types through transformations', async () => {
            const typedDataset: Dataset = {
                columns: ['name', 'age', 'active', 'score'],
                rows: [
                    ['Alice', 25, true, 95.5],
                    ['Bob', 30, false, 87.2],
                    ['Charlie', 35, true, 92.8],
                ],
                metadata: {
                    rowCount: 3,
                    columnCount: 4,
                    types: {
                        name: 'string',
                        age: 'number',
                        active: 'boolean',
                        score: 'number'
                    },
                    nullable: {
                        name: false,
                        age: false,
                        active: false,
                        score: false
                    },
                    unique: {
                        name: true,
                        age: false,
                        active: false,
                        score: false
                    },
                    created: new Date(),
                    modified: new Date()
                }
            };

            const nodes: NodeInstance[] = [
                {
                    id: 'input-1',
                    type: 'exampleData',
                    position: { x: 0, y: 0 },
                    data: {
                        label: 'Typed Data',
                        config: { dataset: typedDataset },
                    },
                    config: {},
                    status: 'idle'
                },
                {
                    id: 'filter-1',
                    type: 'filter',
                    position: { x: 200, y: 0 },
                    data: {
                        label: 'Active Users',
                        config: {
                            conditions: [
                                { column: 'active', operator: '=', value: true },
                            ],
                        },
                    },
                    config: {},
                    status: 'idle'
                },
            ];

            const edges: Connection[] = [
                { id: 'e1', source: 'input-1', target: 'filter-1', sourceHandle: 'output', targetHandle: 'input' },
            ];

            const result = await executionEngine.executeGraph(nodes, edges);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.stats).toBeDefined();
            expect(result.stats.totalNodes).toBe(2);
        });
    });
});