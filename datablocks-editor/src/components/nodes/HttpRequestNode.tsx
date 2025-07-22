import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type NodeStatus = 'idle' | 'loading' | 'success' | 'error';

interface HttpRequestConfig {
  url?: string;
  method?: HttpMethod;
  body?: string;
  headers?: Record<string, string>;
}

interface HttpRequestNodeProps {
  id: string;
  data: {
    label: string;
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body?: string;
    error?: string;
    status?: NodeStatus;
    onConfigChange?: (config: HttpRequestConfig) => void;
  };
  selected?: boolean;
  isConnectable?: boolean;
}

export const HttpRequestNode: React.FC<HttpRequestNodeProps> = ({ 
  id, 
  data, 
  selected = false,
  isConnectable = true 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (data.onConfigChange) {
      data.onConfigChange({ url: e.target.value });
    }
  };
  
  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (data.onConfigChange) {
      data.onConfigChange({ 
        method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' 
      });
    }
  };
  
  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (data.onConfigChange) {
      data.onConfigChange({ body: e.target.value });
    }
  };
  
  const getStatusColor = () => {
    switch (data.status) {
      case 'loading': return '#3498db'; // Blue
      case 'success': return '#2ecc71'; // Green
      case 'error': return '#e74c3c';   // Red
      default: return '#95a5a6';         // Gray
    }
  };
  
  return (
    <div className={`http-request-node ${selected ? 'selected' : ''}`} style={{ 
      border: '1px solid #ddd', 
      borderRadius: '5px',
      padding: '10px',
      background: 'white',
      width: '280px'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      
      <div className="node-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div className="node-title" style={{ fontWeight: 'bold' }}>
          {data.label}
        </div>
        <div className="node-status" style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%',
          background: getStatusColor()
        }} />
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      
      <div className="node-summary" style={{ fontSize: '12px', color: '#666' }}>
        {data.method} {data.url || 'No URL set'}
      </div>
      
      {expanded && (
        <div className="node-config" style={{ marginTop: '8px' }}>
          <div className="method-setting" style={{ marginBottom: '8px' }}>
            <label htmlFor={`method-${id}`} style={{ display: 'block', marginBottom: '4px' }}>
              Method:
            </label>
            <select
              id={`method-${id}`}
              value={data.method}
              onChange={handleMethodChange}
              style={{ 
                width: '100%',
                border: '1px solid #ddd',
                borderRadius: '3px',
                padding: '4px'
              }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          
          <div className="url-setting" style={{ marginBottom: '8px' }}>
            <label htmlFor={`url-${id}`} style={{ display: 'block', marginBottom: '4px' }}>
              URL:
            </label>
            <input
              id={`url-${id}`}
              type="text"
              value={data.url}
              onChange={handleUrlChange}
              placeholder="https://api.example.com/data"
              style={{ 
                width: '100%',
                border: '1px solid #ddd',
                borderRadius: '3px',
                padding: '4px'
              }}
            />
          </div>
          
          {(data.method === 'POST' || data.method === 'PUT' || data.method === 'PATCH') && (
            <div className="body-setting" style={{ marginBottom: '8px' }}>
              <label htmlFor={`body-${id}`} style={{ display: 'block', marginBottom: '4px' }}>
                Request Body:
              </label>
              <textarea
                id={`body-${id}`}
                value={data.body || ''}
                onChange={handleBodyChange}
                placeholder='{"key": "value"}'
                style={{ 
                  width: '100%', 
                  height: '80px', 
                  fontFamily: 'monospace',
                  border: '1px solid #ddd',
                  borderRadius: '3px',
                  padding: '4px'
                }}
              />
            </div>
          )}
          
          {data.error && (
            <div className="execution-error" style={{ 
              color: '#e74c3c', 
              marginTop: '8px',
              padding: '4px',
              background: '#ffeeee',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              Error: {data.error}
            </div>
          )}
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
};