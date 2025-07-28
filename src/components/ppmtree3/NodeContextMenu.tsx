import React from 'react';
import { Menu, Group, Text } from '@mantine/core';
import { IconArrowUp, IconLink, IconEye } from '@tabler/icons-react';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { NodeIcon } from '@/components/tree/util';

export interface NodeContextMenuProps {
  node: TreeNode;
  position: { x: number; y: number };
  onClose: () => void;
  onAddAsAscendant?: (node: TreeNode) => void;
  hasNodeCreationTabs?: boolean;
  onAssignTo?: (node: TreeNode) => void;
  onAssignNodeTo?: (sourceNode: TreeNode, targetNode: TreeNode) => void;
  isAssignmentMode?: boolean;
  assignmentSourceNode?: TreeNode;
  onViewAssociations?: (node: TreeNode) => void;
}

export function NodeContextMenu({ node, position, onClose, onAddAsAscendant, hasNodeCreationTabs, onAssignTo, onAssignNodeTo, isAssignmentMode, assignmentSourceNode, onViewAssociations }: NodeContextMenuProps) {
  const handleAddAsAscendant = () => {
    onAddAsAscendant?.(node);
    onClose();
  };

  const handleAssignTo = () => {
    onAssignTo?.(node);
    onClose();
  };

  const handleAssignNodeTo = () => {
    if (assignmentSourceNode) {
      onAssignNodeTo?.(assignmentSourceNode, node);
      onClose();
    }
  };

  const handleViewAssociations = () => {
    onViewAssociations?.(node);
    onClose();
  };

  // Helper function to check if assignment is valid
  const isValidAssignment = (sourceType: NodeType, targetType: NodeType): boolean => {
    const validAssignments: Record<NodeType, NodeType[]> = {
      [NodeType.PC]: [], // PC cannot be assigned to anything
      [NodeType.UA]: [NodeType.PC, NodeType.UA],
      [NodeType.OA]: [NodeType.PC, NodeType.OA],
      [NodeType.O]: [NodeType.PC, NodeType.OA],
      [NodeType.U]: [NodeType.UA]
    };
    
    return validAssignments[sourceType]?.includes(targetType) || false;
  };

  const canAssignTo = node.type !== NodeType.PC; // PC cannot be assigned to anything
  const canBeAssignedTo = isAssignmentMode && assignmentSourceNode && 
    isValidAssignment(assignmentSourceNode.type, node.type) &&
    assignmentSourceNode.id !== node.id;
  const canViewAssociations = [NodeType.OA, NodeType.O, NodeType.UA].includes(node.type) && !isAssignmentMode;

  return (
      <Menu
          opened={true}
          onClose={onClose}
          position="bottom-start"
          withinPortal
          styles={{
            dropdown: {
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 1000,
            },
          }}
      >
        <Menu.Target>
          <div style={{ position: 'absolute', left: position.x, top: position.y, width: 1, height: 1 }} />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Group gap="xs" align="center">
              <NodeIcon type={node.type} size="16px" fontSize="8px" />
              <Text size="sm" truncate style={{ maxWidth: '150px' }}>
                {node.name}
              </Text>
            </Group>
          </Menu.Label>
          
          {hasNodeCreationTabs && (
            <Menu.Item
              leftSection={<IconArrowUp size={16} />}
              onClick={handleAddAsAscendant}
            >
              Add as Ascendant
            </Menu.Item>
          )}

          {canAssignTo && !isAssignmentMode && (
            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={handleAssignTo}
            >
              Assign to
            </Menu.Item>
          )}

          {canBeAssignedTo && (
            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={handleAssignNodeTo}
            >
              <Group gap="xs" wrap="nowrap">
                <span>Assign</span>
                <NodeIcon type={assignmentSourceNode!.type} size="14px" fontSize="12px" />
                <span>{assignmentSourceNode?.name} to</span>
              </Group>
            </Menu.Item>
          )}

          {canViewAssociations && (
            <Menu.Item
              leftSection={<IconEye size={16} />}
              onClick={handleViewAssociations}
            >
              View Associations
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
  );
}