import {AppShell, Stack, Box, Group, Divider, Title, ActionIcon, Tooltip, Text, useMantineTheme} from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import { RightSidePanel, SidePanel } from '@/components/sidebar';
import { PMLEditor } from '@/components/PMLEditor';
import React, { useState } from 'react';
import {useDisclosure} from "@mantine/hooks";
import {PMIcon} from "@/components/icons/PMIcon";
import {IconLayoutSidebar, IconLayoutSidebarRight, IconLayoutBottombar, IconSun, IconMoon} from '@tabler/icons-react';
import { atom } from 'jotai';
import { TreeApi } from 'react-arborist';
import { TreeNode } from '@/utils/tree.utils';
import { NodeType, AdjudicationService } from '@/api/pdp.api';
import { useTheme } from '@/contexts/ThemeContext';
import {NodeIcon} from "@/components/pmtree/tree-utils";
import {PMTree} from "@/components/pmtree";

// Create atoms for the PPMTree3 component
const ppmTreeApiAtom = atom<TreeApi<TreeNode> | null>(null);
const ppmTreeDataAtom = atom<TreeNode[]>([]);

const TARGET_ALLOWED_TYPES: NodeType[] = [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O];

export function Graph() {
    const mantineTheme = useMantineTheme();
    const { themeMode, toggleTheme } = useTheme();
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
    
    // Association creation state
    const [isCreatingAssociation, setIsCreatingAssociation] = useState(false);
    const [associationCreationNode, setAssociationCreationNode] = useState<TreeNode | null>(null);
    
    // Association mode state (for context menu-driven association creation)
    const [isAssociationMode, setIsAssociationMode] = useState(false);
    const [associationCreationMode, setAssociationCreationMode] = useState<'outgoing' | 'incoming' | null>(null);

    // Resizable state
    const [navbarWidth, setNavbarWidth] = useState(200);
    const [asideWidth, setAsideWidth] = useState(800);
    const [footerHeight, setFooterHeight] = useState(300);
    const [isResizingNavbar, setIsResizingNavbar] = useState(false);
    const [isResizingAside, setIsResizingAside] = useState(false);
    const [isResizingFooter, setIsResizingFooter] = useState(false);
    const [showNavbarResizer, setShowNavbarResizer] = useState(false);
    const [showAsideResizer, setShowAsideResizer] = useState(false);
    const [showFooterResizer, setShowFooterResizer] = useState(false);

    // Toolbar height
    const toolbarHeight = 60;

    // Mouse event handlers for navbar resizer
    React.useEffect(() => {
        if (!isResizingNavbar) {return;}

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const newWidth = Math.min(400, Math.max(150, e.clientX));
            setNavbarWidth(newWidth);
        };

        const onMouseUp = () => {
            setIsResizingNavbar(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('dragstart', (e) => e.preventDefault());
        window.addEventListener('selectstart', (e) => e.preventDefault());

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('dragstart', (e) => e.preventDefault());
            window.removeEventListener('selectstart', (e) => e.preventDefault());
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizingNavbar]);

    // Mouse event handlers for aside resizer
    React.useEffect(() => {
        if (!isResizingAside) {return;}

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const vw = window.innerWidth;
            const newWidth = Math.min(1000, Math.max(200, vw - e.clientX));
            setAsideWidth(newWidth);
        };

        const onMouseUp = () => {
            setIsResizingAside(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('dragstart', (e) => e.preventDefault());
        window.addEventListener('selectstart', (e) => e.preventDefault());

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('dragstart', (e) => e.preventDefault());
            window.removeEventListener('selectstart', (e) => e.preventDefault());
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizingAside]);

    // Mouse event handlers for footer resizer
    React.useEffect(() => {
        if (!isResizingFooter) {return;}

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const vh = window.innerHeight;
            const newHeight = Math.min(800, Math.max(200, vh - e.clientY));
            setFooterHeight(newHeight);
        };

        const onMouseUp = () => {
            setIsResizingFooter(false);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('dragstart', (e) => e.preventDefault());
        window.addEventListener('selectstart', (e) => e.preventDefault());

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('dragstart', (e) => e.preventDefault());
            window.removeEventListener('selectstart', (e) => e.preventDefault());
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isResizingFooter]);

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

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: navbarWidth,
                breakpoint: 'sm',
                collapsed: { desktop: !desktopOpened },
            }}
            aside={{
                width: asideWidth,
                breakpoint: 'md',
                collapsed: { desktop: !asideOpened },
            }}
            footer={{
                height: footerHeight,
                collapsed: !footerOpened,
            }}
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
                        <Tooltip label={desktopOpened ? "Hide Sidebar" : "Show Sidebar"}>
                            <ActionIcon
                                variant={desktopOpened ? "filled" : "subtle"}
                                size="md"
                                onClick={toggleDesktop}
                            >
                                <IconLayoutSidebar size={24} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label={footerOpened ? "Hide Footer" : "Show Footer"}>
                            <ActionIcon
                                variant={footerOpened ? "filled" : "subtle"}
                                size="md"
                                onClick={toggleFooter}
                            >
                                <IconLayoutBottombar size={24} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label={asideOpened ? "Hide Right Panel" : "Show Right Panel"}>
                            <ActionIcon
                                variant={asideOpened ? "filled" : "subtle"}
                                size="md"
                                onClick={toggleAside}
                            >
                                <IconLayoutSidebarRight size={24} />
                            </ActionIcon>
                        </Tooltip>

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
            <AppShell.Navbar p="md" style={{ backgroundColor: mantineTheme.other.intellijPanelBg }}>
                {/* Left panel - currently empty */}
            </AppShell.Navbar>
            <AppShell.Main style={{ 
                height: '100%', 
                position: 'relative',
                backgroundColor: mantineTheme.other.intellijContentBg
            }}>
                <Stack gap={0} style={{ height: '100%' }}>
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
                        <Group gap="md" align="center">
                            <Stack gap={2} align="left">
                                <Text size="xs" c="dimmed" fw={500}>
                                    Create Node
                                </Text>
                                <Group gap="xs">
                                    {[NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O].map((nodeType) => (
                                        <ActionIcon
                                            key={nodeType}
                                            variant="subtle"
                                            size="md"
                                            onClick={() => handleOpenNodeCreationPanel(nodeType)}
                                        >
                                            <NodeIcon type={nodeType} size="20px" fontSize="14px" />
                                        </ActionIcon>
                                    ))}
                                </Group>
                            </Stack>
                            <Divider orientation="vertical" />
                        </Group>
                    </Box>

                    {/* Tree */}
                    <PMTree
                        treeApiAtom={ppmTreeApiAtom}
                        treeDataAtom={ppmTreeDataAtom}
                        direction="ascendants"
                        headerHeight={60 + toolbarHeight}
                        footerHeight={footerHeight}
                        footerOpened={footerOpened}
                        clickHandlers={{
                            onAddAsAscendant: handleAddAsAscendant,
                            hasNodeCreationTabs: activePanel?.type === 'create-node',
                            nodeTypeBeingCreated: activePanel?.type === 'create-node' ? activePanel.nodeType : undefined,
                            onAssignTo: handleAssignTo,
                            onAssignNodeTo: handleAssignNodeTo,
                            isAssignmentMode,
                            assignmentSourceNode,
                            onViewAssociations: handleViewAssociations,
                            onStartAssociationCreation: handleStartAssociationCreation,
                            onSelectNodeForAssociation: handleSelectNodeForAssociation,
                            isCreatingAssociation,
                            associationCreationNode,
                            isAssociationMode,
                            associationCreationMode,
                            onAssociateWith: handleAssociateWith
                        }}
                        style={{}}
                    />
                </Stack>
                {/* Navbar resizer */}
                {desktopOpened && (
                    <Box
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsResizingNavbar(true);
                        }}
                        onMouseEnter={() => setShowNavbarResizer(true)}
                        onMouseLeave={() => setShowNavbarResizer(false)}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            top: 60,
                            left: navbarWidth - 4,
                            width: 8,
                            height: `calc(100vh - ${footerOpened ? footerHeight : 0}px - 60px)`,
                            cursor: 'ew-resize',
                            zIndex: 2000,
                            background: showNavbarResizer || isResizingNavbar ? 'var(--mantine-primary-color-filled)' : 'transparent',
                            borderRadius: 4,
                            transition: 'background 0.2s',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                        }}
                    />
                )}
                {/* Aside resizer */}
                {asideOpened && (
                    <Box
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsResizingAside(true);
                        }}
                        onMouseEnter={() => setShowAsideResizer(true)}
                        onMouseLeave={() => setShowAsideResizer(false)}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            top: 60,
                            right: asideWidth - 4,
                            width: 8,
                            height: `calc(100vh - ${footerOpened ? footerHeight : 0}px - 60px)`,
                            cursor: 'ew-resize',
                            zIndex: 2000,
                            background: showAsideResizer || isResizingAside ? 'var(--mantine-primary-color-filled)' : 'transparent',
                            borderRadius: 4,
                            transition: 'background 0.2s',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                        }}
                    />
                )}
                {/* Footer resizer */}
                {footerOpened && (
                    <Box
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsResizingFooter(true);
                        }}
                        onMouseEnter={() => setShowFooterResizer(true)}
                        onMouseLeave={() => setShowFooterResizer(false)}
                        onDragStart={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            left: 0,
                            bottom: footerHeight - 4,
                            width: '100vw',
                            height: 8,
                            cursor: 'ns-resize',
                            zIndex: 2000,
                            background: showFooterResizer || isResizingFooter ? 'var(--mantine-primary-color-filled)' : 'transparent',
                            borderRadius: 4,
                            transition: 'background 0.2s',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                        }}
                    />
                )}
            </AppShell.Main>

            <AppShell.Aside p="md" style={{ backgroundColor: mantineTheme.other.intellijPanelBg }}>
                <RightSidePanel
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
                />

            </AppShell.Aside>

            <AppShell.Footer style={{
                padding: '10px',
                height: footerHeight,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: mantineTheme.other.intellijPanelBg
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <PMLEditor
                        title="PML Editor"
                        hideButtons={false}
                        containerHeight={footerHeight}
                    />
                </div>
            </AppShell.Footer>
        </AppShell>
    );
}