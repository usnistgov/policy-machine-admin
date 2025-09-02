import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Stack,
  Group,
  Title,
  Button,
  Accordion,
  Switch,
  Box,
  Text,
  TextInput,
  useMantineTheme,
  LoadingOverlay, 
  ActionIcon,
  Tooltip,
  Loader
} from '@mantine/core';
import {
  IconPlus,
  IconRefresh,
  IconChevronRight,
  IconChevronDown,
  IconPoint,
  IconSquareRoundedPlus
} from '@tabler/icons-react';
import { useTheme } from '@/contexts/ThemeContext';
import { QueryService, AdjudicationService, NodeType, PMNode } from '@/api/pdp.api';
import { atom, useAtom, PrimitiveAtom } from 'jotai';
import { Tree, TreeApi, NodeRendererProps } from 'react-arborist';
import { TreeNode, transformNodesToTreeNodes, sortTreeNodes } from '@/utils/tree.utils';
import { NodeIcon, updateNodeChildren, shouldShowExpansionIcon } from '@/components/pmtree/tree-utils';
import { useElementSize } from '@mantine/hooks';
import { useAssociations, Association } from '@/components/sidebar/hooks/useAssociations';
import { SimpleAssociationTable } from './SimpleAssociationTable';

interface PolicyClass {
  id: string;
  name: string;
  isEditing: boolean;
  pmId?: string;
}

interface AttrNodeProps extends NodeRendererProps<TreeNode> {
  onCreateChild: (parentNode: TreeNode) => void;
  onCreateNode: (name: string, parentNode: TreeNode, nodeType: NodeType) => Promise<void>;
  treeType: 'UA' | 'OA';
  userTreeNodes: TreeNode[];
  objectTreeNodes: TreeNode[];
  setUserTreeNodes: React.Dispatch<React.SetStateAction<TreeNode[]>>;
  setObjectTreeNodes: React.Dispatch<React.SetStateAction<TreeNode[]>>;
  onNodeSelect?: (node: TreeNode) => void;
  selectedNode?: TreeNode | null;
}

function AttrNodeRenderer({ 
  node, 
  tree, 
  style, 
  onCreateChild, 
  onCreateNode, 
  treeType,
  userTreeNodes,
  objectTreeNodes,
  setUserTreeNodes,
  setObjectTreeNodes,
  onNodeSelect,
  selectedNode
}: AttrNodeProps) {
  const { themeMode } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isAnonymousNode = !node.data.pmId && !node.data.name;
  const [isEditing, setIsEditing] = useState(isAnonymousNode);
  const [editingName, setEditingName] = useState(node.data.name);

  const handleCreateChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateChild(node.data);
  };

  const handleNodeNameSubmit = async () => {
    if (editingName.trim()) {
      if (isAnonymousNode) {
        // For anonymous nodes, we need to find the parent
        const parent = node.parent?.data;
        await onCreateNode(editingName.trim(), parent || node.data, treeType as NodeType);
      }
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNodeNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(node.data.name);
      setIsEditing(false);
      if (isAnonymousNode) {
        // Remove anonymous node on escape
        // This will be handled by the parent component
      }
    }
  };

  const clearNodeChildren = (nodeId: string, currentTreeNodes: TreeNode[], setTreeNodes: React.Dispatch<React.SetStateAction<TreeNode[]>>) => {
    const updatedTreeData = updateNodeChildren(currentTreeNodes, nodeId, []);
    setTreeNodes(updatedTreeData);
  };

  const fetchAndUpdateChildren = async () => {
    if (!node.data.pmId || isLoading) return;

    setIsLoading(true);
    try {
      // Fetch ascendant privileges for this node
      const response = await QueryService.selfComputeAdjacentAscendantPrivileges(node.data.pmId);
      
      // Extract and filter nodes
      let nodes = response
        .map(nodePriv => nodePriv.node)
        .filter((node): node is NonNullable<typeof node> => node !== undefined);
      
      // Filter by node type if needed
      const nodeTypeFilter = treeType === 'UA' ? [NodeType.UA] : [NodeType.OA];
      nodes = nodes.filter(node => nodeTypeFilter.includes(node.type));
      
      // Transform to tree nodes
      const childrenTree = transformNodesToTreeNodes(nodes, node.data.id);
      const sorted = sortTreeNodes(childrenTree);

      console.log(`Expanding node ${node.data.name} (${node.data.id}), found ${sorted.length} children`);

      // Update the appropriate tree data
      if (treeType === 'UA') {
        const updatedTreeData = updateNodeChildren(userTreeNodes, node.data.id, sorted);
        setUserTreeNodes(updatedTreeData);
        console.log('Updated UA tree data:', updatedTreeData);
      } else {
        const updatedTreeData = updateNodeChildren(objectTreeNodes, node.data.id, sorted);
        setObjectTreeNodes(updatedTreeData);
        console.log('Updated OA tree data:', updatedTreeData);
      }
    } catch (error) {
      console.error('Failed to fetch node children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpansionClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnonymousNode || isLoading) return;

    // Check if the node is currently open (about to be closed)
    const isClosing = node.isOpen;

    // If closing, clear children to prevent flash effect
    if (isClosing) {
      if (treeType === 'UA') {
        clearNodeChildren(node.data.id, userTreeNodes, setUserTreeNodes);
      } else {
        clearNodeChildren(node.data.id, objectTreeNodes, setObjectTreeNodes);
      }
    }

    node.toggle();

    // If opening, fetch children
    if (!isClosing) {
      await fetchAndUpdateChildren();
    }
  };


  const isSelected = selectedNode?.id === node.data.id;

  const handleNodeClick = () => {
    if (!isAnonymousNode && onNodeSelect) {
      onNodeSelect(node.data);
    }
  };

  return (
    <div
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: isSelected ? 
            (themeMode === 'dark' ? 'rgba(74, 144, 226, 0.3)' : 'rgba(74, 144, 226, 0.2)') :
            (isHovered ? 
              (themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 
              'transparent'),
          cursor: 'pointer',
          height: '100%'
        }}
        onClick={handleNodeClick}
      >
      <ActionIcon
        size={20}
        variant="transparent"
        style={{ marginRight: '4px' }}
        onClick={handleExpansionClick}
      >
        {isLoading ? (
          <Loader size={16} />
        ) : shouldShowExpansionIcon(node.data) && !isAnonymousNode ? (
          node.isOpen ? (
            <IconChevronDown
              stroke={2}
              size={16}
              color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
            />
          ) : (
            <IconChevronRight
              stroke={2}
              size={16}
              color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
            />
          )
        ) : (
          <IconPoint
            stroke={2}
            size={16}
            color={themeMode === 'dark' ? 'var(--mantine-color-gray-4)' : 'var(--mantine-color-gray-9)'}
          />
        )}
      </ActionIcon>

      <NodeIcon
        type={node.data.type}
        size="20px"
        fontSize="14px"
      />
      
      {isEditing ? (
        <TextInput
          value={editingName}
          onChange={(e) => setEditingName(e.currentTarget.value)}
          onKeyDown={handleKeyPress}
          onBlur={handleNodeNameSubmit}
          size="s"
          autoFocus
          style={{ flex: 1 }}
        />
      ) : (
        <Text size="md" style={{ userSelect: 'none', marginLeft: '5px', fontWeight: isSelected ? 600 : 400 }}>
          {node.data.name}
        </Text>
      )}

      {isHovered && !isEditing && !isAnonymousNode && (
        <Tooltip label="Create child node">
          <ActionIcon
            style={{
                marginLeft: '5px'
            }}
            size={22}
            onClick={handleCreateChild}
          >
            <IconPlus />
          </ActionIcon>
        </Tooltip>
      )}
      </div>
    </div>
  );
}

// Create a map to store stable atoms for each policy class
const policyClassAtoms = new Map<string, {
  userTreeAtom: PrimitiveAtom<TreeNode[]>;
  userTreeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
  objectTreeAtom: PrimitiveAtom<TreeNode[]>;
  objectTreeApiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>;
}>();

// Helper function to get or create atoms for a policy class
function getOrCreateAtomsForPolicyClass(policyClassId: string) {
  if (!policyClassAtoms.has(policyClassId)) {
    policyClassAtoms.set(policyClassId, {
      userTreeAtom: atom<TreeNode[]>([]),
      userTreeApiAtom: atom<TreeApi<TreeNode> | null>(null),
      objectTreeAtom: atom<TreeNode[]>([]),
      objectTreeApiAtom: atom<TreeApi<TreeNode> | null>(null),
    });
  }
  return policyClassAtoms.get(policyClassId)!;
}

export function AttributeHierarchy() {
  const mantineTheme = useMantineTheme();
  const { themeMode } = useTheme();
  const [policyClasses, setPolicyClasses] = useState<PolicyClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load policy classes on mount
  useEffect(() => {
    loadPolicyClasses();
  }, []);

  const loadPolicyClasses = async () => {
    try {
      setIsLoading(true);
      // Use the proper getPolicyClasses method from QueryService
      const pcNodes = await QueryService.getPolicyClasses();
      
      console.log('Policy classes response:', pcNodes);
      
      // Transform API response to PolicyClass format
      const policyClassData: PolicyClass[] = pcNodes.map((pc, index) => ({
        id: `pc${index + 1}`,
        name: pc.name,
        isEditing: false,
        pmId: pc.id,
      }));

      setPolicyClasses(policyClassData);
    } catch (error) {
      console.error('Failed to load policy classes:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Component that renders the two trees for a policy class with isolated atoms
  const PolicyClassTrees: React.FC<{
    policyClass: PolicyClass;
  }> = ({ policyClass }) => {
    const atoms = useMemo(() => getOrCreateAtomsForPolicyClass(policyClass.id), [policyClass.id]);
    const [userTreeNodes, setUserTreeNodes] = useState<TreeNode[]>([]);
    const [objectTreeNodes, setObjectTreeNodes] = useState<TreeNode[]>([]);
    const [showObjectAttributes, setShowObjectAttributes] = useState(true);
    const [selectedLeftNode, setSelectedLeftNode] = useState<TreeNode | null>(null);
    const [selectedRightNode, setSelectedRightNode] = useState<TreeNode | null>(null);
    const [leftCreatingAssociation, setLeftCreatingAssociation] = useState(false);
    const [rightCreatingAssociation, setRightCreatingAssociation] = useState(false);
    const [leftTargetNode, setLeftTargetNode] = useState<TreeNode | null>(null);
    const [rightTargetNode, setRightTargetNode] = useState<TreeNode | null>(null);
    const userTreeRef = useRef<TreeApi<TreeNode>>(null);
    const objectTreeRef = useRef<TreeApi<TreeNode>>(null);
    const { ref: userTreeSizeRef, width: userTreeWidth, height: userTreeHeight } = useElementSize();
    const { ref: objectTreeSizeRef, width: objectTreeWidth, height: objectTreeHeight } = useElementSize();

    // Association hooks for selected nodes (only when nodes are selected)
    const leftAssociations = useAssociations({ 
      node: selectedLeftNode || { id: 'dummy-left', pmId: '', name: '', type: NodeType.UA, children: [] } 
    });
    const rightAssociations = useAssociations({ 
      node: selectedRightNode || { id: 'dummy-right', pmId: '', name: '', type: NodeType.OA, children: [] } 
    });

    // Auto-load data when policy class changes or mounts  
    useEffect(() => {
      const loadTreeData = async () => {
        if (!policyClass.pmId) return;
        
        try {
          // Load only direct ascendants (children) of the policy class
          const response = await QueryService.selfComputeAdjacentAscendantPrivileges(policyClass.pmId);
          
          const nodes = response
            .map(nodePriv => nodePriv.node)
            .filter((node): node is PMNode => node !== undefined);
            
          const uaNodes = nodes.filter(node => node.type === NodeType.UA);
          const oaNodes = nodes.filter(node => node.type === NodeType.OA);

          // Transform to tree nodes (these will be root nodes in our trees)
          const userTreeData = transformNodesToTreeNodes(uaNodes);
          const objectTreeData = transformNodesToTreeNodes(oaNodes);

          setUserTreeNodes(userTreeData);
          setObjectTreeNodes(objectTreeData);
          
          console.log(`Loaded ${policyClass.name}: ${userTreeData.length} user, ${objectTreeData.length} object nodes`);
        } catch (error) {
          console.error(`Failed to load tree data for ${policyClass.name}:`, error);
        }
      };

      loadTreeData();
    }, [policyClass.pmId, policyClass.id]);

    // Handler for starting association creation from left panel
    const handleStartLeftAssociationCreation = useCallback(() => {
      setLeftCreatingAssociation(true);
      // Auto-select from the right tree if available
      if (selectedRightNode) {
        setLeftTargetNode(selectedRightNode);
      } else {
        setLeftTargetNode(null);
      }
    }, [selectedRightNode]);

    // Handler for starting association creation from right panel
    const handleStartRightAssociationCreation = useCallback(() => {
      setRightCreatingAssociation(true);
      // Auto-select from the left tree if available
      if (selectedLeftNode) {
        setRightTargetNode(selectedLeftNode);
      } else {
        setRightTargetNode(null);
      }
    }, [selectedLeftNode]);

    // Handler for creating association from left panel (source to target)
    const handleLeftCreateAssociation = useCallback(async (
      targetNodeId: string,
      resourceRights: string[],
      adminRights: string[]
    ) => {
      if (!selectedLeftNode?.pmId) throw new Error('Source node missing PM ID');
      
      try {
        const allRights = [...resourceRights, ...adminRights];
        await AdjudicationService.associate(selectedLeftNode.pmId, targetNodeId, allRights);

        // Refresh associations
        leftAssociations.loadAssociations();
        rightAssociations.loadAssociations();
        
        // Clear creation mode
        setLeftCreatingAssociation(false);
        setLeftTargetNode(null);
      } catch (error) {
        console.error('Failed to create association:', error);
        throw error;
      }
    }, [selectedLeftNode, leftAssociations, rightAssociations]);

    // Handler for creating association from right panel (source to target)
    const handleRightCreateAssociation = useCallback(async (
      sourceNodeId: string,
      resourceRights: string[],
      adminRights: string[]
    ) => {
      if (!selectedRightNode?.pmId) throw new Error('Target node missing PM ID');
      
      try {
        const allRights = [...resourceRights, ...adminRights];
        await AdjudicationService.associate(sourceNodeId, selectedRightNode.pmId, allRights);

        // Refresh associations
        leftAssociations.loadAssociations();
        rightAssociations.loadAssociations();
        
        // Clear creation mode
        setRightCreatingAssociation(false);
        setRightTargetNode(null);
      } catch (error) {
        console.error('Failed to create association:', error);
        throw error;
      }
    }, [selectedRightNode, leftAssociations, rightAssociations]);

    // Handler for canceling association creation
    const handleCancelLeftCreation = useCallback(() => {
      setLeftCreatingAssociation(false);
      setLeftTargetNode(null);
    }, []);

    const handleCancelRightCreation = useCallback(() => {
      setRightCreatingAssociation(false);
      setRightTargetNode(null);
    }, []);

    const handleCreateChild = useCallback((parentNode: TreeNode) => {
      const treeApi = parentNode.type === NodeType.UA ? userTreeRef.current : objectTreeRef.current;
      if (!treeApi) return;

      // Expand parent if collapsed
      const parentTreeNode = treeApi.get(parentNode.id);
      if (parentTreeNode && !parentTreeNode.isOpen) {
        parentTreeNode.open();
      }

      // Create an anonymous node at the beginning of children
      const anonNodeId = `anon_${Date.now()}`;
      const anonNode: TreeNode = {
        id: anonNodeId,
        pmId: '',
        name: '',
        type: parentNode.type,
        properties: {},
        children: []
      };

      // Update tree data to include the new anonymous node
      const updateTreeNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map(node => {
          if (node.id === parentNode.id) {
            return {
              ...node,
              children: [anonNode, ...(node.children || [])]
            };
          } else if (node.children) {
            return {
              ...node,
              children: updateTreeNodes(node.children)
            };
          }
          return node;
        });
      };

      if (parentNode.type === NodeType.UA) {
        setUserTreeNodes(prev => updateTreeNodes(prev));
      } else {
        setObjectTreeNodes(prev => updateTreeNodes(prev));
      }
    }, []);

    const handleCreateRootNode = useCallback((nodeType: 'UA' | 'OA') => {
      if (!policyClass.pmId) return;

      const treeApi = nodeType === 'UA' ? userTreeRef.current : objectTreeRef.current;
      if (!treeApi) return;

      // Create an anonymous node at the beginning of root nodes
      const anonNodeId = `anon_${Date.now()}`;
      const anonNode: TreeNode = {
        id: anonNodeId,
        pmId: '',
        name: '',
        type: nodeType as NodeType,
        properties: {},
        children: []
      };

      if (nodeType === 'UA') {
        setUserTreeNodes(prev => [anonNode, ...prev]);
      } else {
        setObjectTreeNodes(prev => [anonNode, ...prev]);
      }
    }, [policyClass.pmId]);

    const handleCreateNode = useCallback(async (name: string, parentNode: TreeNode, nodeType: NodeType) => {
      if (!policyClass.pmId || !name.trim()) return;

      try {
        // Create the node via API
        let response;
        const descendants = parentNode.pmId ? [parentNode.pmId] : [policyClass.pmId];
        
        if (nodeType === NodeType.UA) {
          response = await AdjudicationService.createUserAttribute(name, descendants);
        } else if (nodeType === NodeType.OA) {
          response = await AdjudicationService.createObjectAttribute(name, descendants);
        } else {
          throw new Error(`Unsupported node type: ${nodeType}`);
        }
        
        // Extract the node ID from the response (assuming it returns the created node ID)
        // We'll need to fetch the node details or construct them
        const newNode = {
          id: name, // Temporary - in real implementation you'd get this from response
          name: name,
          type: nodeType,
          properties: {}
        };

        // Remove the anonymous node and add the actual node
        const replaceAnonNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.map(node => {
            if (node.name === '' && node.pmId === '') {
              // This is our anonymous node, replace it
              return {
                id: `${policyClass.id}_${nodeType.toLowerCase()}_${newNode.id}_${Date.now()}`,
                pmId: newNode.id,
                name: newNode.name,
                type: newNode.type,
                properties: newNode.properties,
                children: []
              };
            } else if (node.children) {
              return {
                ...node,
                children: replaceAnonNode(node.children)
              };
            }
            return node;
          });
        };

        if (nodeType === NodeType.UA) {
          setUserTreeNodes(prev => replaceAnonNode(prev));
        } else {
          setObjectTreeNodes(prev => replaceAnonNode(prev));
        }
      } catch (error) {
        console.error('Failed to create node:', error);
        // Remove the anonymous node on error
        const removeAnonNode = (nodes: TreeNode[]): TreeNode[] => {
          return nodes.filter(node => !(node.name === '' && node.pmId === '')).map(node => ({
            ...node,
            children: node.children ? removeAnonNode(node.children) : []
          }));
        };

        if (nodeType === NodeType.UA) {
          setUserTreeNodes(prev => removeAnonNode(prev));
        } else {
          setObjectTreeNodes(prev => removeAnonNode(prev));
        }
      }
    }, [policyClass.pmId, policyClass.id]);


    return (
      <Group align="flex-start" gap="lg" grow>
        <Stack style={{ minHeight: 360, flex: 1 }} gap="md">
          <Box>
            <Group gap="sm" align="center" mb="md">
              <NodeIcon type="UA" size="24px" fontSize="16px" />
              <Title order={5}>User Attributes</Title>
              <Tooltip label="Create root UA node">
                <ActionIcon
                  style={{
                    marginLeft: '10px'
                  }}
                  size={22}
                  onClick={() => handleCreateRootNode('UA')}
                  disabled={!policyClass.pmId}
                >
                  <IconPlus />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Box 
              ref={userTreeSizeRef}
              style={{
                height: 300,
                borderRadius: mantineTheme.radius.md,
                backgroundColor: themeMode === 'dark' ? mantineTheme.colors.dark[7] : mantineTheme.colors.gray[0],
              }}
            >
              {policyClass.pmId && userTreeWidth > 0 && userTreeHeight > 0 ? (
                <Tree
                  ref={userTreeRef}
                  data={userTreeNodes}
                  width={userTreeWidth}
                  height={userTreeHeight}
                  disableDrag
                  disableDrop
                  openByDefault={false}
                  rowHeight={28}
                  indent={20}
                >
                  {(props) => (
                    <AttrNodeRenderer
                      {...props}
                      onCreateChild={handleCreateChild}
                      onCreateNode={handleCreateNode}
                      treeType="UA"
                      userTreeNodes={userTreeNodes}
                      objectTreeNodes={objectTreeNodes}
                      setUserTreeNodes={setUserTreeNodes}
                      setObjectTreeNodes={setObjectTreeNodes}
                      onNodeSelect={setSelectedLeftNode}
                      selectedNode={selectedLeftNode}
                    />
                  )}
                </Tree>
              ) : (
                <Text>Loading...</Text>
              )}
            </Box>
          </Box>

          {/* Source Associations for selected left node */}
          {selectedLeftNode && (
            <Box style={{ height: '400px' }}>
              <SimpleAssociationTable
                associations={leftAssociations.sourceAssociations}
                selectedNode={selectedLeftNode}
                direction="source"
                onCreateAssociation={handleLeftCreateAssociation}
                onUpdateAssociation={leftAssociations.updateAssociation}
                onDeleteAssociation={leftAssociations.deleteAssociation}
                availableResourceRights={leftAssociations.availableResourceRights}
                adminAccessRights={leftAssociations.adminAccessRights}
                targetNode={leftTargetNode}
                isCreating={leftCreatingAssociation}
                onStartCreation={handleStartLeftAssociationCreation}
                onCancelCreation={handleCancelLeftCreation}
              />
            </Box>
          )}
        </Stack>

        <Stack style={{ minHeight: 360, flex: 1 }} gap="md">
          <Box>
            <Group align="center" mb="md">
              <NodeIcon type={showObjectAttributes ? "OA" : "UA"} size="24px" fontSize="16px" />
              <Title order={5}>
                {showObjectAttributes ? "Object Attributes" : "User Attributes"}
              </Title>
              <Tooltip label="Create root node">
                <ActionIcon
                  style={{
                    marginLeft: '10px'
                  }}
                  size={22}
                  onClick={() => handleCreateRootNode(showObjectAttributes ? 'OA' : 'UA')}
                  disabled={!policyClass.pmId}
                >
                  <IconPlus />
                </ActionIcon>
              </Tooltip>
              <Group gap="xs" style={{ marginLeft: 'auto' }}>
                <ActionIcon
                  variant={!showObjectAttributes ? "outline" : "subtle"}
                  size="md"
                  onClick={() => setShowObjectAttributes(false)}
                >
                  <NodeIcon type="UA" size="20px" fontSize="14px" />
                </ActionIcon>
                <ActionIcon
                  variant={showObjectAttributes ? "outline" : "subtle"}
                  size="md"
                  onClick={() => setShowObjectAttributes(true)}
                >
                  <NodeIcon type="OA" size="20px" fontSize="14px" />
                </ActionIcon>
              </Group>
            </Group>
            <Box 
              ref={objectTreeSizeRef}
              style={{
                height: 300,
                borderRadius: mantineTheme.radius.md,
                backgroundColor: themeMode === 'dark' ? mantineTheme.colors.dark[7] : mantineTheme.colors.gray[0],
              }}
            >
              {policyClass.pmId && objectTreeWidth > 0 && objectTreeHeight > 0 ? (
                <Tree
                  ref={objectTreeRef}
                  data={showObjectAttributes ? objectTreeNodes : userTreeNodes}
                  width={objectTreeWidth}
                  height={objectTreeHeight}
                  disableDrag
                  disableDrop
                  disableMultiSelection
                  openByDefault={false}
                  rowHeight={28}
                  indent={28}
                >
                  {(props) => (
                    <AttrNodeRenderer
                      {...props}
                      onCreateChild={handleCreateChild}
                      onCreateNode={handleCreateNode}
                      treeType={showObjectAttributes ? 'OA' : 'UA'}
                      userTreeNodes={userTreeNodes}
                      objectTreeNodes={objectTreeNodes}
                      setUserTreeNodes={setUserTreeNodes}
                      setObjectTreeNodes={setObjectTreeNodes}
                      onNodeSelect={setSelectedRightNode}
                      selectedNode={selectedRightNode}
                    />
                  )}
                </Tree>
              ) : (
                <Text>Loading...</Text>
              )}
            </Box>
          </Box>

          {/* Target Associations for selected right node */}
          {selectedRightNode && (
            <Box style={{ height: '400px' }}>
              <SimpleAssociationTable
                associations={rightAssociations.targetAssociations}
                selectedNode={selectedRightNode}
                direction="target"
                onCreateAssociation={handleRightCreateAssociation}
                onUpdateAssociation={rightAssociations.updateAssociation}
                onDeleteAssociation={rightAssociations.deleteAssociation}
                availableResourceRights={rightAssociations.availableResourceRights}
                adminAccessRights={rightAssociations.adminAccessRights}
                targetNode={rightTargetNode}
                isCreating={rightCreatingAssociation}
                onStartCreation={handleStartRightAssociationCreation}
                onCancelCreation={handleCancelRightCreation}
              />
            </Box>
          )}
        </Stack>
      </Group>
    );
  };

  const refreshPolicyClass = useCallback(async (policyClass: PolicyClass) => {
    if (!policyClass.pmId) return;

    try {
      // Force a re-render by updating the policy class object
      setPolicyClasses(prev => prev.map(pc =>
        pc.id === policyClass.id
          ? { ...pc, isEditing: false } // Trigger re-render
          : pc
      ));
      console.log(`Refreshing policy class ${policyClass.name}`);
    } catch (error) {
      console.error(`Failed to refresh policy class ${policyClass.name}:`, error);
    }
  }, []);

  const addPolicyClass = useCallback(async () => {
    const newId = `pc${policyClasses.length + 1}`;
    const newName = '';
    const newPC: PolicyClass = {
      id: newId,
      name: newName,
      isEditing: true,
    };
    setPolicyClasses([...policyClasses, newPC]);
  }, [policyClasses]);

  const updatePolicyClassName = useCallback(async (id: string, newName: string) => {
    setPolicyClasses(prev => prev.map(pc => {
      if (pc.id === id) {
        const updatedPc = { ...pc, name: newName, isEditing: false };
        // If this is a new policy class, create it via API
        if (!pc.pmId && newName.trim()) {
          AdjudicationService.createPolicyClass(newName.trim())
            .then(async (response) => {
              console.log('Policy class created:', response);
              // Update the specific policy class with the new pmId instead of reloading all
              setPolicyClasses(current => current.map(currentPc => 
                currentPc.id === id 
                  ? { ...currentPc, pmId: newName.trim(), name: newName.trim() } // Use name as temporary pmId until we get proper ID
                  : currentPc
              ));
            })
            .catch(error => {
              console.error('Failed to create policy class:', error);
              // Remove the failed policy class from the list
              setPolicyClasses(current => current.filter(currentPc => currentPc.id !== id));
            });
        }
        return updatedPc;
      }
      return pc;
    }));
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent, id: string, value: string) => {
    if (event.key === 'Enter') {
      if (value.trim()) {
        updatePolicyClassName(id, value.trim());
      } else {
        // Remove empty policy class
        setPolicyClasses(prev => prev.filter(pc => pc.id !== id));
      }
    }
  }, [updatePolicyClassName]);


  return (
    <Stack pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Group justify="space-between" align="center">
        <Title order={3}>Policy Classes</Title>
        <Button
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={addPolicyClass}
        >
          Add Policy Class
        </Button>
      </Group>

      <Accordion
        multiple
        variant="default"
        transitionDuration={150}
        styles={{
          item: {
            border: '1px solid',
            borderColor: themeMode === 'dark' ? mantineTheme.colors.dark[4] : mantineTheme.colors.gray[3],
            borderRadius: mantineTheme.radius.md,
            backgroundColor: themeMode === 'dark' ? mantineTheme.colors.dark[6] : mantineTheme.white,
            marginBottom: mantineTheme.spacing.sm,
            boxShadow: mantineTheme.shadows.sm,
          },
          control: {
            padding: mantineTheme.spacing.md,
          },
          panel: {
            padding: `${mantineTheme.spacing.sm} ${mantineTheme.spacing.md}`,
          }
        }}
      >
        {policyClasses.map((pc) => (
          <Accordion.Item key={pc.id} value={pc.id}>
            <Accordion.Control>
              <Group justify="space-between" align="center" style={{ width: '100%' }}>
                {pc.isEditing ? (
                  <TextInput
                    defaultValue={pc.name}
                    placeholder="Enter policy class name..."
                    onKeyDown={(event) => handleKeyPress(event, pc.id, event.currentTarget.value)}
                    onBlur={(event) => {
                      if (event.target.value.trim()) {
                        updatePolicyClassName(pc.id, event.target.value.trim());
                      } else {
                        setPolicyClasses(prev => prev.filter(p => p.id !== pc.id));
                      }
                    }}
                    autoFocus
                    size="sm"
                    variant="unstyled"
                    styles={{
                      input: {
                        fontWeight: 500,
                        fontSize: 'var(--mantine-font-size-sm)'
                      }
                    }}
                  />
                ) : (
                  <Group justify="space-between" align="center" style={{ width: '100%' }}>
                    <Group gap="sm" align="center">
                      <NodeIcon type="PC" size="20px" fontSize="16px" />
                      <Title order={4}>{pc.name}</Title>
                    </Group>
                  </Group>
                )}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <PolicyClassTrees
                policyClass={pc}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}