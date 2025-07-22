import type { Dataset } from '../../types';

export interface DatasetFactoryOptions {
  columns?: string[];
  rowCount?: number;
  includeNulls?: boolean;
  dataTypes?: Record<string, 'string' | 'number' | 'boolean'>;
}

export class DatasetFactory {
  static createSample(options: DatasetFactoryOptions = {}): Dataset {
    const {
      columns = ['name', 'age', 'city', 'salary'],
      rowCount = 5,
      includeNulls = false,
      dataTypes = {
        name: 'string',
        age: 'number',
        city: 'string',
        salary: 'number'
      }
    } = options;

    const sampleData = [
      ['Alice', 25, 'New York', 50000],
      ['Bob', 30, 'London', 60000],
      ['Charlie', 35, 'Tokyo', 70000],
      ['Diana', 28, 'Paris', 55000],
      ['Eve', 32, 'Berlin', 65000],
      ['Frank', 29, 'Sydney', 58000],
      ['Grace', 31, 'Toronto', 62000],
    ];

    const rows = sampleData.slice(0, rowCount).map(row => 
      includeNulls && Math.random() < 0.1 
        ? row.map(cell => Math.random() < 0.2 ? null : cell)
        : row
    );

    return {
      columns,
      rows,
      metadata: {
        rowCount: rows.length,
        columnCount: columns.length,
        types: dataTypes,
        nullable: Object.fromEntries(columns.map(col => [col, includeNulls])),
        unique: Object.fromEntries(columns.map(col => [col, col === 'name'])),
        created: new Date(),
        modified: new Date()
      }
    };
  }

  static createLarge(rowCount: number = 10000): Dataset {
    const columns = ['id', 'value', 'category'];
    const rows = Array.from({ length: rowCount }, (_, i) => [
      i,
      Math.random() * 1000,
      `category_${i % 10}`,
    ]);

    return {
      columns,
      rows,
      metadata: {
        rowCount,
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
  }

  static createEmpty(): Dataset {
    return {
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
  }
}