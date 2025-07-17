import {
  Dataset,
  DataType,
  PrimitiveType,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationRule,
  NodeConfigSchema,
  FilterCondition,
  FilterOperator,
} from '../types';

/**
 * Data validation utilities
 */

// ============================================================================
// TYPE VALIDATION
// ============================================================================

export const isValidDataType = (value: any, expectedType: DataType): boolean => {
  switch (expectedType) {
    case 'dataset':
      return isDataset(value);
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'any':
      return true;
    default:
      return false;
  }
};

export const isDataset = (value: any): value is Dataset => {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value.columns) &&
    Array.isArray(value.rows) &&
    typeof value.metadata === 'object' &&
    typeof value.metadata.rowCount === 'number' &&
    typeof value.metadata.columnCount === 'number' &&
    typeof value.metadata.types === 'object'
  );
};

export const inferPrimitiveType = (value: any): PrimitiveType => {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    // Try to detect date strings
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime()) && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'date';
    }
    return 'string';
  }
  
  if (typeof value === 'number') {
    return 'number';
  }
  
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  return 'string'; // fallback
};

export const inferDatasetTypes = (dataset: Dataset): Record<string, PrimitiveType> => {
  const types: Record<string, PrimitiveType> = {};
  
  dataset.columns.forEach((column, colIndex) => {
    const columnValues = dataset.rows.map(row => row[colIndex]);
    const nonNullValues = columnValues.filter(val => val !== null && val !== undefined);
    
    if (nonNullValues.length === 0) {
      types[column] = 'null';
      return;
    }
    
    // Check if all non-null values are of the same type
    const firstType = inferPrimitiveType(nonNullValues[0]);
    const allSameType = nonNullValues.every(val => inferPrimitiveType(val) === firstType);
    
    if (allSameType) {
      types[column] = firstType;
    } else {
      // Mixed types, default to string
      types[column] = 'string';
    }
  });
  
  return types;
};

// ============================================================================
// DATASET VALIDATION
// ============================================================================

export const validateDataset = (dataset: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!isDataset(dataset)) {
    errors.push({
      message: 'Invalid dataset structure',
      code: 'INVALID_DATASET',
    });
    return { valid: false, errors, warnings };
  }

  // Validate columns
  if (dataset.columns.length === 0) {
    errors.push({
      message: 'Dataset must have at least one column',
      code: 'NO_COLUMNS',
    });
  }

  // Check for duplicate column names
  const columnSet = new Set(dataset.columns);
  if (columnSet.size !== dataset.columns.length) {
    errors.push({
      message: 'Dataset contains duplicate column names',
      code: 'DUPLICATE_COLUMNS',
    });
  }

  // Validate rows
  dataset.rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push({
        message: `Row ${rowIndex} is not an array`,
        code: 'INVALID_ROW',
      });
      return;
    }

    if (row.length !== dataset.columns.length) {
      errors.push({
        message: `Row ${rowIndex} has ${row.length} values but expected ${dataset.columns.length}`,
        code: 'ROW_LENGTH_MISMATCH',
      });
    }
  });

  // Validate metadata consistency
  if (dataset.metadata.rowCount !== dataset.rows.length) {
    warnings.push({
      message: 'Metadata row count does not match actual row count',
      code: 'METADATA_MISMATCH',
    });
  }

  if (dataset.metadata.columnCount !== dataset.columns.length) {
    warnings.push({
      message: 'Metadata column count does not match actual column count',
      code: 'METADATA_MISMATCH',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

export const validateNodeConfig = (
  config: Record<string, any>,
  schema: NodeConfigSchema
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check required fields
  Object.entries(schema).forEach(([key, fieldSchema]) => {
    const value = config[key];

    if (fieldSchema.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field: key,
        message: `${fieldSchema.label} is required`,
        code: 'REQUIRED_FIELD',
      });
      return;
    }

    if (value !== undefined && value !== null) {
      // Validate field type
      const typeValid = validateFieldType(value, fieldSchema.type);
      if (!typeValid) {
        errors.push({
          field: key,
          message: `${fieldSchema.label} must be of type ${fieldSchema.type}`,
          code: 'INVALID_TYPE',
        });
      }

      // Run custom validation rules
      if (fieldSchema.validation) {
        fieldSchema.validation.forEach(rule => {
          const ruleResult = validateRule(value, rule);
          if (!ruleResult.valid) {
            errors.push({
              field: key,
              message: ruleResult.message,
              code: rule.type.toUpperCase(),
            });
          }
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

const validateFieldType = (value: any, expectedType: string): boolean => {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'select':
    case 'multiselect':
      return true; // These are validated against options separately
    case 'object':
      return typeof value === 'object' && value !== null;
    default:
      return true;
  }
};

const validateRule = (value: any, rule: ValidationRule): { valid: boolean; message: string } => {
  switch (rule.type) {
    case 'required':
      return {
        valid: value !== undefined && value !== null && value !== '',
        message: rule.message,
      };
    
    case 'min':
      if (typeof value === 'number') {
        return {
          valid: value >= rule.value,
          message: rule.message,
        };
      }
      if (typeof value === 'string') {
        return {
          valid: value.length >= rule.value,
          message: rule.message,
        };
      }
      return { valid: true, message: '' };
    
    case 'max':
      if (typeof value === 'number') {
        return {
          valid: value <= rule.value,
          message: rule.message,
        };
      }
      if (typeof value === 'string') {
        return {
          valid: value.length <= rule.value,
          message: rule.message,
        };
      }
      return { valid: true, message: '' };
    
    case 'pattern':
      if (typeof value === 'string') {
        const regex = new RegExp(rule.value);
        return {
          valid: regex.test(value),
          message: rule.message,
        };
      }
      return { valid: true, message: '' };
    
    case 'custom':
      if (rule.validator) {
        return {
          valid: rule.validator(value),
          message: rule.message,
        };
      }
      return { valid: true, message: '' };
    
    default:
      return { valid: true, message: '' };
  }
};

// ============================================================================
// FILTER VALIDATION
// ============================================================================

export const validateFilterCondition = (
  condition: FilterCondition,
  dataset: Dataset
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Check if column exists
  if (!dataset.columns.includes(condition.column)) {
    errors.push({
      field: 'column',
      message: `Column "${condition.column}" does not exist in dataset`,
      code: 'COLUMN_NOT_FOUND',
    });
  }

  // Validate operator for data type
  const validOperators = getValidOperatorsForType(condition.type);
  if (!validOperators.includes(condition.operator)) {
    errors.push({
      field: 'operator',
      message: `Operator "${condition.operator}" is not valid for type "${condition.type}"`,
      code: 'INVALID_OPERATOR',
    });
  }

  // Validate value for operator
  if (needsValue(condition.operator) && (condition.value === undefined || condition.value === null)) {
    errors.push({
      field: 'value',
      message: `Operator "${condition.operator}" requires a value`,
      code: 'VALUE_REQUIRED',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const getValidOperatorsForType = (type: PrimitiveType): FilterOperator[] => {
  const baseOperators: FilterOperator[] = ['equals', 'not_equals', 'is_null', 'is_not_null'];
  
  switch (type) {
    case 'number':
    case 'date':
      return [...baseOperators, 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'in', 'not_in'];
    
    case 'string':
      return [...baseOperators, 'contains', 'not_contains', 'starts_with', 'ends_with', 'in', 'not_in'];
    
    case 'boolean':
      return baseOperators;
    
    default:
      return baseOperators;
  }
};

const needsValue = (operator: FilterOperator): boolean => {
  return !['is_null', 'is_not_null'].includes(operator);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const createValidationError = (
  message: string,
  field?: string,
  code?: string
): ValidationError => ({
  message,
  field,
  code,
});

export const createValidationWarning = (
  message: string,
  field?: string,
  code?: string
): ValidationWarning => ({
  message,
  field,
  code,
});

export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors = results.flatMap(r => r.errors);
  const allWarnings = results.flatMap(r => r.warnings || []);
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

export const isValidationResultValid = (result: ValidationResult): boolean => {
  return result.valid && result.errors.length === 0;
};