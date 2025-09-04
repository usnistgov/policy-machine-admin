import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AdjudicationService, NodeType } from '@/api/pdp.api';
import { NodeIcon } from '@/components/pmtree/tree-utils';

interface PolicyClassModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PolicyClassModal({ opened, onClose, onSuccess }: PolicyClassModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    setLoading(true);
    
    try {
      const response = await AdjudicationService.createPolicyClass(trimmedName);

      notifications.show({
        title: 'Success',
        message: `Policy Class "${trimmedName}" created successfully`,
        color: 'green'
      });

      setName('');
      onClose();
      onSuccess(); // Trigger tree refresh
      
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to create Policy Class: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          <NodeIcon type={NodeType.PC} size="24px" fontSize="16px" />
          <Text>Create Policy Class</Text>
        </Group>
      }
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Policy Class Name"
            placeholder="Enter policy class name..."
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
              Create Policy Class
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}