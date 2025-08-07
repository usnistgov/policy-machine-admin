import React, { useState, useEffect } from 'react';
import {
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    Text,
    Card,
    ActionIcon,
    ScrollArea,
    Alert, useMantineTheme
} from '@mantine/core';
import { NodeType, AdjudicationService } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { IconTrash, IconInfoCircle, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {NodeIcon} from "@/components/pmtree/tree-utils";

interface NodeCreationTabProps {
    nodeType: NodeType;
    selectedNodes: TreeNode[];
    onAddNode?: (node: TreeNode) => void;
    onRemoveNode?: (nodeId: string) => void;
    onUpdateSelectedNodes?: (nodes: TreeNode[]) => void;
    onClose: () => void;
}

export function NodeCreationTab({ 
    nodeType, 
    selectedNodes, 
    onRemoveNode,
    onUpdateSelectedNodes,
    onClose 
}: NodeCreationTabProps) {
    const theme = useMantineTheme();
    const [name, setName] = useState('');
    const [properties, setProperties] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Reset fields only when component first mounts/becomes visible
    useEffect(() => {
        setName('');
        setProperties('');
        setIsCreating(false);
        onUpdateSelectedNodes?.([]);
    }, []); // Empty dependency array = only run on mount

    const handleRemoveNode = (nodeId: string) => {
        const updatedNodes = selectedNodes.filter(node => node.id !== nodeId);
        onUpdateSelectedNodes?.(updatedNodes);
        onRemoveNode?.(nodeId);
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            notifications.show({
                title: 'Validation Error',
                message: 'Node name is required',
                color: 'red'
            });
            return;
        }

        // For PC nodes, no descendants are needed
        const descendants = nodeType === NodeType.PC ? [] : selectedNodes.map(node => node.pmId!);

        // PC nodes require at least no descendants, other nodes need at least one
        if (nodeType !== NodeType.PC && descendants.length === 0) {
            notifications.show({
                title: 'Validation Error',
                message: `${nodeType} nodes require at least one initial descendant`,
                color: 'red'
            });
            return;
        }

        setIsCreating(true);

        try {
            switch (nodeType) {
                case NodeType.UA:
                    await AdjudicationService.createUserAttribute(name.trim(), descendants);
                    break;
                case NodeType.OA:
                    await AdjudicationService.createObjectAttribute(name.trim(), descendants);
                    break;
                case NodeType.U:
                    await AdjudicationService.createUser(name.trim(), descendants);
                    break;
                case NodeType.O:
                    await AdjudicationService.createObject(name.trim(), descendants);
                    break;
                case NodeType.PC:
                    await AdjudicationService.createPolicyClass(name.trim());
                    break;
                default:
                    throw new Error(`Unsupported node type: ${nodeType}`);
            }

            notifications.show({
                title: 'Success',
                message: `${nodeType} node "${name}" created successfully`,
                color: 'green'
            });

            // Reset form
            setName('');
            setProperties('');
            onUpdateSelectedNodes?.([]);
            
            // Close the tab
            onClose();

        } catch (error) {
            console.error('Error creating node:', error);
            notifications.show({
                title: 'Error',
                message: `Failed to create ${nodeType} node: ${error}`,
                color: 'red'
            });
        } finally {
            setIsCreating(false);
        }
    };

    const needsDescendants = nodeType !== NodeType.PC;

    return (
        <Stack gap={0} style={{ flex: 1 }}>
            {/* Panel Header */}
            <Group justify="space-between" p="md" style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}>
                <Group gap="xs" align="center">
                    <Text fw={500}>Create</Text>
                    <NodeIcon type={nodeType} size="20px" fontSize="16px" />
                </Group>
                <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={onClose}
                >
                    <IconX size={16} />
                </ActionIcon>
            </Group>

            {/* Panel Content */}
            <ScrollArea style={{ flex: 1 }}>
                <Stack gap="md" p="md">

                {/* Name field */}
                <TextInput
                    label="Node Name"
                    placeholder={`Enter ${nodeType} node name`}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    required
                />

                {/* Properties field */}
                <Textarea
                    label="Properties"
                    placeholder='{"key": "value", "another": "property"}'
                    value={properties}
                    onChange={(e) => setProperties(e.currentTarget.value)}
                    minRows={6}
                    autosize
                    resize="vertical"
                    description="Define node properties in JSON format"
                />

                {/* Initial descendants selection */}
                {needsDescendants && (
                    <>
                        <Text size="sm" fw={500}>
                            Initial Descendants
                            <Text size="xs" c="dimmed" component="span" ml="xs">
                                (Required for {nodeType} nodes)
                            </Text>
                        </Text>

                        {selectedNodes.length === 0 ? (
                            <Alert 
                                icon={<IconInfoCircle size={16} />} 
                                title="No descendants selected"
                                color="blue"
                            >
                                Right-click on nodes in the tree and select "Add as Ascendant" to add them as initial descendants for this new node.
                            </Alert>
                        ) : (
                            <Stack gap="xs">
                                {selectedNodes.map((node) => (
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
                                                onClick={() => handleRemoveNode(node.id)}
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Card>
                                ))}
                                <Text size="xs" c="dimmed">
                                    {selectedNodes.length} descendant{selectedNodes.length !== 1 ? 's' : ''} selected
                                </Text>
                            </Stack>
                        )}
                    </>
                )}

                {/* Create button */}
                <Group justify="flex-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isCreating}
                        color={theme.colors.blue[7]}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        loading={isCreating}
                        disabled={needsDescendants && selectedNodes.length === 0}
                    >
                        Create
                    </Button>
                </Group>
                </Stack>
            </ScrollArea>
        </Stack>
    );
}