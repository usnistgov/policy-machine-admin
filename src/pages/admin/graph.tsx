import {AppShell, Stack, Box, Group, Divider, Title, ActionIcon, Tooltip} from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import {PMTree, TARGET_ALLOWED_TYPES} from '@/components/tree/PMTree';
import classes from './navbar.module.css';
import {
    targetOpenTreeNodesAtom,
    targetTreeApiAtom,
    targetTreeDataAtom
} from "@/components/tree/tree-atom";
import {TargetTreeNode} from "@/components/tree/PMNode";
import {useTargetDynamicTree} from "@/hooks/dynamic-tree";
import { UserMenu } from '@/components/UserMenu';
import { RightSidePanel, SidePanelTab } from '@/components/sidebar';
import { PMLEditor } from '@/components/PMLEditor';
import React, { useState } from 'react';
import {useDisclosure} from "@mantine/hooks";
import {PMIcon} from "@/components/icons/PMIcon";
import { IconLayoutSidebar, IconLayoutSidebarRight, IconLayoutBottombar } from '@tabler/icons-react';
import { useMantineTheme } from '@mantine/core';

export function Graph() {
    const theme = useMantineTheme();
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [sidePanelTabs, setSidePanelTabs] = useState<SidePanelTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
    const [asideOpened, { toggle: toggleAside }] = useDisclosure(false);
    const [footerOpened, { toggle: toggleFooter }] = useDisclosure(false);

    // Resizable state
    const [asideWidth, setAsideWidth] = useState(400);
    const [footerHeight, setFooterHeight] = useState(300);
    const [isResizingAside, setIsResizingAside] = useState(false);
    const [isResizingFooter, setIsResizingFooter] = useState(false);
    const [showAsideResizer, setShowAsideResizer] = useState(false);
    const [showFooterResizer, setShowFooterResizer] = useState(false);

    // Mouse event handlers for aside resizer
    React.useEffect(() => {
        if (!isResizingAside) return;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const vw = window.innerWidth;
            const newWidth = Math.min(800, Math.max(200, vw - e.clientX));
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
        if (!isResizingFooter) return;

        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ns-resize';

        const onMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const vh = window.innerHeight;
            const newHeight = Math.min(800, Math.max(40, vh - e.clientY));
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

    const handleOpenDescendantsTab = (node: any, isUserTree: boolean) => {
        const tabId = `descendants-${node.id}`;
        const existingTab = sidePanelTabs.find(tab => tab.id === tabId);

        if (!existingTab) {
            const newTab: SidePanelTab = {
                id: tabId,
                type: 'descendants',
                title: `Descendants of ${node.name}`,
                node: node,
                isUserTree: isUserTree,
                allowedTypes: TARGET_ALLOWED_TYPES
            };

            setSidePanelTabs(prev => [...prev, newTab]);
        }

        setActiveTabId(tabId);
        setSidePanelOpen(true);
        
        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const handleOpenAssociationTab = (node: any, selectedUserNode: any, selectedTargetNode: any, isUserTree: boolean) => {
        const tabId = `association-${node.id}-${Date.now()}`;
        const newTab: SidePanelTab = {
            id: tabId,
            type: 'association',
            title: `Associate with ${node.name}`,
            node: node,
            isUserTree: isUserTree,
            selectedUserNode: selectedUserNode,
            selectedTargetNode: selectedTargetNode
        };

        setSidePanelTabs(prev => [...prev, newTab]);
        setActiveTabId(tabId);
        setSidePanelOpen(true);

        // Automatically open the aside panel if it's closed
        if (!asideOpened) {
            toggleAside();
        }
    };

    const handleCloseTab = (tabId: string) => {
        setSidePanelTabs(prev => {
            const newTabs = prev.filter(tab => tab.id !== tabId);

            // If the closed tab was active, select the next available tab or null
            if (activeTabId === tabId) {
                const tabIndex = prev.findIndex(tab => tab.id === tabId);
                if (newTabs.length > 0) {
                    // Select the next tab, or the previous one if we closed the last tab
                    const nextIndex = tabIndex < newTabs.length ? tabIndex : newTabs.length - 1;
                    setActiveTabId(newTabs[nextIndex]?.id || null);
                } else {
                    setActiveTabId(null);
                }
            }

            return newTabs;
        });
    };

    const handleToggleSidePanel = () => {
        setSidePanelOpen(!sidePanelOpen);
    };

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 75,
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
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <PMIcon style={{width: '36px', height: '36px'}}/>
                        <Title order={2}>Policy Machine</Title>
                    </Group>

                    <Group>
                        <Tooltip label={desktopOpened ? "Hide Sidebar" : "Show Sidebar"}>
                            <ActionIcon
                                variant={desktopOpened ? "filled" : "subtle"}
                                size="md"
                                onClick={toggleDesktop}
                                color={theme.colors.blue[7]}
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

                        <UserMenu />
                    </Group>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="sm" style={{ height: '100vh', backgroundColor: '#f8f9fa' }} className={classes.navbar}>
                <NavBar activePageIndex={0} />
            </AppShell.Navbar>
            <AppShell.Main style={{ height: '100%', position: 'relative' }}>
                <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <PMTree
                        title="Policy Graph"
                        allowedTypes={TARGET_ALLOWED_TYPES}
                        nodeFunc={TargetTreeNode}
                        borderColor="var(--mantine-color-blue-7)"
                        hook={useTargetDynamicTree}
                        treeApiAtom={targetTreeApiAtom}
                        treeDataAtom={targetTreeDataAtom}
                        openTreeNodesAtom={targetOpenTreeNodesAtom}
                        onOpenDescendants={handleOpenDescendantsTab}
                        onOpenAssociation={handleOpenAssociationTab}
                    />
                </Box>
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
                        onSelectStart={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            top: 60,
                            right: asideWidth - 4,
                            width: 8,
                            height: `calc(100vh - ${footerOpened ? footerHeight : 0}px - 60px)`,
                            cursor: 'ew-resize',
                            zIndex: 2000,
                            background: showAsideResizer || isResizingAside ? theme.colors.blue[7] : 'transparent',
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
                        onSelectStart={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            left: 75,
                            bottom: footerHeight - 4,
                            width: '100vw',
                            height: 8,
                            cursor: 'ns-resize',
                            zIndex: 2000,
                            background: showFooterResizer || isResizingFooter ? theme.colors.blue[4] : 'transparent',
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

            <AppShell.Aside p="md" style={{ backgroundColor: '#f8f9fa' }}>
                <RightSidePanel
                    isOpen={true}
                    onToggle={handleToggleSidePanel}
                    tabs={sidePanelTabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onCloseTab={handleCloseTab}
                    embedded={true}
                />

            </AppShell.Aside>

            <AppShell.Footer style={{padding: '10px 10px 10px 80px', backgroundColor: '#f8f9fa'}}>
                <PMLEditor
                    title="PML Editor"
                    hideButtons={false}
                />
            </AppShell.Footer>
        </AppShell>
    );
}