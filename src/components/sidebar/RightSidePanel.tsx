import React, { useState } from 'react';
import {
    Stack,
    Tabs,
    Group,
    Text,
    CloseButton
} from '@mantine/core';
import {
    IconArrowBigRightLines
} from '@tabler/icons-react';
import { TreeNode } from '@/utils/tree.utils';
import { DescendantsTab } from './DescendantsTab';
import { AssociationTab } from './AssociationTab';
import {DescendantsIcon} from "@/components/icons/DescendantsIcon";

export interface SidePanelTab {
    id: string;
    type: 'descendants' | 'association';
    title: string;
    node: TreeNode;
    isUserTree: boolean;
    allowedTypes?: any[];
    // For association tabs
    selectedUserNode?: TreeNode | null;
    selectedTargetNode?: TreeNode | null;
}

interface RightSidePanelProps {
    isOpen: boolean;
    onToggle: () => void;
    tabs: SidePanelTab[];
    activeTabId: string | null;
    onTabChange: (tabId: string) => void;
    onCloseTab: (tabId: string) => void;
    embedded?: boolean; // New prop to indicate if it's embedded in AppShell
}

export function RightSidePanel({
                                   isOpen,
                                   onToggle,
                                   tabs,
                                   activeTabId,
                                   onTabChange,
                                   onCloseTab,
                               }: RightSidePanelProps) {
    const [width] = useState(400);

    return (
        <Stack gap={0} h="100%">
            {/* Tabs */}
            {tabs.length === 0 ? (
                <Stack align="center" justify="center" style={{ flex: 1 }} gap="md">
                    <Text c="dimmed" ta="center">
                        No tabs open
                    </Text>
                    <Text size="xs" c="dimmed" ta="center">
                        Right-click on nodes to show descendants or create associations
                    </Text>
                </Stack>
            ) : (
                <Tabs
                    value={activeTabId}
                    onChange={(value) => onTabChange(value || '')}
                    orientation="horizontal"
                    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    styles={{
                        root: { height: '100%' },
                        panel: { flex: 1, overflow: 'hidden' }
                    }}
                >
                    <Tabs.List>
                        {tabs.map((tab) => (
                            <Group key={tab.id} gap={0} style={{ position: 'relative' }}>
                                <Tabs.Tab
                                    value={tab.id}
                                    leftSection={
                                        tab.type === 'descendants' ? (
                                            <DescendantsIcon size={20} />
                                        ) : (
                                            <IconArrowBigRightLines size={14} />
                                        )
                                    }
                                    style={{
                                        paddingRight: '24px',
                                        maxWidth: '200px'
                                    }}
                                >
                                    <Group gap={4} style={{ maxWidth: '200px' }}>
                                        <Text size="s" truncate style={{ maxWidth: '200px' }}>
                                            {tab.node.name}
                                        </Text>
                                    </Group>
                                </Tabs.Tab>
                                <CloseButton
                                    size="xs"
                                    style={{
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 1
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCloseTab(tab.id);
                                    }}
                                />
                            </Group>
                        ))}
                    </Tabs.List>

                    {tabs.map((tab) => (
                        <Tabs.Panel
                            key={tab.id}
                            value={tab.id}
                            style={{
                                flex: 1,
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {tab.type === 'descendants' ? (
                                <DescendantsTab
                                    rootNode={tab.node}
                                    isUserTree={tab.isUserTree}
                                    allowedTypes={tab.allowedTypes || []}
                                />
                            ) : (
                                <AssociationTab
                                    node={tab.node}
                                    selectedUserNode={tab.selectedUserNode}
                                    selectedTargetNode={tab.selectedTargetNode}
                                    isUserTree={tab.isUserTree}
                                    onClose={() => onCloseTab(tab.id)}
                                />
                            )}
                        </Tabs.Panel>
                    ))}
                </Tabs>
            )}
        </Stack>
    );
}