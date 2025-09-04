import {AppShell, Stack, Box, Group, Divider, Title, ActionIcon, Tooltip, Text, useMantineTheme, Card} from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import { RightSidePanel, SidePanel } from '@/components/sidebar';
import { PMLEditor } from '@/components/PMLEditor';
import React, { useState } from 'react';
import {useDisclosure} from "@mantine/hooks";
import {PMIcon} from "@/components/icons/PMIcon";
import {IconLayoutSidebar, IconLayoutSidebarRight, IconLayoutBottombar, IconSun, IconMoon} from '@tabler/icons-react';
import { atom } from 'jotai';
import {NodeApi, TreeApi} from 'react-arborist';
import { useAtom } from 'jotai';
import { TreeNode } from '@/utils/tree.utils';
import { NodeType, AdjudicationService } from '@/api/pdp.api';
import { useTheme } from '@/contexts/ThemeContext';
import {NodeIcon} from "@/components/pmtree/tree-utils";
import {PMTree} from "@/components/pmtree";
import { PMNode } from "@/components/pmtree/PMNode";
import { NodeContextMenu } from "@/components/pmtree/NodeContextMenu";
import { GraphPMNode } from "@/components/graph/GraphPMNode";
import { PolicyClassModal } from "@/components/modals/PolicyClassModal";
import { CreateNodeModal } from "@/components/modals/CreateNodeModal";

// Create atoms for the PPMTree3 component
const ppmTreeApiAtom = atom<TreeApi<TreeNode> | null>(null);
const ppmTreeDataAtom = atom<TreeNode[]>([]);

const TARGET_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];

export function Graph() {
    const mantineTheme = useMantineTheme();
    const { themeMode, toggleTheme } = useTheme();
    const [treeData, setTreeData] = useAtom(ppmTreeDataAtom);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<SidePanel | null>(null);
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(false);
    const [asideOpened, { toggle: toggleAside }] = useDisclosure(false);
    const [footerOpened, { toggle: toggleFooter }] = useDisclosure(false);

    // Node creation state
    const [selectedNodes, setSelectedNodes] = useState<TreeNode[]>([]);

    // Assignment state
    const [isAssignmentMode, setIsAssignmentMode] = useState(false);
    const [assignmentSourceNode, setAssignmentSourceNode] = useState<TreeNode | null>(null);
    const [assignmentTargetNodes, setAssignmentTargetNodes] = useState<TreeNode[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);

    // Selected node state for associations
    const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null);

    // Association creation state
    const [isCreatingAssociation, setIsCreatingAssociation] = useState(false);
    const [associationCreationNode, setAssociationCreationNode] = useState<TreeNode | null>(null);

    // Association mode state (for context menu-driven association creation)
    const [isAssociationMode, setIsAssociationMode] = useState(false);
    const [associationCreationMode, setAssociationCreationMode] = useState<'outgoing' | 'incoming' | null>(null);

    // Toolbar height
    const toolbarHeight = 60;

    // Policy Class modal state
    const [policyClassModalOpened, setPolicyClassModalOpened] = useState(false);

    // Create Node modal state
    const [createNodeModalOpened, setCreateNodeModalOpened] = useState(false);
    const [createNodeType, setCreateNodeType] = useState<NodeType | null>(null);
    const [createNodeParent, setCreateNodeParent] = useState<TreeNode | null>(null);

    const handleOpenPolicyClassModal = () => {
        setPolicyClassModalOpened(true);
    };

    const handleClosePolicyClassModal = () => {
        setPolicyClassModalOpened(false);
    };

    const handlePolicyClassCreated = () => {
        // Refresh the tree by reloading the page for now
        // This ensures we get the latest data from the API
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    const handleOpenCreateNodeModal = (nodeType: NodeType, parentNode: TreeNode) => {
        setCreateNodeType(nodeType);
        setCreateNodeParent(parentNode);
        setCreateNodeModalOpened(true);
    };

    const handleCloseCreateNodeModal = () => {
        setCreateNodeModalOpened(false);
        setCreateNodeType(null);
        setCreateNodeParent(null);
    };

    const handleNodeCreated = () => {
        // Refresh only the parent node by triggering a re-fetch
        // For now, we'll use a simple refresh approach
        setTimeout(() => {
            window.location.reload();
        }, 500);
    };

    const handleOpenDescendantsPanel = (node: any, isUserTree: boolean) => {
        const newPanel: SidePanel = {
            type: 'descendants',
            title: `Descendants of ${node.name}`,
            node,
            isUserTree,
            allowedTypes: TARGET_ALLOWED_TYPES
        };

        setActivePanel(newPanel);
        setSidePanelOpen(true);

        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const resetAllModes = () => {
        // Reset assignment mode
        setIsAssignmentMode(false);
        setAssignmentSourceNode(null);
        setAssignmentTargetNodes([]);

        // Reset association mode
        setIsAssociationMode(false);
        setAssociationCreationMode(null);
        setSelectedNode(null);

        // Reset association creation state
        setIsCreatingAssociation(false);
        setAssociationCreationNode(null);
    };

    const handleClosePanel = () => {
        // Reset all modes when panel closes
        setActivePanel(null);
        setSidePanelOpen(false);
        resetAllModes();
    };

    const handleToggleSidePanel = () => {
        setSidePanelOpen(!sidePanelOpen);
    };

    const handleOpenNodeCreationPanel = (nodeType: NodeType) => {
        // Reset all other modes before starting node creation
        resetAllModes();

        const newPanel: SidePanel = {
            type: 'create-node',
            nodeType,
            selectedNodes
        };

        setActivePanel(newPanel);
        setSidePanelOpen(true);

        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const handleAddAsAscendant = (node: TreeNode) => {
        // Add node to selected nodes if not already present
        setSelectedNodes(prev => {
            const exists = prev.some(n => n.id === node.id);
            if (!exists) {
                return [...prev, node];
            }
            return prev;
        });

        // Update the active create-node panel with the new selected nodes
        if (activePanel?.type === 'create-node') {
            const updatedSelectedNodes = activePanel.selectedNodes || [];
            const exists = updatedSelectedNodes.some(n => n.id === node.id);
            if (!exists) {
                setActivePanel({
                    ...activePanel,
                    selectedNodes: [...updatedSelectedNodes, node]
                });
            }
        }

        // Show notification to user
        console.log(`Added ${node.name} as ascendant for node creation`);
    };

    const handleUpdateSelectedNodes = (nodes: TreeNode[]) => {
        if (activePanel?.type === 'create-node') {
            setActivePanel({
                ...activePanel,
                selectedNodes: nodes
            });
        }
    };

    const handleAssignTo = (node: TreeNode) => {
        // Reset all other modes before starting assignment
        resetAllModes();

        setIsAssignmentMode(true);
        setAssignmentSourceNode(node);
        setAssignmentTargetNodes([]);

        const newPanel: SidePanel = {
            type: 'assignment',
            sourceNode: node,
            targetNodes: []
        };

        setActivePanel(newPanel);
        setSidePanelOpen(true);

        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const handleAssignNodeTo = (targetNode: TreeNode) => {
        // Add target node to the list if not already present
        setAssignmentTargetNodes(prev => {
            const exists = prev.some(n => n.id === targetNode.id);
            if (!exists) {
                const newTargets = [...prev, targetNode];

                // Update the active assignment panel
                if (activePanel?.type === 'assignment') {
                    setActivePanel({
                        ...activePanel,
                        targetNodes: newTargets
                    });
                }

                return newTargets;
            }
            return prev;
        });
    };

    const handleRemoveAssignmentTarget = (nodeId: string) => {
        setAssignmentTargetNodes(prev => {
            const newTargets = prev.filter(n => n.id !== nodeId);

            // Update the active assignment panel
            if (activePanel?.type === 'assignment') {
                setActivePanel({
                    ...activePanel,
                    targetNodes: newTargets
                });
            }

            return newTargets;
        });
    };

    const handleAssignNodes = async () => {
        if (!assignmentSourceNode || assignmentTargetNodes.length === 0) {return;}

        setIsAssigning(true);

        // Update panel to show loading state
        if (activePanel?.type === 'assignment') {
            setActivePanel({
                ...activePanel,
                isAssigning: true
            });
        }

        try {
            // Make API calls for each assignment
            // assign(ascendantId: string, descendantIds: string[])
            // We're assigning the source node TO the target nodes, so source is ascendant
            const targetNodeIds = assignmentTargetNodes.map(node => node.pmId!);
            await AdjudicationService.assign(assignmentSourceNode.pmId!, targetNodeIds);

            // Clear assignment state
            setIsAssignmentMode(false);
            setAssignmentSourceNode(null);
            setAssignmentTargetNodes([]);
            setActivePanel(null);
            setSidePanelOpen(false);

            // TODO: Update tree children for assigned nodes
            console.log('Assignment completed successfully');
        } catch (error) {
            console.error('Assignment failed:', error);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleViewAssociations = (node: TreeNode) => {
        // Reset all other modes before opening associations
        resetAllModes();

        const newPanel: SidePanel = {
            type: 'associations',
            node
        };

        setActivePanel(newPanel);
        setSidePanelOpen(true);

        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const handleStartAssociationCreation = (sourceNode: TreeNode) => {
        setIsCreatingAssociation(true);
        setAssociationCreationNode(sourceNode);
        console.log(`Started association creation mode for node: ${sourceNode.name}`);
    };

    const handleSelectNodeForAssociation = (targetNode: TreeNode) => {
        if (isCreatingAssociation && associationCreationNode) {
            // Open associations tab with both nodes
            const newPanel: SidePanel = {
                type: 'associations',
                node: associationCreationNode
            };

            setActivePanel(newPanel);
            setSidePanelOpen(true);
            setSelectedNode(targetNode); // This will be passed to AssociationsTab

            // Automatically open the aside panel if it's closed
            if (!asideOpened) {
                toggleAside();
            }

            // Reset creation state
            setIsCreatingAssociation(false);
            setAssociationCreationNode(null);

            console.log(`Selected ${targetNode.name} for association with ${associationCreationNode.name}`);
        }
    };

    const handleAssociateWith = (targetNode: TreeNode) => {
        if (isAssociationMode && associationCreationMode && activePanel?.type === 'associations') {
            // Set the selected node for the associations tab
            setSelectedNode(targetNode);

            // Reset association mode
            setIsAssociationMode(false);
            setAssociationCreationMode(null);

            console.log(`Selected ${targetNode.name} for ${associationCreationMode} association with ${activePanel.node?.name}`);
        }
    };

    const handleStartAssociationMode = (mode: 'outgoing' | 'incoming') => {
        // Reset all other modes before starting association mode
        resetAllModes();

        setIsAssociationMode(true);
        setAssociationCreationMode(mode);
        setSelectedNode(null); // Clear selected node to start blank
        console.log(`Started ${mode} association mode`);
    };

    // Context menu handlers
    const handleNodeRightClick = (node: TreeNode, event: React.MouseEvent) => {
        setContextMenu({ x: event.clientX, y: event.clientY, node });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    return (
        <AppShell
            header={{ height: 60 }}
            transitionDuration={0}
        >
            <AppShell.Header style={{ backgroundColor: mantineTheme.other.intellijPanelBg }}>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <PMIcon style={{width: '36px', height: '36px'}}/>
                        <Title order={2}>Policy Machine</Title>
                    </Group>

                    <NavBar activePageIndex={0} />

                    <Group>
                        <Tooltip label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
                            <ActionIcon
                                variant="subtle"
                                size="md"
                                onClick={toggleTheme}
                            >
                                {themeMode === 'light' ? <IconMoon size={24} /> : <IconSun size={24} />}
                            </ActionIcon>
                        </Tooltip>

                        <UserMenu />
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Main style={{
                backgroundColor: mantineTheme.other.intellijContentBg
            }}>
                <Group grow gap="md" align="stretch" style={{ height: '100%'}}>
                    <Stack gap={0} style={{ height: '100%', width: '100%' }}>
                        {/* Node Creation Toolbar */}
                        <Box style={{
                            height: toolbarHeight,
                            borderBottom: '1px solid var(--mantine-primary-color-filled)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '16px',
                            paddingRight: '16px'
                        }}>
                            <Group gap="md">
                                <Stack gap={2} align="left">
                                    <Text size="xs" c="dimmed" fw={500}>
                                        Create Policy Class
                                    </Text>
                                    <Group gap="xs">

                                            <ActionIcon
                                                key={NodeType.PC}
                                                variant="default"
                                                size="md"
                                                onClick={handleOpenPolicyClassModal}
                                            >
                                                <NodeIcon type={NodeType.PC} size="20px" fontSize="14px" />
                                            </ActionIcon>
                                    </Group>
                                </Stack>
                                <Divider orientation="vertical" />
                            </Group>
                        </Box>

                        {/* Tree */}
                        <Box style={{ flex: 1, overflow: 'hidden' }}>
                            <PMTree
                                treeApiAtom={ppmTreeApiAtom}
                                treeDataAtom={ppmTreeDataAtom}
                                height="calc(100vh - 120px)"
                                direction="ascendants"
                                style={{}}
                            >
                                {(nodeProps) => (
                                    <PMNode
                                        {...nodeProps}
                                        clickHandlers={{
                                            onRightClick: handleNodeRightClick
                                        }}
                                        direction="ascendants"
                                        treeDataAtom={ppmTreeDataAtom}
                                    />
                                )}
                            </PMTree>
                        </Box>
                    </Stack>

                    {/* Aside Panel Card */}
                    <Card shadow="lg" padding="lg" radius={0} withBorder style={{backgroundColor: mantineTheme.other.intellijPanelBg}}>
                        <Text size="lg" fw={500} mb="md">Aside Panel</Text>
                        <Text size="sm" c="dimmed">This is the right side panel card.</Text>
                    </Card>
                </Group>

                {/* Context Menu */}
                {contextMenu && (
                    <NodeContextMenu
                        node={contextMenu.node}
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        onClose={handleCloseContextMenu}
                        onAddAsAscendant={handleAddAsAscendant}
                        hasNodeCreationTabs={activePanel?.type === 'create-node'}
                        nodeTypeBeingCreated={activePanel?.type === 'create-node' ? activePanel.nodeType : undefined}
                        onAssignTo={handleAssignTo}
                        onAssignNodeTo={handleAssignNodeTo}
                        isAssignmentMode={isAssignmentMode}
                        assignmentSourceNode={assignmentSourceNode || undefined}
                        onViewAssociations={handleViewAssociations}
                        isCreatingAssociation={isCreatingAssociation}
                        onSelectNodeForAssociation={handleSelectNodeForAssociation}
                        isAssociationMode={isAssociationMode}
                        associationCreationMode={associationCreationMode}
                        onAssociateWith={handleAssociateWith}
                        onCreateChildNode={handleOpenCreateNodeModal}
                    />
                )}

                {/*<RightSidePanel
                        isOpen
                        onToggle={handleToggleSidePanel}
                        panel={activePanel}
                        onClose={handleClosePanel}
                        onUpdateSelectedNodes={handleUpdateSelectedNodes}
                        onRemoveAssignmentTarget={handleRemoveAssignmentTarget}
                        onAssignNodes={handleAssignNodes}
                        embedded
                        selectedNodeFromMainTree={selectedNode}
                        onStartAssociationMode={handleStartAssociationMode}
                    />*/}

                {/* Policy Class Creation Modal */}
                <PolicyClassModal
                    opened={policyClassModalOpened}
                    onClose={handleClosePolicyClassModal}
                    onSuccess={handlePolicyClassCreated}
                />

                {/* Create Node Modal */}
                {createNodeType && createNodeParent && (
                    <CreateNodeModal
                        opened={createNodeModalOpened}
                        onClose={handleCloseCreateNodeModal}
                        onSuccess={handleNodeCreated}
                        nodeType={createNodeType}
                        parentNode={createNodeParent}
                    />
                )}

            </AppShell.Main>
        </AppShell>
    );
}

