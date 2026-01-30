import React from 'react';
import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core';
import { AssociationDirection, AssociationIcon, NodeIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import {ToolBarSection} from "@/features/pmtree/ToolBarSection";

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
        <ToolBarSection
            title="Tree Filters"
        >
            {ALL_NODE_TYPES.map((nodeType) => (
                <ActionIcon
                    key={nodeType}
                    variant="default"
                    size="md"
                    mr={2}
                    onClick={() => handleNodeTypeToggle(nodeType)}
                    style={{
                        flexShrink: 0,
                        borderColor: filters.nodeTypes.includes(nodeType) ? 'var(--mantine-primary-color-filled)' : 'lightgrey',
                        borderWidth: filters.nodeTypes.includes(nodeType) ? '2px' : '1px',
                    }}
                >
                    <NodeIcon type={nodeType} size="20px" fontSize="14px" />
                </ActionIcon>
            ))}

            <Tooltip label="Show outgoing associations">
                <ActionIcon
                    variant="default"
                    size="md"
                    mr={2}
                    onClick={() => handleAssociationDirectionToggle(AssociationDirection.Outgoing)}
                    style={{
                        flexShrink: 0,
                        borderColor: filters.showOutgoingAssociations ? 'var(--mantine-primary-color-filled)' : 'lightgrey',
                        borderWidth: filters.showOutgoingAssociations ? '2px' : '1px',
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
                    variant="default"
                    size="md"
                    onClick={() => handleAssociationDirectionToggle(AssociationDirection.Incoming)}
                    style={{
                        flexShrink: 0,
                        borderColor: filters.showIncomingAssociations ? 'var(--mantine-primary-color-filled)' : 'lightgrey',
                        borderWidth: filters.showIncomingAssociations ? '2px' : '1px',
                    }}
                >
                    <AssociationIcon
                        direction={AssociationDirection.Incoming}
                        size="14px"
                        color={theme.colors.green[9]}
                    />
                </ActionIcon>
            </Tooltip>
        </ToolBarSection>
    );
}