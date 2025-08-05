import React from 'react';
import { Stack, Text, Group, Button, Alert, ScrollArea, ActionIcon, Divider, Card } from '@mantine/core';
import { IconX, IconLink, IconInfoCircle, IconTrash } from '@tabler/icons-react';
import { TreeNode } from '@/utils/tree.utils';
import { NodeIcon } from '@/components/tree/util';
import { NodeType } from '@/api/pdp.api';

interface AssignmentTabProps {
    sourceNode: TreeNode;
    targetNodes: TreeNode[];
    onRemoveTarget: (nodeId: string) => void;
    onAssign: () => void;
    onCancel: () => void;
    isAssigning: boolean;
}

export function AssignmentTab({ sourceNode, targetNodes, onRemoveTarget, onAssign, onCancel, isAssigning }: AssignmentTabProps) {
    return (
        <Stack gap="md" style={{ height: '100%' }}>
            {/* Header */}
            <Group justify="space-between" align="center">
                <Group gap="xs" align="center">
                    <Text size="lg" fw={600}>Assign </Text>
                    <NodeIcon type={sourceNode.type} size="18px" fontSize="18px" />
                    <Text size="md" fw={500}>{sourceNode.name}</Text>
                </Group>
            </Group>

            {/* Target Nodes List */}
            <Stack gap="xs" style={{ flex: 1 }}>
                <Text size="sm" fw={500} c="dimmed">To:</Text>

                {targetNodes.length === 0 ? (
                    <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                        Select nodes from the tree to assign <strong>{sourceNode.name}</strong> to them.
                        Click on other nodes and select "Assign {sourceNode.name} to" from the context menu.
                    </Alert>
                ) : (
                    <ScrollArea style={{ flex: 1, maxHeight: '300px' }}>
                        <Stack gap="xs">
                            {targetNodes.map((node) => (
                                <Card key={node.id} p="sm" withBorder>
                                    <Group justify="space-between" align="center">
                                        <Group gap="sm">
                                            <NodeIcon type={node.type} size="16px" fontSize="16px" />
                                            <Text size="md">{node.name}</Text>
                                        </Group>
                                        <ActionIcon
                                            size="sm"
                                            variant="subtle"
                                            color="red"
                                            onClick={() => onRemoveTarget(node.id)}
                                            disabled={isAssigning}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            ))}
                            <Text size="xs" c="dimmed">
                                {targetNodes.length} target{targetNodes.length !== 1 ? 's' : ''} selected
                            </Text>
                        </Stack>
                    </ScrollArea>
                )}
            </Stack>

            <Divider />

            {/* Action Buttons */}
            <Group justify="flex-end" gap="sm">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isAssigning}
                >
                    Cancel
                </Button>
                <Button
                    onClick={onAssign}
                    disabled={targetNodes.length === 0}
                    loading={isAssigning}
                    leftSection={<IconLink size={16} />}
                >
                    Assign ({targetNodes.length})
                </Button>
            </Group>
        </Stack>
    );
}