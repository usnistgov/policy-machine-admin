import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { atom, useAtom } from 'jotai';
import { NodeApi, NodeRendererProps, Tree, TreeApi } from 'react-arborist';
import { Alert, Button, Center, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    INDENT_NUM,
    transformNodesToTreeNodes,
    TreeNode,
} from '@/features/pmtree/tree-utils';
import { NodeType } from '@/shared/api/pdp.types';
import * as QueryService from '@/shared/api/pdp_query.api';
import { withCriticalRetry } from '@/lib/retry-utils';
import { TreeDirection, TreeFilterConfig } from './hooks/usePMTreeOperations';
import { PMNode } from './PMNode';
import { PMTreeToolbar } from './PMTreeToolbar';
import { FillFlexParent } from "./fill-flex-parent";
import "./pmtree.module.css";


export interface PMTreeClickHandlers {
    onLeftClick?: (node: TreeNode) => void;
    onRightClick?: (node: TreeNode, event: React.MouseEvent) => void;
    onDoubleClick?: (node: TreeNode) => void;
    onSelect?: (node: NodeApi<TreeNode>[]) => void;
}

export interface PMTreeProps {
    // Optional props
    rootNodes?: TreeNode[];
    direction?: TreeDirection;
    className?: string;
    style?: React.CSSProperties;
    filterConfig?: TreeFilterConfig;
    clickHandlers?: PMTreeClickHandlers;

    // Tree configuration
    disableDrag?: boolean;
    disableDrop?: boolean;
    disableEdit?: boolean;
    disableMultiSelection?: boolean;
    rowHeight?: number;
    overscanCount?: number;

    // Toolbar visibility controls
    showReset?: boolean;
    showCreatePolicyClass?: boolean;
    showTreeFilters?: boolean;
    showDirection?: boolean;
    onCreatePolicyClass?: () => void;

    // Custom toolbar sections
    leftToolbarSection?: React.ReactNode;
    rightToolbarSection?: React.ReactNode;
}

export function PMTree(props: PMTreeProps) {
    // Create internal atoms for this PMTree instance
    const treeApiAtom = useMemo(() => atom<TreeApi<TreeNode> | null>(null), []);
    const treeDataAtom = useMemo(() => atom<TreeNode[]>([]), []);
    const filterConfigAtom = useMemo(() => atom<TreeFilterConfig>(
        props.filterConfig || {
            nodeTypes: [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
            showOutgoingAssociations: true,
            showIncomingAssociations: true
        }
    ), []);

    const [treeData, setTreeData] = useAtom(treeDataAtom);
    const [treeApi, setTreeApi] = useAtom(treeApiAtom);
    const [filterConfigAtomValue, setFilterConfigAtom] = useAtom(filterConfigAtom);

    const treeApiRef = useRef<TreeApi<TreeNode>>();

    // Initial data loading
    const [posNodes, setPOSNodes] = useState<TreeNode[]>([]);
    const [initialError, setInitialError] = useState<string | null>(null);

    // Internal filter state
    const [internalFilters, setInternalFiltersState] = useState<TreeFilterConfig>(
        props.filterConfig || {
            nodeTypes: [NodeType.PC, NodeType.UA, NodeType.OA, NodeType.U, NodeType.O],
            showOutgoingAssociations: true,
            showIncomingAssociations: true,
        }
    );

    // Wrap setInternalFilters with immediate atom update
    const setInternalFilters = useCallback(
        (newFilters: TreeFilterConfig) => {
            setInternalFiltersState(newFilters);
            // Immediately update the filter config atom so PMNodes get the new config right away
            setFilterConfigAtom(newFilters);
        },
        [setFilterConfigAtom]
    );

    // Use external filterConfig if provided, otherwise use internal
    const activeFilterConfig = props.filterConfig || internalFilters;

    // Update the filterConfig atom whenever activeFilterConfig changes
    useEffect(() => {
        setFilterConfigAtom(activeFilterConfig);
    }, [activeFilterConfig, setFilterConfigAtom]);


    const loadPOSNodes = useCallback(async () => {
        if (props.rootNodes !== undefined) return;

        setInitialError(null);

        try {
            // Only load POS if no rootNodes prop is provided
            const response = await withCriticalRetry(() => QueryService.selfComputePersonalObjectSystem());
            // Extract nodes from the response and transform to TreeNode
            const nodes = response
                .map((nodePriv) => nodePriv.node)
                .filter((node): node is NonNullable<typeof node> => node !== undefined);

            const treeNodes = transformNodesToTreeNodes(nodes);
            setPOSNodes(treeNodes);
            // Initialize treeData with the loaded nodes
            setTreeData(treeNodes);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            setInitialError(errorMessage);

            notifications.show({
                color: 'red',
                title: 'Failed to Load Policy Data',
                message: errorMessage,
                icon: <IconAlertCircle size={16} />,
                autoClose: false,
            });
        }
    }, [props.rootNodes, setTreeData]);

    useEffect(() => {
        loadPOSNodes();
    }, [loadPOSNodes]);

    useEffect(() => {
        // Update tree data when rootNodes prop changes
        if (props.rootNodes !== undefined) {
            setTreeData(props.rootNodes);
        }
    }, [props.rootNodes, setTreeData]);

    // Callback ref to handle TreeApi assignment
    const handleTreeApiRef = useCallback(
        (api: TreeApi<TreeNode> | null | undefined) => {
            treeApiRef.current = api as TreeApi<TreeNode> | undefined;
            if (api) {
                setTreeApi(api);
            }
        },
        [setTreeApi]
    );

    // Internal nodeRenderer that creates PMNode with proper atoms and config
    const nodeRenderer = useCallback(
        (nodeProps: NodeRendererProps<TreeNode>) => {
            return (
                <PMNode
                    {...nodeProps}
                    direction={props.direction || 'ascendants'}
                    treeDataAtom={treeDataAtom}
                    filterConfigAtom={filterConfigAtom}
                    clickHandlers={props.clickHandlers}
                />
            );
        },
        [props.direction, treeDataAtom, filterConfigAtom, props.clickHandlers]
    );

    // Determine if toolbar should be shown (if any section is visible)
    const showReset = props.showReset ?? true;
    const showCreatePolicyClass = props.showCreatePolicyClass ?? false;
    const showTreeFilters = props.showTreeFilters ?? true;
    const showDirection = props.showDirection ?? true;
    const showAnyToolbar = showReset || showCreatePolicyClass || showTreeFilters || showDirection ||
        props.leftToolbarSection || props.rightToolbarSection;

    // Reset handler - reloads data and closes all nodes
    const handleReset = useCallback(() => {
        // Reload data
        if (props.rootNodes !== undefined) {
            // If using external rootNodes, just reset to original
            setTreeData(props.rootNodes);
        } else {
            // Reload POS nodes from server
            loadPOSNodes();
        }

        // Close all nodes in the tree
        treeApi?.closeAll();
    }, [props.rootNodes, setTreeData, loadPOSNodes, treeApi]);

    const internalToolbar = showAnyToolbar && (
        <PMTreeToolbar
            showReset={showReset}
            showCreatePolicyClass={showCreatePolicyClass}
            showTreeFilters={showTreeFilters}
            showDirection={showDirection}
            direction={props.direction || 'ascendants'}
            filters={internalFilters}
            onFiltersChange={setInternalFilters}
            onReset={handleReset}
            onCreatePolicyClass={props.onCreatePolicyClass}
            leftSection={props.leftToolbarSection}
            rightSection={props.rightToolbarSection}
        />
    );

    return (
        <>
            <div style={{
                height: '100%',
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{
                    flex: 1,
                    display: "flex",
                    minHeight: 0,
                    gap: "8px"
                }}>
                    <div style={{
                        display: "flex",
                        width: "100%",
                        flexDirection: "column",
                        fontFamily: "Roboto, system-ui",
                        minWidth: 0,
                    }}>
                        {internalToolbar}
                        <FillFlexParent>
                            {({ width, height }) => {
                                // Show error state with retry option
                                if (initialError && props.rootNodes === undefined) {
                                    return (
                                        <Center style={{ width, height }}>
                                            <Stack align="center" gap="md" maw={400}>
                                                <Alert
                                                    icon={<IconAlertCircle size={16} />}
                                                    title="Failed to Load Data"
                                                    color="red"
                                                    variant="light"
                                                >
                                                    {initialError}
                                                </Alert>
                                                <Button
                                                    leftSection={<IconRefresh size={16} />}
                                                    variant="light"
                                                    onClick={loadPOSNodes}
                                                >
                                                    Retry
                                                </Button>
                                            </Stack>
                                        </Center>
                                    );
                                }

                                return (
                                    <Tree
                                        ref={handleTreeApiRef}
                                        data={treeData}
                                        disableDrag={props.disableDrag ?? true}
                                        disableDrop={props.disableDrop ?? true}
                                        disableEdit={props.disableEdit ?? false}
                                        openByDefault={false}
                                        width={width}
                                        height={height}
                                        indent={INDENT_NUM}
                                        rowHeight={props.rowHeight ?? 22}
                                        overscanCount={props.overscanCount ?? 20}
                                        onSelect={props.clickHandlers?.onSelect}
                                        disableMultiSelection={props.disableMultiSelection ?? true}
                                    >
                                        {nodeRenderer}
                                    </Tree>
                                );
                            }}
                        </FillFlexParent>
                    </div>
                </div>
            </div>
        </>
    );
}