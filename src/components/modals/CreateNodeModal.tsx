import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AdjudicationService, NodeType } from '@/api/pdp.api';
import { NodeIcon } from '@/components/pmtree/tree-utils';
import { TreeNode } from '@/utils/tree.utils';

interface CreateNodeModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nodeType: NodeType;
  parentNode: TreeNode | null;
}

export function CreateNodeModal({ opened, onClose, onSuccess, nodeType, parentNode }: CreateNodeModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const getNodeTypeLabel = (type: NodeType): string => {
    switch (type) {
      case NodeType.PC: return 'Policy Class';
      case NodeType.UA: return 'User Attribute';
      case NodeType.OA: return 'Object Attribute';
      case NodeType.U: return 'User';
      case NodeType.O: return 'Object';
      default: return type;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      notifications.show({
        title: 'Error',
        message: `${getNodeTypeLabel(nodeType)} name cannot be empty`,
        color: 'red'
      });
      return;
    }

    if (!parentNode?.pmId) {
      notifications.show({
        title: 'Error',
        message: 'Parent node is required for this operation',
        color: 'red'
      });
      return;
    }

    setLoading(true);
    
    try {
      let response;
      
      switch (nodeType) {
        case NodeType.UA:
          response = await AdjudicationService.createUserAttribute(trimmedName, [parentNode.pmId]);
          break;
        case NodeType.OA:
          response = await AdjudicationService.createObjectAttribute(trimmedName, [parentNode.pmId]);
          break;
        case NodeType.U:
          response = await AdjudicationService.createUser(trimmedName, [parentNode.pmId]);
          break;
        case NodeType.O:
          response = await AdjudicationService.createObject(trimmedName, [parentNode.pmId]);
          break;
        default:
          throw new Error(`Unsupported node type: ${nodeType}`);
      }
      
      if (response?.errorMsg) {
        throw new Error(response.errorMsg);
      }

      notifications.show({
        title: 'Success',
        message: `${getNodeTypeLabel(nodeType)} "${trimmedName}" created successfully`,
        color: 'green'
      });

      setName('');
      onClose();
      onSuccess(); // Trigger parent node refresh
      
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to create ${getNodeTypeLabel(nodeType)}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      onClose();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <NodeIcon type={nodeType} size="24px" fontSize="16px" />
          <Text>Create {getNodeTypeLabel(nodeType)}</Text>
        </Group>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {parentNode && (
            <Text size="sm" c="dimmed">
              Parent: <Group gap="xs" style={{ display: 'inline-flex' }}>
                <NodeIcon type={parentNode.type} size="16px" fontSize="12px" />
                {parentNode.name}
              </Group>
            </Text>
          )}
          
          <TextInput
            label={`${getNodeTypeLabel(nodeType)} Name`}
            placeholder={`Enter ${getNodeTypeLabel(nodeType).toLowerCase()} name...`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            disabled={loading}
            data-autofocus
          />
          
          <Group justify="flex-end" gap="sm">
            <Button 
              variant="subtle" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              disabled={!name.trim()}
            >
              Create {getNodeTypeLabel(nodeType)}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}