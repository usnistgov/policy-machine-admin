import React from 'react';
import { Stack, Text, Group, ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import {NodeIcon} from "@/components/ppmtree3/tree-utils";

interface DescendantsTabProps {
  rootNode: TreeNode;
  isUserTree: boolean;
  allowedTypes: NodeType[];
  onClose: () => void;
}

export function DescendantsTab({ rootNode, isUserTree, allowedTypes, onClose }: DescendantsTabProps) {
  return (
    <Stack gap="md" style={{ height: '100%' }}>
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <NodeIcon type={rootNode.type} size="24px" fontSize="16px" />
          <Text fw={500} size="sm">
            Descendants of {rootNode.name}
          </Text>
        </Group>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={onClose}
          aria-label="Close descendants panel"
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
      
      <Stack gap="sm" style={{ flex: 1 }}>
        <Text size="sm" c="dimmed" ta="center" style={{ marginTop: '2rem' }}>
          Descendants view temporarily disabled during tree refactoring.
          {'\n'}Please use the main tree view to explore descendants.
        </Text>
      </Stack>
    </Stack>
  );
}