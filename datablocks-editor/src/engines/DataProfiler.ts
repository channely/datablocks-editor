import type { Dataset, PrimitiveType } from '../types';

/**
 * Advanced data profiling and quality assessment
 */
export class DataProfiler {
  /**
   * Generate comprehensive data profile for a dataset
   */
  static profile(dataset: Dataset): DataProfile {
    const profile: DataProfile = {
      overview: this.generateOverview(dataset),
      columns: {},
      quality: this.assessDataQuality(dataset),
      relationships: this.analyzeRelationships(dataset),
      recommendations: [],
    };

    // Profile each column
    dataset.columns.forEach((column, index) => {
      profile.columns[column] = this.profileColumn(dataset, column, index);
    });

    // Generate recommendations
    profile.recommendations = this.generateRecommendations(profile);

    return profile;
  }

  /**
   * Enhanced type inference with pattern detection
   */
  static inferEnhancedType(values: any[]): EnhancedTypeInfo {
    const nonNullValues = values.filter(v => v != null);
    
    if (nonNullValues.length === 0) {
      return { type: 'null', confidence: 1.0, patterns: [] };
    }

    const patterns = this.detectPatterns(nonNullValues);
    const type = this.determineTypeFromPatterns(patterns, nonNullValues);
    const confidence = this.calculateTypeConfidence(patterns, nonNullValues);

    return { type, confidence, patterns };
  }

  /**
   * Assess data quality across multiple dimensions
   */
  static assessDataQuality(dataset: Dataset): DataQualityAssessment {
    const completeness = this.assessCompleteness(dataset);
    const consistency = this.assessConsistency(dataset);
    const accuracy = this.assessAccuracy(dataset);
    const uniqueness = this.assessUniqueness(dataset);

    const overallScore = (completeness.score + consistency.score + accuracy.score + uniqueness.score) / 4;

    return {
      overallScore,
      completeness,
      consistency,
      accuracy,
      uniqueness,
      issues: [
        ...completeness.issues,
        ...consistency.issues,
        ...accuracy.issues,
        ...uniqueness.issues,
      ],
    };
  }

  // Private helper methods

  private static generateOverview(dataset: Dataset): DatasetOverview {
    return {
      rowCount: dataset.rows.length,
      columnCount: dataset.columns.length,
      memoryUsage: this.estimateMemoryUsage(dataset),
      sparsity: this.calculateSparsity(dataset),
      duplicateRows: this.countDuplicateRows(dataset),
    };
  }

  private static profileColumn(dataset: Dataset, column: string, index: number): ColumnProfile {
    const values = dataset.rows.map(row => row[index]);
    const nonNullValues = values.filter(v => v != null);
    const typeInfo = this.inferEnhancedType(values);

    const profile: ColumnProfile = {
      name: column,
      type: typeInfo.type,
      typeConfidence: typeInfo.confidence,
      patterns: typeInfo.patterns,
      nullCount: values.length - nonNullValues.length,
      nullPercentage: ((values.length - nonNullValues.length) / values.length) * 100,
      uniqueCount: new Set(values).size,
      uniquePercentage: (new Set(values).size / values.length) * 100,
      mostFrequentValues: this.getMostFrequentValues(values, 10),
      statistics: this.calculateColumnStatistics(nonNullValues, typeInfo.type),
    };

    return profile;
  }

  private static detectPatterns(values: any[]): PatternInfo[] {
    const patterns: PatternInfo[] = [];
    const stringValues = values.filter(v => typeof v === 'string').map(v => String(v));

    if (stringValues.length === 0) return patterns;

    // Email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailMatches = stringValues.filter(v => emailPattern.test(v)).length;
    if (emailMatches > 0) {
      patterns.push({
        type: 'email',
        regex: emailPattern.source,
        matches: emailMatches,
        percentage: (emailMatches / stringValues.length) * 100,
      });
    }

    // URL pattern
    const urlPattern = /^https?:\/\/[^\s]+$/;
    const urlMatches = stringValues.filter(v => urlPattern.test(v)).length;
    if (urlMatches > 0) {
      patterns.push({
        type: 'url',
        regex: urlPattern.source,
        matches: urlMatches,
        percentage: (urlMatches / stringValues.length) * 100,
      });
    }

    // Phone pattern
    const phonePattern = /^[\+]?[1-9][\d]{0,15}$|^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
    const phoneMatches = stringValues.filter(v => phonePattern.test(v.replace(/\s/g, ''))).length;
    if (phoneMatches > 0) {
      patterns.push({
        type: 'phone',
        regex: phonePattern.source,
        matches: phoneMatches,
        percentage: (phoneMatches / stringValues.length) * 100,
      });
    }

    // Currency pattern
    const currencyPattern = /^[\$€£¥]?[\d,]+\.?\d*$/;
    const currencyMatches = stringValues.filter(v => currencyPattern.test(v)).length;
    if (currencyMatches > 0) {
      patterns.push({
        type: 'currency',
        regex: currencyPattern.source,
        matches: currencyMatches,
        percentage: (currencyMatches / stringValues.length) * 100,
      });
    }

    // Date patterns
    const datePatterns = [
      { type: 'date_iso', regex: /^\d{4}-\d{2}-\d{2}$/ },
      { type: 'date_us', regex: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
      { type: 'date_eu', regex: /^\d{1,2}\.\d{1,2}\.\d{4}$/ },
    ];

    datePatterns.forEach(({ type, regex }) => {
      const matches = stringValues.filter(v => regex.test(v)).length;
      if (matches > 0) {
        patterns.push({
          type,
          regex: regex.source,
          matches,
          percentage: (matches / stringValues.length) * 100,
        });
      }
    });

    return patterns;
  }

  private static determineTypeFromPatterns(patterns: PatternInfo[], values: any[]): PrimitiveType {
    // If we have high-confidence patterns, use them
    const highConfidencePattern = patterns.find(p => p.percentage > 80);
    if (highConfidencePattern) {
      switch (highConfidencePattern.type) {
        case 'date_iso':
        case 'date_us':
        case 'date_eu':
          return 'date';
        case 'currency':
          return 'number';
        default:
          return 'string';
      }
    }

    // Fall back to basic type inference
    const firstValue = values.find(v => v != null);
    if (typeof firstValue === 'number') return 'number';
    if (typeof firstValue === 'boolean') return 'boolean';
    if (firstValue instanceof Date) return 'date';
    
    return 'string';
  }

  private static calculateTypeConfidence(patterns: PatternInfo[], values: any[]): number {
    if (patterns.length === 0) return 0.5;
    
    const maxPatternPercentage = Math.max(...patterns.map(p => p.percentage));
    return Math.min(maxPatternPercentage / 100, 1.0);
  }

  private static assessCompleteness(dataset: Dataset): QualityDimension {
    let totalCells = dataset.rows.length * dataset.columns.length;
    let nullCells = 0;

    dataset.rows.forEach(row => {
      row.forEach(cell => {
        if (cell == null || cell === '') nullCells++;
      });
    });

    const completenessScore = ((totalCells - nullCells) / totalCells) * 100;
    const issues: string[] = [];

    if (completenessScore < 90) {
      issues.push(`Dataset is ${(100 - completenessScore).toFixed(1)}% incomplete`);
    }

    return {
      score: completenessScore,
      issues,
      details: {
        totalCells,
        nullCells,
        completenessPercentage: completenessScore,
      },
    };
  }

  private static assessConsistency(dataset: Dataset): QualityDimension {
    const issues: string[] = [];
    let consistencyScore = 100;

    // Check for consistent data types within columns
    dataset.columns.forEach((column, colIndex) => {
      const values = dataset.rows.map(row => row[colIndex]).filter(v => v != null);
      const types = new Set(values.map(v => typeof v));
      
      if (types.size > 1) {
        issues.push(`Column "${column}" has inconsistent data types`);
        consistencyScore -= 10;
      }
    });

    // Check for consistent formatting patterns
    dataset.columns.forEach((column, colIndex) => {
      const stringValues = dataset.rows
        .map(row => row[colIndex])
        .filter(v => typeof v === 'string' && v != null);
      
      if (stringValues.length > 1) {
        const patterns = this.detectPatterns(stringValues);
        const dominantPattern = patterns.find(p => p.percentage > 50);
        
        if (dominantPattern && dominantPattern.percentage < 90) {
          issues.push(`Column "${column}" has inconsistent formatting`);
          consistencyScore -= 5;
        }
      }
    });

    return {
      score: Math.max(consistencyScore, 0),
      issues,
      details: {},
    };
  }

  private static assessAccuracy(dataset: Dataset): QualityDimension {
    const issues: string[] = [];
    let accuracyScore = 100;

    // Check for obvious data entry errors
    dataset.columns.forEach((column, colIndex) => {
      const values = dataset.rows.map(row => row[colIndex]).filter(v => v != null);
      
      // Check for outliers in numeric data
      const numericValues = values.filter(v => typeof v === 'number');
      if (numericValues.length > 3) {
        const outliers = this.detectOutliers(numericValues);
        if (outliers.length > 0) {
          issues.push(`Column "${column}" contains ${outliers.length} potential outliers`);
          accuracyScore -= Math.min(outliers.length * 2, 20);
        }
      }
    });

    return {
      score: Math.max(accuracyScore, 0),
      issues,
      details: {},
    };
  }

  private static assessUniqueness(dataset: Dataset): QualityDimension {
    const issues: string[] = [];
    let uniquenessScore = 100;

    // Check for unexpected duplicates
    const duplicateRows = this.countDuplicateRows(dataset);
    if (duplicateRows > 0) {
      issues.push(`Dataset contains ${duplicateRows} duplicate rows`);
      uniquenessScore -= Math.min(duplicateRows * 5, 50);
    }

    return {
      score: Math.max(uniquenessScore, 0),
      issues,
      details: { duplicateRows },
    };
  }

  private static analyzeRelationships(dataset: Dataset): ColumnRelationship[] {
    const relationships: ColumnRelationship[] = [];

    // Analyze correlations between numeric columns
    const numericColumns = dataset.columns.filter((col, index) => {
      const values = dataset.rows.map(row => row[index]);
      return values.some(v => typeof v === 'number');
    });

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const correlation = this.calculateCorrelation(dataset, col1, col2);
        
        if (Math.abs(correlation) > 0.5) {
          relationships.push({
            column1: col1,
            column2: col2,
            type: 'correlation',
            strength: Math.abs(correlation),
            details: { correlation },
          });
        }
      }
    }

    return relationships;
  }

  private static generateRecommendations(profile: DataProfile): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (profile.quality.overallScore < 80) {
      recommendations.push('Consider data cleaning to improve overall quality');
    }

    if (profile.quality.completeness.score < 90) {
      recommendations.push('Address missing values to improve data completeness');
    }

    // Column-specific recommendations
    Object.values(profile.columns).forEach(column => {
      if (column.nullPercentage > 20) {
        recommendations.push(`Consider handling missing values in column "${column.name}"`);
      }

      if (column.uniquePercentage < 10 && column.uniqueCount > 1) {
        recommendations.push(`Column "${column.name}" has low cardinality, consider grouping`);
      }

      if (column.typeConfidence < 0.8) {
        recommendations.push(`Review data types in column "${column.name}" for consistency`);
      }
    });

    return recommendations;
  }

  // Utility methods

  private static estimateMemoryUsage(dataset: Dataset): number {
    // Rough estimation in bytes
    let size = 0;
    dataset.rows.forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string') {
          size += cell.length * 2; // UTF-16
        } else if (typeof cell === 'number') {
          size += 8; // 64-bit number
        } else if (typeof cell === 'boolean') {
          size += 1;
        } else {
          size += 8; // rough estimate for other types
        }
      });
    });
    return size;
  }

  private static calculateSparsity(dataset: Dataset): number {
    const totalCells = dataset.rows.length * dataset.columns.length;
    const nullCells = dataset.rows.reduce((count, row) => {
      return count + row.filter(cell => cell == null).length;
    }, 0);
    return (nullCells / totalCells) * 100;
  }

  private static countDuplicateRows(dataset: Dataset): number {
    const rowStrings = dataset.rows.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    return dataset.rows.length - uniqueRows.size;
  }

  private static getMostFrequentValues(values: any[], limit: number): Array<{ value: any; count: number; percentage: number }> {
    const frequency = new Map<any, number>();
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => ({
        value,
        count,
        percentage: (count / values.length) * 100,
      }));
  }

  private static calculateColumnStatistics(values: any[], type: PrimitiveType): ColumnStatistics {
    const stats: ColumnStatistics = {};

    if (type === 'number') {
      const numericValues = values.filter(v => typeof v === 'number');
      if (numericValues.length > 0) {
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        stats.mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        stats.median = this.calculateMedian(numericValues);
        stats.standardDeviation = this.calculateStandardDeviation(numericValues, stats.mean);
      }
    }

    if (type === 'string') {
      const stringValues = values.filter(v => typeof v === 'string');
      if (stringValues.length > 0) {
        stats.minLength = Math.min(...stringValues.map(s => s.length));
        stats.maxLength = Math.max(...stringValues.map(s => s.length));
        stats.avgLength = stringValues.reduce((sum, s) => sum + s.length, 0) / stringValues.length;
      }
    }

    return stats;
  }

  private static calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private static calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private static detectOutliers(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lowerBound || v > upperBound);
  }

  private static calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedValues.length) {
      return sortedValues[sortedValues.length - 1];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private static calculateCorrelation(dataset: Dataset, col1: string, col2: string): number {
    const col1Index = dataset.columns.indexOf(col1);
    const col2Index = dataset.columns.indexOf(col2);

    const pairs = dataset.rows
      .map(row => [row[col1Index], row[col2Index]])
      .filter(([a, b]) => typeof a === 'number' && typeof b === 'number') as [number, number][];

    if (pairs.length < 2) return 0;

    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

// Type definitions for data profiling

export interface DataProfile {
  overview: DatasetOverview;
  columns: Record<string, ColumnProfile>;
  quality: DataQualityAssessment;
  relationships: ColumnRelationship[];
  recommendations: string[];
}

export interface DatasetOverview {
  rowCount: number;
  columnCount: number;
  memoryUsage: number;
  sparsity: number;
  duplicateRows: number;
}

export interface ColumnProfile {
  name: string;
  type: PrimitiveType;
  typeConfidence: number;
  patterns: PatternInfo[];
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  mostFrequentValues: Array<{ value: any; count: number; percentage: number }>;
  statistics: ColumnStatistics;
}

export interface EnhancedTypeInfo {
  type: PrimitiveType;
  confidence: number;
  patterns: PatternInfo[];
}

export interface PatternInfo {
  type: string;
  regex: string;
  matches: number;
  percentage: number;
}

export interface DataQualityAssessment {
  overallScore: number;
  completeness: QualityDimension;
  consistency: QualityDimension;
  accuracy: QualityDimension;
  uniqueness: QualityDimension;
  issues: string[];
}

export interface QualityDimension {
  score: number;
  issues: string[];
  details: Record<string, any>;
}

export interface ColumnRelationship {
  column1: string;
  column2: string;
  type: 'correlation' | 'dependency' | 'hierarchy';
  strength: number;
  details: Record<string, any>;
}

export interface ColumnStatistics {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  standardDeviation?: number;
  minLength?: number;
  maxLength?: number;
  avgLength?: number;
}