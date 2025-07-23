import React, { useState } from 'react';
import { ActionIcon, Group, Menu, Text, Badge, Tooltip } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { NodeIcon, isValidAssignment } from '@/components/tree/util';
import { TreeApi } from 'react-arborist';

interface NodeCreationToolbarProps {
  selectedNode: TreeNode | null;
  treeApi: TreeApi<TreeNode> | null;
  borderColor: string;
  isUserTree: boolean;
  allowedTypes: NodeType[];
}

// Get valid child types that can be assigned to a parent node
const getValidChildTypes = (parentType: string | null, isUserTree: boolean, allowedTypes: NodeType[]): NodeType[] => {
  if (!parentType) return [];
  
  const validTypes: NodeType[] = [];
  
  // Check each possible child type to see if it can be assigned to the parent
  for (const childType of [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O]) {
    if (isValidAssignment(childType, parentType) && allowedTypes.includes(childType)) {
      validTypes.push(childType);
    }
  }
  
  return validTypes;
};

const getNodeTypeLabel = (nodeType: NodeType): string => {
  switch (nodeType) {
    case NodeType.UA: return 'User Attribute';
    case NodeType.OA: return 'Object Attribute'; 
    case NodeType.U: return 'User';
    case NodeType.O: return 'Object';
    default: return nodeType;
  }
};

export const NodeCreationToolbar: React.FC<NodeCreationToolbarProps> = ({
  selectedNode,
  treeApi,
  borderColor,
  isUserTree,
  allowedTypes
}) => {
  const [createMenuOpened, setCreateMenuOpened] = useState(false);
  
  // Get valid child types for the selected node
  const validChildTypes = selectedNode ? getValidChildTypes(selectedNode.type, isUserTree, allowedTypes) : [];
  
  const handleCreatePC = () => {
    treeApi?.create({ type: 'PC' as any });
    
    // Focus the input field after creation
    setTimeout(() => {
      const inputElement = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
      if (inputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 300);
  };

  const handleCreateNode = async (nodeType: NodeType) => {
    if (!selectedNode || !treeApi) return;
    
    setCreateMenuOpened(false);
    
    // First ensure the parent node is expanded
    const nodeApi = treeApi.get(selectedNode.id);
    if (nodeApi && !nodeApi.isOpen) {
      nodeApi.toggle();
    }
    
    // Create the new node as a child of the selected node
    setTimeout(() => {
      treeApi.create({ 
        type: nodeType as any, 
        parentId: selectedNode.id
      });

      // Focus the input field after creation
      setTimeout(() => {
        const inputElement = document.querySelector('input[type="text"][value=""]') as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      }, 100);
    }, 200);
  };

  return (
    <Group gap={6} align="center">
      {/* PC Creation Button - always available */}
      <Tooltip label="Create Policy Class (no parent required)" position="bottom">
        <ActionIcon
          variant="subtle"
          size="md"
          color={borderColor}
          onClick={handleCreatePC}
          title="Create Policy Class"
        >
          <NodeIcon type="PC" size="16px" fontSize="14px" />
        </ActionIcon>
      </Tooltip>

      {/* Smart Node Creation Menu - only enabled when valid parent is selected */}
      <Menu
        opened={createMenuOpened}
        onClose={() => setCreateMenuOpened(false)}
        position="bottom-start"
        shadow="md"
        withArrow
      >
        <Menu.Target>
          <Tooltip 
            label={
              selectedNode 
                ? validChildTypes.length > 0 
                  ? `Create nodes under ${selectedNode.name} (${selectedNode.type})`
                  : `${selectedNode.name} (${selectedNode.type}) cannot have children`
                : "Select a parent node to create children"
            } 
            position="bottom"
          >
            <ActionIcon
              variant={validChildTypes.length > 0 ? "filled" : "subtle"}
              size="md"
              color={borderColor}
              onClick={() => setCreateMenuOpened(true)}
              disabled={!selectedNode || validChildTypes.length === 0}
              title="Create Node (requires parent selection)"
            >
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        
        <Menu.Dropdown>
          <Menu.Label>
            {selectedNode && (
              <Group gap={4} align="center">
                <Text size="xs">Create under</Text>
                <NodeIcon type={selectedNode.type} size="14px" fontSize="10px" />
                <Text size="xs" fw={600}>{selectedNode.name}</Text>
              </Group>
            )}
          </Menu.Label>
          
          {validChildTypes.map((nodeType) => (
            <Menu.Item 
              key={nodeType}
              leftSection={<NodeIcon type={nodeType} size="18px" fontSize="12px" />}
              onClick={() => handleCreateNode(nodeType)}
            >
              <Group justify="space-between" style={{ width: '100%' }}>
                <span>{getNodeTypeLabel(nodeType)}</span>
                <Badge size="xs" variant="light" color="gray">
                  {nodeType}
                </Badge>
              </Group>
            </Menu.Item>
          ))}
          
          {validChildTypes.length === 0 && selectedNode && (
            <Menu.Item disabled>
              <Text size="xs" c="dimmed" fs="italic">
                No valid child types for {selectedNode.type} nodes
              </Text>
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};