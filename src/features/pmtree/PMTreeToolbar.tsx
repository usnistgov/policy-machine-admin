import React from 'react';
import { IconCircleArrowDownLeft, IconCircleArrowUpRight, IconRefresh } from '@tabler/icons-react';
import { ActionIcon, Button, Divider, Group, Text } from '@mantine/core';
import { NodeIcon } from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import { ToolBarSection } from './ToolBarSection';
import { TreeFilterToolbar } from './TreeFilterToolbar';
import { TreeDirection, TreeFilterConfig } from './hooks/usePMTreeOperations';

export interface PMTreeToolbarProps {
    // Visibility controls (all default to true, except createPolicyClass which defaults to false)
    showReset?: boolean;
    showCreatePolicyClass?: boolean;
    showTreeFilters?: boolean;
    showDirection?: boolean;

    // Data and handlers
    direction?: TreeDirection;
    filters: TreeFilterConfig;
    onFiltersChange: (filters: TreeFilterConfig) => void;
    onReset: () => void;
    onCreatePolicyClass?: () => void;

    // Custom sections (preserved for flexibility)
    leftSection?: React.ReactNode;
    rightSection?: React.ReactNode;
}

export function PMTreeToolbar({
    showReset = true,
    showCreatePolicyClass = false,
    showTreeFilters = true,
    showDirection = true,
    direction = 'ascendants',
    filters,
    onFiltersChange,
    onReset,
    onCreatePolicyClass,
    leftSection,
    rightSection,
}: PMTreeToolbarProps) {
    const directionLabel = direction === 'descendants' ? 'Descendants' : 'Ascendants';

    // Check if any section is visible
    const hasVisibleSection = showReset || showCreatePolicyClass || showTreeFilters || showDirection || leftSection || rightSection;

    if (!hasVisibleSection) {
        return null;
    }

    return (
        <Group
            gap="md"
            justify="space-between"
            style={{
                borderBottom: '1px solid var(--mantine-color-gray-3)',
                padding: '2px 8px',
                height: '60px',
            }}
        >
            {/* Left section */}
            <Group gap="md">
                {/* Reset button */}
                {showReset && (
                    <>
                        <ToolBarSection title="Reset">
                            <ActionIcon
                                key="reset"
                                variant="default"
                                onClick={onReset}
                            >
                                <IconRefresh size={18}/>
                            </ActionIcon>
                        </ToolBarSection>
                        <Divider orientation="vertical" />
                    </>
                )}

                {/* Create Policy Class */}
                {showCreatePolicyClass && onCreatePolicyClass && (
                    <>
                        <ToolBarSection title="Create Policy Class">
                            <ActionIcon
                                key={NodeType.PC}
                                variant="default"
                                size="md"
                                onClick={onCreatePolicyClass}
                            >
                                <NodeIcon type={NodeType.PC} size="20px" />
                            </ActionIcon>
                        </ToolBarSection>
                        <Divider orientation="vertical" />
                    </>
                )}

                {/* Custom left section */}
                {leftSection && (
                    <>
                        {leftSection}
                        <Divider orientation="vertical" />
                    </>
                )}

                {/* Tree Filters */}
                {showTreeFilters && (
                    <>
                        <TreeFilterToolbar
                            filters={filters}
                            onFiltersChange={onFiltersChange}
                        />
                        <Divider orientation="vertical" />
                    </>
                )}

                {/* Direction */}
                {showDirection && (
                    <ToolBarSection title="Direction">
                        <Group gap={0}>
                            {direction === 'ascendants' ? (
                                <IconCircleArrowUpRight />
                            ) : (
                                <IconCircleArrowDownLeft />
                            )}
                            <Text size="xs">{directionLabel}</Text>
                        </Group>
                    </ToolBarSection>
                )}
            </Group>

            {/* Right section */}
            {rightSection && <Group gap="md">{rightSection}</Group>}
        </Group>
    );
}
