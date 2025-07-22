import React, { useCallback, useState } from 'react';
import type { NodeInstance } from '../../types';
import { validateFile } from '../../utils/fileParser';

interface FileInputNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

export const FileInputNode: React.FC<FileInputNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    // Update node configuration with the file
    onConfigChange({
      ...node.config,
      file,
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      lastModified: new Date(file.lastModified),
    });
  }, [node.config, onConfigChange]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  const currentFile = node.config.file as File | undefined;
  const hasFile = currentFile instanceof File;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[280px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">📁</span>
        <span className="font-medium text-gray-900">文件输入</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        {node.status === 'error' && (
          <div className="ml-auto text-red-500">
            <span className="text-sm">❌</span>
          </div>
        )}
        {node.status === 'success' && (
          <div className="ml-auto text-green-500">
            <span className="text-sm">✅</span>
          </div>
        )}
      </div>

      {/* File Upload Area */}
      <div className="p-4">
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : hasFile 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {hasFile ? (
            <div className="space-y-2">
              <div className="text-green-600">
                <span className="text-2xl">📄</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {node.config.filename}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(node.config.fileSize)}
              </div>
              <button
                onClick={() => document.getElementById(`file-input-${node.id}`)?.click()}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                更换文件
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-gray-400">
                <span className="text-2xl">📁</span>
              </div>
              <div className="text-sm text-gray-600">
                拖拽文件到此处或
                <button
                  onClick={() => document.getElementById(`file-input-${node.id}`)?.click()}
                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                >
                  点击选择
                </button>
              </div>
              <div className="text-xs text-gray-500">
                支持 CSV、JSON、Excel 格式
              </div>
            </div>
          )}
          
          <input
            id={`file-input-${node.id}`}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {uploadError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {uploadError}
          </div>
        )}

        {node.error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            {node.error.message}
          </div>
        )}
      </div>

      {/* Configuration Options */}
      {hasFile && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              包含标题行
            </label>
            <input
              type="checkbox"
              checked={node.config.hasHeader !== false}
              onChange={(e) => handleConfigChange('hasHeader', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              跳过空行
            </label>
            <input
              type="checkbox"
              checked={node.config.skipEmptyLines !== false}
              onChange={(e) => handleConfigChange('skipEmptyLines', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {node.config.filename?.toLowerCase().endsWith('.csv') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CSV 分隔符
              </label>
              <input
                type="text"
                value={node.config.delimiter || ''}
                onChange={(e) => handleConfigChange('delimiter', e.target.value)}
                placeholder="自动检测"
                className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大行数
            </label>
            <input
              type="number"
              value={node.config.maxRows || ''}
              onChange={(e) => handleConfigChange('maxRows', e.target.value)}
              placeholder="全部导入"
              min="1"
              max="1000000"
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Output Port */}
      <div className="flex justify-end p-2">
        <div 
          className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"
          title="数据集输出"
        />
      </div>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};