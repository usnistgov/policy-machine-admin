import React, { useState } from 'react';
import { ActionIcon, Menu, Loader, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { NodeRendererProps } from 'react-arborist';
import { PrimitiveAtom, useAtomValue, useSetAtom } from 'jotai';
import { NodeType, AdjudicationService } from '@/api/pdp.api';
import { selectedUserNodeAtom, selectedTargetNodeAtom } from '../tree-atoms';
import { TreeNode } from '@/utils/tree.utils';
import { INDENT_NUM, getTypeColor, NodeIcon, isValidAssignment, shouldShowExpansionIcon } from '../util';
import classes from '../pmtree.module.css';
import { useTreeOperations } from '../hooks/useTreeOperations';
import { NodeContent } from './';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconPoint, 
  IconEye, 
  IconPencil, 
  IconTrash, 
  IconArrowBigRight, 
  IconCircleX, 
  IconHandFinger 
} from "@tabler/icons-react";
import clsx from "clsx";

export function PopupNode(
  { node, style, tree }: NodeRendererProps<any>,
  allowedTypes: NodeType[],
  treeDataAtom: PrimitiveAtom<TreeNode[]>,
  isUserTree: boolean,
  loadingNodes: Set<string>,
  setLoadingNodes: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const { fetchAndUpdateChildren, descendantNodes } = useTreeOperations(treeDataAtom, allowedTypes, isUserTree);
  const setSelectedUserNode = useSetAtom(selectedUserNodeAtom);
  const setSelectedTargetNode = useSetAtom(selectedTargetNodeAtom);
  const selectedUserNode = useAtomValue(selectedUserNodeAtom);
  const selectedTargetNode = useAtomValue(selectedTargetNodeAtom);
  
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenuOpened, setContextMenuOpened] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
  // Check if this node is a descendant node
  const isDescendantNode = descendantNodes.has(node.data.id);
  const isLoading = loadingNodes.has(node.data.id);
  
  // Context menu logic (copied from PMNode but without Show Descendants)
  const color = getTypeColor(node.data.type);
  const isAssociation = node.data.properties?.isAssociation === 'true';
  
  // Show associate option for OA/O nodes in target tree when user node is selected
  const showAssociateOption = !isUserTree && 
    (node.data.type === 'OA' || node.data.type === 'O' || node.data.type === 'UA') && 
    selectedUserNode && 
    selectedUserNode.type === 'UA' && // UA can only be associated
    (node.data.type === 'UA' || node.data.type === 'OA') && // UA can associate with UA and OA
    !isAssociation;

  // Assignment logic - show assign option if there's a selected node from the same tree
  const selectedNodeForTree = isUserTree ? selectedUserNode : selectedTargetNode;
  const showAssignOption = selectedNodeForTree && 
    selectedNodeForTree.id !== node.data.id && 
    !isAssociation &&
    selectedNodeForTree.properties?.isAssociation !== 'true' && // Don't show assign for association nodes
    isValidAssignment(selectedNodeForTree.type, node.data.type) &&
    !node.data.children?.some((child: TreeNode) => child.id === selectedNodeForTree.id);

  // Deassignment logic - show deassign option if the right-clicked node has the selected node as a child
  const showDeassignOption = selectedNodeForTree && 
    selectedNodeForTree.id !== node.data.id &&
    node.data.children?.some((child: TreeNode) => child.id === selectedNodeForTree.id) &&
    !isAssociation &&
    selectedNodeForTree.properties?.isAssociation !== 'true'; // Don't show deassign for association nodes

  // Determine allowed node types for creation based on current node type
  const nodeType = node.data.type;
  let allowedNodeTypes: NodeType[] = [];
  const canCreateChildren = nodeType !== "O" && nodeType !== "U";
  
  if (canCreateChildren) {
    switch (nodeType) {
      case "PC": {
        allowedNodeTypes = [NodeType.UA, NodeType.OA, NodeType.O];
        break;
      }
      case "OA": {
        allowedNodeTypes = [NodeType.OA, NodeType.O];
        break;
      }
      case "UA": {
        allowedNodeTypes = [NodeType.UA, NodeType.U];
        break;
      }
    }
    
    // Filter out O and OA for user tree
    if (isUserTree) {
      allowedNodeTypes = allowedNodeTypes.filter(type => type !== NodeType.O && type !== NodeType.OA);
    }
  }

  // Context menu handlers
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    // Estimate menu height based on number of visible menu items
    const estimatedMenuHeight = 300; // Conservative estimate for menu height
    const margin = 10; // Safety margin from screen edges
    
    let x = e.pageX;
    let y = e.pageY;
    
    // Check if menu would go off-screen vertically
    if (y + estimatedMenuHeight > window.innerHeight - margin) {
      // Position menu above the click point
      y = Math.max(margin, y - estimatedMenuHeight);
    }
    
    // Check if menu would go off-screen horizontally
    const estimatedMenuWidth = 250; // Conservative estimate for menu width
    if (x + estimatedMenuWidth > window.innerWidth - margin) {
      // Position menu to the left of the click point
      x = Math.max(margin, x - estimatedMenuWidth);
    }
    
    setContextMenuPosition({ x, y });
    setContextMenuOpened(true);
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setContextMenuOpened(false);
    try {
      await AdjudicationService.deleteNode(node.data.pmId);
      tree.delete(node.data.id);
      notifications.show({
        title: 'Node Deleted',
        message: `Successfully deleted ${node.data.name}`,
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to delete node:', error);
      notifications.show({
        title: 'Delete Failed',
        message: `Failed to delete ${node.data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const handleSetProperties = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setContextMenuOpened(false);
    // This would typically open a dialog for property editing
    // For now, just log the action
    console.log(`Set properties for node: ${node.data.name} (${node.data.id})`);
  };

  const handleSelectNode = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setContextMenuOpened(false);
    // Select the node based on tree type
    if (isUserTree) {
      setSelectedUserNode(node.data);
    } else {
      setSelectedTargetNode(node.data);
    }
  };

  const handleNodeClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't allow click if already loading
    if (isLoading) return;
    
    // Check if the node is currently closed (about to be opened)
    const isExpanding = !node.isOpen;
    
    node.toggle();
    
    // Only fetch data if we're expanding the node
    if (isExpanding) {
      // Check if this is an association node
      const isAssociation = node.data.properties?.isAssociation === 'true';
      
      // Associations in descendants popup should show ascendants (regular direction)
      // Regular nodes in descendants popup should show descendants
      const shouldFetchDescendants = !isAssociation;
      
      // Set loading state
      setLoadingNodes(prev => new Set(prev).add(node.data.id));
      
      try {
        await fetchAndUpdateChildren(node, shouldFetchDescendants);
      } finally {
        // Clear loading state
        setLoadingNodes(prev => {
          const next = new Set(prev);
          next.delete(node.data.id);
          return next;
        });
      }
    }
  };

  return (
    <div 
      style={style} 
      className={clsx(
        classes.node, 
        node.state,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleNodeClick}
      onContextMenu={handleContextMenu}
    >
      <ActionIcon
        size={25}
        variant="transparent"
        style={{marginRight: '0'}}
        c="black"
      >
        {isLoading ? (
          <Loader size={16} />
        ) : shouldShowExpansionIcon(node.data) ? (
          node.isOpen ? (
            <IconChevronDown stroke={2} size={18}/>
          ) : (
            <IconChevronRight stroke={2} size={18}/>
          )
        ) : (
          <IconPoint stroke={2} size={18}/>
        )}
      </ActionIcon>

      <NodeContent 
        node={node} 
        isUserTree={isUserTree} 
        isDescendantNode={isDescendantNode}
      />

      <Menu 
        opened={contextMenuOpened} 
        onClose={() => setContextMenuOpened(false)}
        position="bottom-start"
        shadow="md"
        withinPortal
        styles={{
          dropdown: {
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 9999
          }
        }}
      >
        <Menu.Target>
          <div style={{ display: 'none' }} />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item 
            leftSection={<IconHandFinger size={16} />}
            onClick={(e) => handleSelectNode(e)}
          >
            Select
          </Menu.Item>
          {isAssociation ? (
            // Association nodes: only show View and Delete
            <>
              <Menu.Divider />
              <Menu.Item 
                leftSection={<IconEye size={16} />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenuOpened(false);
                  console.log('View association:', node.data);
                }}
              >
                View
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size={16} />}
                onClick={(e) => handleDelete(e)}
                color="red"
              >
                Delete
              </Menu.Item>
            </>
          ) :
            // Non-association nodes: show regular menu (but NO Show Descendants)
            <>
              {canCreateChildren && allowedNodeTypes.length > 0 && (
                <>
                  <Menu.Divider />
                  <Menu.Label>Create</Menu.Label>
                  {allowedNodeTypes.map((nodeType) => (
                    <Menu.Item 
                      key={nodeType}
                      leftSection={<NodeIcon size="20px" fontSize="16px" type={nodeType} />}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenuOpened(false);
                        console.log('Create node:', nodeType);
                      }}
                    >
                    </Menu.Item>
                  ))}
                </>
              )}
              <Menu.Divider />
              <Menu.Label>Update</Menu.Label>
              <Menu.Item 
                leftSection={<IconPencil size={16} />}
                onClick={(e) => handleSetProperties(e)}
              >
                Set Properties
              </Menu.Item>
              <Menu.Item 
                leftSection={<IconTrash size={16} />}
                onClick={(e) => handleDelete(e)}
                color="red"
              >
                Delete Node
              </Menu.Item>
            </>
          }
        </Menu.Dropdown>
      </Menu>
    </div>
  );
}