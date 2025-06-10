import { AppShell, SimpleGrid, Text } from '@mantine/core';
import { NavBar } from '@/components/navbar/NavBar';
import {PMTree, TARGET_ALLOWED_TYPES, USER_ALLOWED_TYPES} from '@/components/tree/PMTree';
import classes from './navbar.module.css';
import {
    targetOpenTreeNodesAtom,
    targetTreeApiAtom,
    targetTreeDataAtom,
    userOpenTreeNodesAtom,
    userTreeApiAtom,
    userTreeDataAtom
} from "@/components/tree/tree-atom";
import {TargetTreeNode, UserTreeNode} from "@/components/tree/PMNode";
import {useTargetDynamicTree, useUserDynamicTree} from "@/hooks/dynamic-tree";
import { UserMenu } from '@/components/UserMenu';

export function Graph() {
    return (
        <AppShell
            header={{ height: 0 }}
            navbar={{
                width: 75,
                breakpoint: 'sm',
            }}
            padding="md"
        >
            <AppShell.Navbar p="sm" style={{ height: '100vh' }} className={classes.navbar}>
                <NavBar activePageIndex={0} />
            </AppShell.Navbar>
            <AppShell.Main style={{ height: '100vh' }}>
                <UserMenu />
                <SimpleGrid cols={2} style={{ height: '99%' }}>
                    <PMTree
                        title="User"
                        allowedTypes={USER_ALLOWED_TYPES}
                        nodeFunc={UserTreeNode}
                        borderColor="var(--mantine-color-red-9)"
                        hook={useUserDynamicTree}
                        treeApiAtom={userTreeApiAtom}
                        treeDataAtom={userTreeDataAtom}
                        openTreeNodesAtom={userOpenTreeNodesAtom}
                    />

                    <PMTree
                        title="Target"
                        allowedTypes={TARGET_ALLOWED_TYPES}
                        nodeFunc={TargetTreeNode}
                        borderColor="var(--mantine-color-blue-9)"
                        hook={useTargetDynamicTree}
                        treeApiAtom={targetTreeApiAtom}
                        treeDataAtom={targetTreeDataAtom}
                        openTreeNodesAtom={targetOpenTreeNodesAtom}
                    />
                </SimpleGrid>
            </AppShell.Main>
        </AppShell>
    );
}