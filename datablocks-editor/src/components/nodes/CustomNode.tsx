import React from 'react';
import { Handle, Position } from 'reactflow';

interface CustomNodeProps {
  data: {
    label?: string;
    type?: string;
    config?: any;
    status?: string;
    error?: any;
    selected?: boolean;
  };
  selected?: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  return (
    <div className={`custom-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="node-content">
        <div className="node-label">{data.label || data.type || 'Node'}</div>
        {data.status && (
          <div className={`node-status status-${data.status}`}>
            {data.status}
          </div>
        )}
        {data.error && (
          <div className="node-error">
            Error: {data.error.message}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};