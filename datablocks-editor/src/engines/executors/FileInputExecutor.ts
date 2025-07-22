import type {
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  Dataset,
} from '../../types';
import { NodeExecutor } from '../NodeExecutor';
import { parseFile, validateFile, type ParseOptions } from '../../utils/fileParser';

/**
 * File Input node executor
 * Handles file upload and parsing for CSV, JSON, and Excel files
 */
export class FileInputExecutor extends NodeExecutor {
  constructor() {
    super('file-input');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { config } = context;
      
      // Get the file from config
      const file = config.file as File;
      if (!file) {
        throw new Error('No file provided');
      }

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file');
      }

      // Parse options from config
      const parseOptions: ParseOptions = {
        hasHeader: config.hasHeader !== false, // Default to true
        delimiter: config.delimiter || '',
        skipEmptyLines: config.skipEmptyLines !== false, // Default to true
        maxRows: config.maxRows ? parseInt(config.maxRows) : undefined,
      };

      // Parse the file
      const result = await parseFile(file, parseOptions);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse file');
      }

      if (!result.dataset) {
        throw new Error('No dataset generated from file');
      }

      // Add file metadata to dataset
      const enhancedDataset: Dataset = {
        ...result.dataset,
        metadata: {
          ...result.dataset.metadata,
          created: new Date(),
          modified: new Date()
        },
      };

      return enhancedDataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { config } = context;
    const errors = [];
    const warnings = [];

    // Check if file is provided
    if (!config.file) {
      errors.push({
        field: 'file',
        message: 'File is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      const file = config.file as File;
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push({
          field: 'file',
          message: validation.error || 'Invalid file',
          code: 'INVALID_FILE',
        });
      }
    }

    // Validate optional configuration
    if (config.maxRows) {
      const maxRows = parseInt(config.maxRows);
      if (isNaN(maxRows) || maxRows <= 0) {
        errors.push({
          field: 'maxRows',
          message: 'Max rows must be a positive number',
          code: 'INVALID_VALUE',
        });
      } else if (maxRows > 1000000) {
        warnings.push({
          field: 'maxRows',
          message: 'Large row limits may impact performance',
          code: 'PERFORMANCE_WARNING',
        });
      }
    }

    if (config.delimiter && typeof config.delimiter !== 'string') {
      errors.push({
        field: 'delimiter',
        message: 'Delimiter must be a string',
        code: 'INVALID_TYPE',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}