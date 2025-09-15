import React from 'react';
import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core';
import { AssociationDirection, AssociationIcon, NodeIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.api';

export interface TreeFilterConfig {
  nodeTypes: NodeType[];
  showOutgoingAssociations: boolean;
  showIncomingAssociations: boolean;
}

export interface TreeFilterToolbarProps {
  filters: TreeFilterConfig;
  onFiltersChange: (filters: TreeFilterConfig) => void;
}

const ALL_NODE_TYPES: NodeType[] = [NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];

export function TreeFilterToolbar({ filters, onFiltersChange }: TreeFilterToolbarProps) {
  const theme = useMantineTheme();

  const handleNodeTypeToggle = async (nodeType: NodeType) => {
    const newNodeTypes = filters.nodeTypes.includes(nodeType)
      ? filters.nodeTypes.filter((type) => type !== nodeType)
      : [...filters.nodeTypes, nodeType];

    const newFilters = {
      ...filters,
      nodeTypes: newNodeTypes,
    };

    onFiltersChange(newFilters);
  };

  const handleAssociationDirectionToggle = async (direction: AssociationDirection) => {
    const newFilters =
      direction === AssociationDirection.Incoming
        ? {
            ...filters,
            showIncomingAssociations: !filters.showIncomingAssociations,
          }
        : {
            ...filters,
            showOutgoingAssociations: !filters.showOutgoingAssociations,
          };

    onFiltersChange(newFilters);
  };

  return (
    <Group
      gap="xs"
      wrap="nowrap"
      style={{
        overflow: 'visible',
        minWidth: 0,
      }}
    >
      {ALL_NODE_TYPES.map((nodeType) => (
        <ActionIcon
          key={nodeType}
          variant="subtle"
          size="sm"
          onClick={() => handleNodeTypeToggle(nodeType)}
          style={{
            flexShrink: 0,
            backgroundColor: filters.nodeTypes.includes(nodeType) ? 'lightgrey' : 'transparent',
          }}
        >
          <NodeIcon type={nodeType} size="16px" fontSize="12px" />
        </ActionIcon>
      ))}

      <Tooltip label="Show outgoing associations">
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAssociationDirectionToggle(AssociationDirection.Outgoing)}
          style={{
            flexShrink: 0,
            backgroundColor: filters.showOutgoingAssociations ? 'lightgrey' : 'transparent',
          }}
        >
          <AssociationIcon
            direction={AssociationDirection.Outgoing}
            size="14px"
            color={theme.colors.green[9]}
          />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Show incoming associations">
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => handleAssociationDirectionToggle(AssociationDirection.Incoming)}
          style={{
            flexShrink: 0,
            backgroundColor: filters.showIncomingAssociations ? 'lightgrey' : 'transparent',
          }}
        >
          <AssociationIcon
            direction={AssociationDirection.Incoming}
            size="14px"
            color={theme.colors.green[9]}
          />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}