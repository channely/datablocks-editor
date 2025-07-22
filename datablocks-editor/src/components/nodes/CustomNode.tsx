import React, { useState } from 'react';
// import type { Handle, Position } from 'reactflow';
import { Handle as ReactFlowHandle, Position as ReactFlowPosition } from 'reactflow';
import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { useAppStore } from '../../stores/appStore';
import type { NodeStatus } from '../../types';

interface CustomNodeProps {
  id: string;
  data: {
    label?: string;
    name?: string;
    type?: string;
    config?: any;
    status?: NodeStatus;
    error?: any;
    selected?: boolean;
  };
  selected?: boolean;
}

// Node category colors
const getCategoryColor = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('file') || lowerType.includes('paste') || lowerType.includes('http') || lowerType.includes('example')) {
    return 'from-blue-500 to-blue-600'; // INPUT
  }
  if (lowerType.includes('filter') || lowerType.includes('sort') || lowerType.includes('group') || lowerType.includes('merge')) {
    return 'from-green-500 to-green-600'; // TRANSFORM
  }
  if (lowerType.includes('chart') || lowerType.includes('table') || lowerType.includes('visualization')) {
    return 'from-purple-500 to-purple-600'; // VISUALIZATION
  }
  if (lowerType.includes('javascript') || lowerType.includes('advanced')) {
    return 'from-orange-500 to-orange-600'; // ADVANCED
  }
  return 'from-gray-500 to-gray-600'; // DEFAULT
};

// Status icons and colors
const getStatusIcon = (status: NodeStatus) => {
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
      return null;
  }
};

const getStatusBorderColor = (status: NodeStatus) => {
  switch (status) {
    case 'processing':
      return 'border-yellow-400';
    case 'success':
      return 'border-green-400';
    case 'error':
      return 'border-red-400';
    case 'warning':
      return 'border-yellow-400';
    default:
      return 'border-gray-600';
  }
};

export const CustomNode: React.FC<CustomNodeProps> = ({ id, data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { removeNode } = useAppStore();

  const nodeType = data.type || 'unknown';
  const nodeName = data.name || data.label || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
  const status = data.status || 'idle';
  const error = data.error;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeNode(id);
  };

  return (
    <div
      className={cn(
        'relative min-w-[160px] bg-gray-800 border-2 rounded-lg shadow-lg transition-all duration-200',
        'hover:shadow-xl hover:scale-105',
        selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' : '',
        getStatusBorderColor(status)
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Input Handle */}
      <ReactFlowHandle
        type="target"
        position={ReactFlowPosition.Top}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400 hover:bg-blue-500 hover:border-blue-400 transition-colors"
        style={{ top: -6 }}
      />

      {/* Delete Button */}
      {isHovered && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors z-10"
          title="Delete node"
        >
          <XMarkIcon className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Node Header */}
      <div className={cn(
        'px-3 py-2 rounded-t-md bg-gradient-to-r text-white font-medium text-sm',
        getCategoryColor(nodeType)
      )}>
        <div className="flex items-center justify-between">
          <span className="truncate">{nodeName}</span>
          {getStatusIcon(status)}
        </div>
      </div>

      {/* Node Body */}
      <div className="px-3 py-2 text-gray-200">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          {nodeType}
        </div>
        
        {/* Configuration Preview */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
              <div key={key} className="truncate">
                {key}: {String(value).substring(0, 20)}
                {String(value).length > 20 ? '...' : ''}
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-200">
            <div className="font-medium">Error:</div>
            <div className="truncate" title={error.message}>
              {error.message}
            </div>
          </div>
        )}

        {/* Status Display */}
        {status === 'processing' && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-2"></div>
            Processing...
          </div>
        )}
      </div>

      {/* Output Handle */}
      <ReactFlowHandle
        type="source"
        position={ReactFlowPosition.Bottom}
        className="w-3 h-3 bg-gray-600 border-2 border-gray-400 hover:bg-blue-500 hover:border-blue-400 transition-colors"
        style={{ bottom: -6 }}
      />
    </div>
  );
};