import React from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { 
  PlayIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { NodeStatus } from '../../types';

interface CustomNodeData {
  type: string;
  name?: string;
  config?: Record<string, any>;
  status?: NodeStatus;
  error?: any;
  selected?: boolean;
}

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ 
  data, 
  selected,
}) => {
  const { type, name, status = 'idle', error } = data;

  // Get node display name
  const displayName = name || type.charAt(0).toUpperCase() + type.slice(1);

  // Get status icon and color
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />;
      default:
        return <PlayIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get node color based on type
  const getNodeColor = () => {
    switch (type) {
      case 'file':
      case 'paste':
      case 'http':
      case 'example':
        return 'border-blue-500 bg-blue-500/10';
      case 'filter':
      case 'sort':
      case 'group':
      case 'merge':
      case 'slice':
      case 'rename':
        return 'border-green-500 bg-green-500/10';
      case 'chart':
      case 'table':
        return 'border-purple-500 bg-purple-500/10';
      case 'javascript':
        return 'border-orange-500 bg-orange-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  // Get category icon
  const getCategoryIcon = () => {
    switch (type) {
      case 'file':
        return '📁';
      case 'paste':
        return '📋';
      case 'http':
        return '🌐';
      case 'example':
        return '📊';
      case 'filter':
        return '🔍';
      case 'sort':
        return '🔢';
      case 'group':
        return '📦';
      case 'merge':
        return '🔗';
      case 'slice':
        return '✂️';
      case 'rename':
        return '🏷️';
      case 'chart':
        return '📈';
      case 'table':
        return '📋';
      case 'javascript':
        return '⚡';
      default:
        return '⚙️';
    }
  };

  return (
    <div
      className={cn(
        'px-4 py-3 shadow-lg rounded-lg border-2 bg-gray-800 min-w-[150px] transition-all duration-200',
        getNodeColor(),
        selected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900',
        status === 'processing' && 'animate-pulse'
      )}
    >
      {/* Input Handle */}
      {type !== 'file' && type !== 'paste' && type !== 'http' && type !== 'example' && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-3 h-3 bg-gray-600 border-2 border-gray-400 hover:bg-gray-500"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon()}</span>
          <span className="text-white font-medium text-sm">{displayName}</span>
        </div>
        {getStatusIcon()}
      </div>

      {/* Node Type */}
      <div className="text-xs text-gray-400 uppercase tracking-wide">
        {type}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
          {error.message || 'Error occurred'}
        </div>
      )}

      {/* Configuration Preview */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {Object.keys(data.config).length} config{Object.keys(data.config).length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400 hover:bg-gray-500"
      />
    </div>
  );
};