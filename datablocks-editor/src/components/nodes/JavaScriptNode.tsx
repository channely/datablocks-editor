import React, { useState, useCallback, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { LoadingIndicator } from '../ui/LoadingIndicator';
import { CodeEditor } from '../ui/CodeEditor';
import { cn } from '../../utils/cn';

interface JavaScriptNodeData {
  name: string;
  code: string;
  timeout: number;
  allowConsole: boolean;
  strictMode: boolean;
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
  lastExecuted?: Date;
  executionTime?: number;
  onConfigChange?: (config: Partial<JavaScriptNodeData>) => void;
}

export const JavaScriptNode: React.FC<NodeProps<JavaScriptNodeData>> = ({
  data,
  selected,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localCode, setLocalCode] = useState(data.code || '// Process input data\nfunction process(data) {\n  // Your code here\n  return data;\n}');
  const [localTimeout, setLocalTimeout] = useState(data.timeout || 5000);
  const [localAllowConsole, setLocalAllowConsole] = useState(data.allowConsole ?? true);
  const [localStrictMode, setLocalStrictMode] = useState(data.strictMode ?? true);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);

  // Update local state when data changes
  useEffect(() => {
    if (data.code !== undefined) setLocalCode(data.code);
    if (data.timeout !== undefined) setLocalTimeout(data.timeout);
    if (data.allowConsole !== undefined) setLocalAllowConsole(data.allowConsole);
    if (data.strictMode !== undefined) setLocalStrictMode(data.strictMode);
  }, [data.code, data.timeout, data.allowConsole, data.strictMode]);

  const handleCodeChange = useCallback((value: string) => {
    setLocalCode(value);
    // Update node data
    if (data.onConfigChange) {
      data.onConfigChange({ code: value });
    }
  }, [data]);

  const handleTimeoutChange = useCallback((value: number) => {
    setLocalTimeout(value);
    if (data.onConfigChange) {
      data.onConfigChange({ timeout: value });
    }
  }, [data]);

  const handleAllowConsoleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLocalAllowConsole(checked);
    if (data.onConfigChange) {
      data.onConfigChange({ allowConsole: checked });
    }
  }, [data]);

  const handleStrictModeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setLocalStrictMode(checked);
    if (data.onConfigChange) {
      data.onConfigChange({ strictMode: checked });
    }
  }, [data]);

  const handleSyntaxErrors = useCallback((errors: string[]) => {
    setSyntaxErrors(errors);
  }, []);

  const getStatusColor = () => {
    switch (data.status) {
      case 'processing':
        return 'border-yellow-500 bg-yellow-50';
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'processing':
        return <LoadingIndicator size="sm" />;
      case 'success':
        return <span className="text-green-600">✓</span>;
      case 'error':
        return <span className="text-red-600">✗</span>;
      default:
        return <span className="text-purple-600">⚡</span>;
    }
  };

  return (
    <div
      className={cn(
        'min-w-[300px] rounded-lg border-2 bg-white shadow-lg transition-all',
        getStatusColor(),
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="data"
        className="!bg-purple-500 !border-purple-600"
        style={{ top: '50%' }}
      />

      {/* Node Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-900">
            {data.name || 'JavaScript'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1"
          >
            {isExpanded ? '−' : '+'}
          </Button>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-3">
        {/* Code Editor */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JavaScript Code
          </label>
          <CodeEditor
            value={localCode}
            onChange={handleCodeChange}
            language="javascript"
            placeholder="// Process input data
function process(data) {
  // Your code here
  return data;
}"
            className="w-full"
            minHeight={120}
            maxHeight={300}
            onError={handleSyntaxErrors}
          />
          <div className="text-xs text-gray-500 mt-1">
            Available: data (input dataset), console (if enabled)
          </div>
        </div>

        {/* Expanded Configuration */}
        {isExpanded && (
          <div className="space-y-3 border-t border-gray-200 pt-3">
            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <Input
                type="number"
                value={localTimeout}
                onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                min={100}
                max={30000}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Checkbox
                checked={localAllowConsole}
                onChange={handleAllowConsoleChange}
                label="Allow Console Output"
              />
              <Checkbox
                checked={localStrictMode}
                onChange={handleStrictModeChange}
                label="Strict Mode"
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {data.error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <div className="font-medium">Execution Error:</div>
            <div className="mt-1 font-mono text-xs">{data.error}</div>
          </div>
        )}

        {/* Syntax Error Display */}
        {syntaxErrors.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            <div className="font-medium">Syntax Issues:</div>
            <ul className="mt-1 list-disc list-inside text-xs">
              {syntaxErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Execution Info */}
        {data.lastExecuted && (
          <div className="mt-3 text-xs text-gray-500">
            Last executed: {data.lastExecuted.toLocaleTimeString()}
            {data.executionTime && ` (${data.executionTime}ms)`}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        className="!bg-purple-500 !border-purple-600"
        style={{ top: '50%' }}
      />
    </div>
  );
};

export default JavaScriptNode;