import React from 'react';
import { Stack, Text } from '@mantine/core';
import { TreeNode } from '@/utils/tree.utils';
import { DescendantsTab } from './DescendantsTab';
import { AssociationTab } from './AssociationTab';
import { NodeCreationTab } from './NodeCreationTab';
import { AssignmentTab } from './AssignmentTab';
import { AssociationsTab } from './AssociationsTab';
import { NodeType } from '@/api/pdp.api';

export interface SidePanel {
    type: 'descendants' | 'association' | 'create-node' | 'assignment' | 'associations';
    title?: string; // Optional, only used for descendants and association panels
    node?: TreeNode;
    isUserTree?: boolean;
    allowedTypes?: any[];
    // For association panels
    selectedUserNode?: TreeNode | null;
    selectedTargetNode?: TreeNode | null;
    // For node creation panels
    nodeType?: NodeType;
    selectedNodes?: TreeNode[];
    // For assignment panels
    sourceNode?: TreeNode;
    targetNodes?: TreeNode[];
    isAssigning?: boolean;
}

interface RightSidePanelProps {
    isOpen: boolean;
    onToggle: () => void;
    panel: SidePanel | null;
    onClose: () => void;
    onUpdateSelectedNodes?: (nodes: TreeNode[]) => void;
    onRemoveAssignmentTarget?: (nodeId: string) => void;
    onAssignNodes?: () => void;
    embedded?: boolean; // New prop to indicate if it's embedded in AppShell
    selectedNodeFromMainTree?: TreeNode | null; // Node selected from main tree
    onStartAssociationMode?: (mode: 'outgoing' | 'incoming') => void; // Callback to start association mode
}

export function RightSidePanel({
                                   isOpen,
                                   onToggle,
                                   panel,
                                   onClose,
                                   onUpdateSelectedNodes,
                                   onRemoveAssignmentTarget,
                                   onAssignNodes,
                                   selectedNodeFromMainTree,
                                   onStartAssociationMode,
                               }: RightSidePanelProps) {
    return (
        <div style={{ height: '100%' }}>
            {!panel ? (
                <Stack align="center" justify="center" style={{ height: '100%' }} gap="md">
                    <Text c="dimmed" ta="center">
                        No panel open
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                        Right-click on nodes to show descendants or create associations, or use the toolbar to create nodes
                    </Text>
                </Stack>
            ) : (
                <>
                    {panel.type === 'descendants' ? (
                        <DescendantsTab
                            rootNode={panel.node!}
                            isUserTree={panel.isUserTree!}
                            allowedTypes={panel.allowedTypes || []}
                            onClose={onClose}
                        />
                    ) : panel.type === 'create-node' ? (
                        <NodeCreationTab
                            nodeType={panel.nodeType!}
                            selectedNodes={panel.selectedNodes || []}
                            onUpdateSelectedNodes={onUpdateSelectedNodes}
                            onClose={onClose}
                        />
                    ) : panel.type === 'assignment' ? (
                        <AssignmentTab
                            sourceNode={panel.sourceNode!}
                            targetNodes={panel.targetNodes || []}
                            onRemoveTarget={onRemoveAssignmentTarget!}
                            onAssign={onAssignNodes!}
                            onCancel={onClose}
                            isAssigning={panel.isAssigning || false}
                        />
                    ) : panel.type === 'associations' ? (
                        <AssociationsTab
                            node={panel.node!}
                            onClose={onClose}
                            selectedNodeFromMainTree={selectedNodeFromMainTree}
                            onStartAssociationMode={onStartAssociationMode}
                        />
                    ) : (
                        <AssociationTab
                            node={panel.node!}
                            selectedUserNode={panel.selectedUserNode}
                            selectedTargetNode={panel.selectedTargetNode}
                            isUserTree={panel.isUserTree!}
                            onClose={onClose}
                        />
                    )}
                </>
            )}
        </div>
    );
}