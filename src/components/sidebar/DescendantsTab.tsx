import React, { useRef, useState, useEffect, useCallback } from 'react';
import {Stack, Text, Loader, Title} from '@mantine/core';
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
}

// Create local atoms for this tab's tree data
const createTabTreeAtom = (rootNode: TreeNode) => atom<TreeNode[]>([{
  ...rootNode,
  children: []
}]);

export function DescendantsTab({ rootNode, isUserTree, allowedTypes }: DescendantsTabProps) {
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  
  // Create tab-specific tree data atom
  const [treeDataAtom] = useState(() => createTabTreeAtom(rootNode));
  const [treeData] = useAtom(treeDataAtom);
  const { fetchAndUpdateChildren } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
  
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const treeApiRef = useRef<TreeApi<TreeNode> | null>(null);
  
  const { ref: sizeRef, width, height } = useElementSize();
  const mergedRef = useMergedRef(treeContainerRef, sizeRef);
  
  // Track if we've already initialized to prevent infinite loops
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Node renderer function for this tab
  const renderNode = useCallback((props: NodeRendererProps<any>) => {
    return PopupNode(props, allowedTypes, treeDataAtom, isUserTree, loadingNodes, setLoadingNodes);
  }, [allowedTypes, treeDataAtom, isUserTree, loadingNodes]);
  
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
      {/* Tree Container */}
      <div 
        ref={mergedRef} 
        style={{ 
          flex: 1, 
          overflow: 'hidden',
          backgroundColor: '#f8f9fa',
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
            />
        )}
      </div>
    </Stack>
  );
}