import React from 'react';
import { Menu, Group, Text, useMantineTheme } from '@mantine/core';
import { IconArrowUp, IconLink, IconEye, IconPlus, IconCopy, IconTrash } from '@tabler/icons-react';
import { NodeType } from '@/shared/api/pdp.api';
import { TreeNode } from '@/features/pmtree/tree-utils';
import { notifications } from '@mantine/notifications';
import {getValidationErrorMessage, isValidAscendant, NodeIcon} from "@/features/pmtree/tree-utils";

export interface NodeContextMenuProps {
  node: TreeNode;
  position: { x: number; y: number };
  onClose: () => void;
  onAddAsAscendant?: (node: TreeNode) => void;
  hasNodeCreationTabs?: boolean;
  nodeTypeBeingCreated?: NodeType;
  onAssignTo?: (node: TreeNode) => void;
  onAssignNodeTo?: (targetNode: TreeNode) => void;
  isAssignmentMode?: boolean;
  assignmentSourceNode?: TreeNode;
  onViewAssociations?: (node: TreeNode) => void;
  // Association creation props
  isCreatingAssociation?: boolean;
  onSelectNodeForAssociation?: (node: TreeNode) => void;
  onStartAssociationCreation?: (node: TreeNode) => void;
  // Association mode props
  isAssociationMode?: boolean;
  associationCreationMode?: 'outgoing' | 'incoming' | null;
  onAssociateWith?: (node: TreeNode) => void;
  // Create child node props
  onCreateChildNode?: (nodeType: NodeType, parentNode: TreeNode) => void;
  // Info node props
  onInfoNode?: (node: TreeNode) => void;
  // Delete node props
  onDeleteNode?: (node: TreeNode) => void;
}

export function NodeContextMenu({ node, position, onClose, onAddAsAscendant, hasNodeCreationTabs, nodeTypeBeingCreated, onAssignTo, onAssignNodeTo, isAssignmentMode, assignmentSourceNode, onViewAssociations, isCreatingAssociation, onSelectNodeForAssociation, isAssociationMode, associationCreationMode, onAssociateWith, onCreateChildNode, onInfoNode, onDeleteNode }: NodeContextMenuProps) {
  const theme = useMantineTheme();

  const handleAddAsAscendant = () => {
    // Validate if this node can be selected as an ascendant
    if (nodeTypeBeingCreated) {
      const isValid = isValidAscendant(nodeTypeBeingCreated, node.type);
      
      if (!isValid) {
        // Show error notification
        const errorMessage = getValidationErrorMessage(nodeTypeBeingCreated, node.type);
        notifications.show({
          title: 'Invalid Selection',
          message: errorMessage,
          color: 'red'
        });
        onClose();
        return;
      }
    }

    // If valid, add as ascendant
    onAddAsAscendant?.(node);
    onClose();
  };

  const handleAssignTo = () => {
    onAssignTo?.(node);
    onClose();
  };

  const handleAssignNodeTo = () => {
    if (assignmentSourceNode) {
      onAssignNodeTo?.(node);
      onClose();
    }
  };

  const handleViewAssociations = () => {
    onViewAssociations?.(node);
    onClose();
  };

  const handleSelectForAssociation = () => {
    onSelectNodeForAssociation?.(node);
    onClose();
  };

  const handleAssociateWith = () => {
    onAssociateWith?.(node);
    onClose();
  };

  const handleCopyNodeName = () => {
    navigator.clipboard.writeText(node.name);
    notifications.show({
      title: 'Copied',
      message: `Node name "${node.name}" copied to clipboard`,
      color: 'green'
    });
    onClose();
  };

  const handleCreateChildNode = (nodeType: NodeType) => {
    onCreateChildNode?.(nodeType, node);
    onClose();
  };

  const handleInfoNode = () => {
    onInfoNode?.(node);
    onClose();
  };

  const handleDeleteNode = () => {
    onDeleteNode?.(node);
    onClose();
  };

  // Helper function to get available child node types based on parent type
  const getAvailableChildTypes = (): NodeType[] => {
    switch (node.type as NodeType) {
      case NodeType.PC:
        return [NodeType.UA, NodeType.OA];
      case NodeType.UA:
        return [NodeType.UA];
      case NodeType.OA:
        return [NodeType.OA];
      default:
        return [];
    }
  };

  // Helper function to check if assignment is valid
  const isValidAssignment = (sourceType: NodeType, targetType: NodeType): boolean => {
    const validAssignments: Partial<Record<NodeType, NodeType[]>> = {
      [NodeType.PC]: [], // PC cannot be assigned to anything
      [NodeType.UA]: [NodeType.PC, NodeType.UA],
      [NodeType.OA]: [NodeType.PC, NodeType.OA],
      [NodeType.O]: [NodeType.PC, NodeType.OA],
      [NodeType.U]: [NodeType.UA]
    };
    
    return validAssignments[sourceType]?.includes(targetType) || false;
  };

  // Helper function to determine if a node can be associated with based on creation mode
  const canAssociateWith = (): boolean => {
    if (!isAssociationMode || !associationCreationMode) return false;
    
    if (associationCreationMode === 'outgoing') {
      // For outgoing associations, only UA, OA, and O are valid targets
      return [NodeType.UA as NodeType, NodeType.OA as NodeType, NodeType.O as NodeType].includes(node.type as NodeType);
    } else if (associationCreationMode === 'incoming') {
      // For incoming associations, only UA types are valid sources
      return [NodeType.UA as NodeType].includes(node.type as NodeType);
    }
    
    return false;
  };

  const canAssignTo = node.type !== NodeType.PC; // PC cannot be assigned to anything
  const canBeAssignedTo = isAssignmentMode && assignmentSourceNode && 
    isValidAssignment(assignmentSourceNode.type as NodeType, node.type as NodeType) &&
    assignmentSourceNode.id !== node.id;
  const canViewAssociations = [NodeType.OA as NodeType, NodeType.O as NodeType, NodeType.UA as NodeType].includes(node.type as NodeType) && !isAssignmentMode;
  const canSelectForAssociation = isCreatingAssociation && [NodeType.OA as NodeType, NodeType.O as NodeType, NodeType.UA as NodeType].includes(node.type as NodeType);
  const showAssociateWith = canAssociateWith();
  const availableChildTypes = getAvailableChildTypes();

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
          <div style={{ 
            position: 'fixed', 
            left: position.x, 
            top: position.y, 
            width: 1, 
            height: 1,
            pointerEvents: 'none',
            zIndex: -1
          }} />
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Group gap="xs" align="center">
              <NodeIcon type={node.type} size="20px" fontSize="14px" />
              <Text size="sm" truncate style={{ maxWidth: '150px' }}>
                {node.name}
              </Text>
            </Group>
          </Menu.Label>
          
          {/* MODE-SPECIFIC ITEMS (at top, highlighted) */}
          {hasNodeCreationTabs && (
            <Menu.Item
              leftSection={<IconArrowUp size={16} />}
              onClick={handleAddAsAscendant}
              style={{
                borderLeft: `3px solid ${theme.colors[theme.primaryColor][6]}`
              }}
            >
              Add as descendant
            </Menu.Item>
          )}

          {canBeAssignedTo && (
            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={handleAssignNodeTo}
              style={{
                backgroundColor: 'var(--mantine-color-green-0)',
                borderLeft: '3px solid var(--mantine-color-green-6)',
                fontWeight: 500
              }}
            >
              <Group gap="xs" wrap="nowrap">
                <span>Assign</span>
                <NodeIcon type={assignmentSourceNode!.type} size="14px" fontSize="12px" />
                <span>{assignmentSourceNode?.name} to</span>
              </Group>
            </Menu.Item>
          )}

          {showAssociateWith && (
            <Menu.Item
              leftSection={<IconPlus size={16} />}
              onClick={handleAssociateWith}
              style={{
                backgroundColor: 'var(--mantine-color-orange-0)',
                borderLeft: '3px solid var(--mantine-color-orange-6)',
                fontWeight: 500
              }}
            >
              Associate with
            </Menu.Item>
          )}

          {canSelectForAssociation && (
            <Menu.Item
              leftSection={<IconPlus size={16} />}
              onClick={handleSelectForAssociation}
              style={{
                backgroundColor: 'var(--mantine-color-purple-0)',
                borderLeft: '3px solid var(--mantine-color-purple-6)',
                fontWeight: 500
              }}
            >
              Select for Association
            </Menu.Item>
          )}

          {/* SEPARATOR between mode-specific and always-available items */}
          {(hasNodeCreationTabs || canBeAssignedTo || showAssociateWith || canSelectForAssociation) && (
            <Menu.Divider />
          )}

          {/* ALWAYS-AVAILABLE ITEMS */}
          {canAssignTo && !isAssignmentMode && (
            <Menu.Item
              leftSection={<IconLink size={16} />}
              onClick={handleAssignTo}
            >
              Assign to
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

          {/* CREATE CHILD NODE ITEMS */}
          {availableChildTypes.length > 0 && (
            <>
              <Menu.Divider />
              {availableChildTypes.map((childType) => (
                <Menu.Item
                  key={childType}
                  leftSection={<NodeIcon type={childType} size="16px" fontSize="12px" />}
                  onClick={() => handleCreateChildNode(childType)}
                  style={{
                    backgroundColor: 'var(--mantine-color-blue-0)',
                    borderLeft: '3px solid var(--mantine-color-blue-6)',
                    fontWeight: 500
                  }}
                >
                  Create {childType}
                </Menu.Item>
              ))}
            </>
          )}

          <Menu.Divider />

          <Menu.Item
            leftSection={<IconEye size={16} />}
            onClick={handleInfoNode}
          >
            Info
          </Menu.Item>
          
          <Menu.Item
            leftSection={<IconCopy size={16} />}
            onClick={handleCopyNodeName}
          >
            Copy node name
          </Menu.Item>

          {onDeleteNode && (
            <>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconTrash size={16} />}
                onClick={handleDeleteNode}
                color="red"
              >
                Delete node
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
  );
}