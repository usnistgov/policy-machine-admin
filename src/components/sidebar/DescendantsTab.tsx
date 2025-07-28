import React, { useRef, useState, useEffect, useCallback } from 'react';
import {Stack, Text, Loader, Title, Group, ActionIcon} from '@mantine/core';
import {IconX} from '@tabler/icons-react';
import { Tree, TreeApi, NodeRendererProps } from 'react-arborist';
import { useElementSize, useMergedRef } from '@mantine/hooks';
import { PrimitiveAtom, atom, useAtom } from 'jotai';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { useTreeOperations } from '@/components/tree/hooks/useTreeOperations';
import { PopupNode } from '@/components/tree/components';
import {INDENT_NUM, NodeIcon} from '@/components/tree/util';
import classes from '@/components/tree/pmtree.module.css';
import {PMIcon} from "@/components/icons/PMIcon";
import {PMTree, TARGET_ALLOWED_TYPES} from "@/components/tree/PMTree";
import {TargetTreeNode} from "@/components/tree/PMNode";
import {useTargetDynamicTree} from "@/hooks/dynamic-tree";
import {targetOpenTreeNodesAtom, targetTreeApiAtom, targetTreeDataAtom} from "@/components/tree/tree-atom";

interface DescendantsTabProps {
  rootNode: TreeNode;
  isUserTree: boolean;
  allowedTypes: NodeType[];
  onClose: () => void;
}

export function DescendantsTab({ rootNode, isUserTree, allowedTypes, onClose }: DescendantsTabProps) {
  /*const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  
  // Create tab-specific tree data atom using useRef to maintain stable reference
  const treeDataAtomRef = useRef<PrimitiveAtom<TreeNode[]>>();
  if (!treeDataAtomRef.current) {
    treeDataAtomRef.current = atom<TreeNode[]>([{
      ...rootNode,
      children: []
    }]);
  }
  const [treeData] = useAtom(treeDataAtomRef.current);
  const { fetchAndUpdateChildren } = useTreeOperations(treeDataAtomRef.current, allowedTypes, isUserTree);
  
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const treeApiRef = useRef<TreeApi<TreeNode> | null>(null);
  
  const { ref: sizeRef, width, height } = useElementSize();
  const mergedRef = useMergedRef(treeContainerRef, sizeRef);
  
  // Track if we've already initialized to prevent infinite loops
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Node renderer function for this tab
  const renderNode = useCallback((props: NodeRendererProps<any>) => {
    return PopupNode(props, allowedTypes, treeDataAtomRef.current!, isUserTree, loadingNodes, setLoadingNodes);
  }, [allowedTypes, isUserTree, loadingNodes]);
  
  // Automatically expand the root node and fetch its descendants
  useEffect(() => {
    if (hasInitialized) return;
    
    const expandRoot = async () => {
      const rootNodeData = treeData[0];
      if (rootNodeData && treeApiRef.current) {
        const rootNodeApi = treeApiRef.current.get(rootNodeData.id);
        if (rootNodeApi && !rootNodeApi.isOpen) {
          // Set loading state for root node
          setLoadingNodes(prev => new Set(prev).add(rootNodeData.id));
          
          try {
            // Fetch descendants for this node
            await fetchAndUpdateChildren(rootNodeApi, true); // true for descendant mode
            rootNodeApi.toggle();
            setHasInitialized(true); // Mark as initialized
          } finally {
            // Clear loading state for root node
            setLoadingNodes(prev => {
              const next = new Set(prev);
              next.delete(rootNodeData.id);
              return next;
            });
          }
        }
      }
    };

    // Delay to ensure tree is mounted
    setTimeout(expandRoot, 100);
  }, [fetchAndUpdateChildren, hasInitialized]);

  return (
    <Stack gap="sm" style={{ height: '100%', padding: '8px' }}>
      {/!* Tree Container *!/}
      <div 
        ref={mergedRef} 
        style={{ 
          flex: 1, 
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-gray-0)',
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '4px'
        }}
      >
        {width && height && (
            <PMTree
                allowedTypes={TARGET_ALLOWED_TYPES}
                nodeFunc={TargetTreeNode}
                borderColor="var(--mantine-color-blue-7)"
                hook={useTargetDynamicTree}
                treeApiAtom={targetTreeApiAtom}
                treeDataAtom={targetTreeDataAtom}
                openTreeNodesAtom={targetOpenTreeNodesAtom}
            />
        )}
      </div>
    </Stack>
  );*/
  return (
    <Stack gap="md" style={{ height: '100%' }}>
      {/* Header */}
      <Group justify="space-between" align="center" style={{ padding: '16px 16px 0 16px' }}>
        <Group gap="sm" align="center">
          <PMIcon style={{ width: '20px', height: '20px' }} />
          <Text fw={500} truncate style={{ maxWidth: '250px' }}>
            Descendants of {rootNode.name}
          </Text>
        </Group>
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={onClose}
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>

      {/* Content placeholder */}
      <Stack align="center" justify="center" style={{ flex: 1 }} gap="md">
        <Text c="dimmed" ta="center">
          Descendants functionality coming soon
        </Text>
      </Stack>
    </Stack>
  )
}