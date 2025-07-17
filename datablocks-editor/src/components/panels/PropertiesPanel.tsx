import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import type { NodeInstance } from '../../types';

interface PropertiesPanelProps {
  selectedNode?: NodeInstance;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
}) => {
  const { updateNode } = useAppStore();
  const [nodeConfig, setNodeConfig] = useState<Record<string, any>>({});

  // Update local config when selected node changes
  useEffect(() => {
    if (selectedNode) {
      setNodeConfig({
        name: selectedNode.data?.name || '',
        ...selectedNode.config,
      });
    } else {
      setNodeConfig({});
    }
  }, [selectedNode]);

  // Handle config changes
  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...nodeConfig, [key]: value };
    setNodeConfig(newConfig);
    
    if (selectedNode) {
      if (key === 'name') {
        updateNode(selectedNode.id, {
          data: { ...selectedNode.data, name: value },
        });
      } else {
        updateNode(selectedNode.id, {
          config: { ...selectedNode.config, [key]: value },
        });
      }
    }
  };
  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-medium mb-4 text-gray-100">Properties</h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-center">
            Select a node to view its properties
          </p>
        </div>
      </div>
    );
  }

  // Mock properties based on node type
  const renderNodeProperties = () => {
    switch (selectedNode.type) {
      case 'filter':
        return (
          <div className="space-y-4">
            <Select
              label="Column"
              options={[
                { value: 'name', label: 'Name' },
                { value: 'age', label: 'Age' },
                { value: 'city', label: 'City' },
              ]}
              placeholder="Select column to filter"
            />
            <Select
              label="Condition"
              options={[
                { value: 'equals', label: 'Equals' },
                { value: 'contains', label: 'Contains' },
                { value: 'greater', label: 'Greater than' },
                { value: 'less', label: 'Less than' },
              ]}
              placeholder="Select condition"
            />
            <Input label="Value" placeholder="Enter filter value" />
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-4">
            <Select
              label="Chart Type"
              options={[
                { value: 'bar', label: 'Bar Chart' },
                { value: 'line', label: 'Line Chart' },
                { value: 'scatter', label: 'Scatter Plot' },
              ]}
              placeholder="Select chart type"
            />
            <Select
              label="X Axis"
              options={[
                { value: 'name', label: 'Name' },
                { value: 'date', label: 'Date' },
                { value: 'category', label: 'Category' },
              ]}
              placeholder="Select X axis field"
            />
            <Select
              label="Y Axis"
              options={[
                { value: 'value', label: 'Value' },
                { value: 'count', label: 'Count' },
                { value: 'percentage', label: 'Percentage' },
              ]}
              placeholder="Select Y axis field"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Input
              label="Node Name"
              value={nodeConfig.name || ''}
              onChange={(e) => handleConfigChange('name', e.target.value)}
              placeholder="Enter node name"
            />
            <div className="text-sm text-gray-400">
              Configure properties for {selectedNode.type} node
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-100">Properties</h2>
        <p className="text-sm text-gray-400 mt-1">{selectedNode.type} node</p>
      </div>

      <div className="flex-1 overflow-y-auto">{renderNodeProperties()}</div>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Button variant="primary" size="sm" className="flex-1">
            Apply
          </Button>
          <Button variant="secondary" size="sm" className="flex-1">
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
