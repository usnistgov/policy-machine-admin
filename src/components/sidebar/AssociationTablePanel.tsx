import React, { useState } from 'react';
import {
  IconPlus,
  IconChevronDown,
  IconArrowUp,
  IconArrowDown,
  IconChevronRight
} from '@tabler/icons-react';
import { Box, Button, Group, Table, Tabs, Text, Badge, Stack, ActionIcon, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { TreeNode } from '@/utils/tree.utils';
import { Association } from './hooks/useAssociations';
import { AccessRightsPanel } from './AccessRightsPanel';
import { atom } from 'jotai';
import { TreeApi } from 'react-arborist';
import {NodeIcon} from "@/components/pmtree/tree-utils";
import {PMTree} from "@/components/pmtree";

interface AssociationTablePanelProps {
  sourceAssociations: Association[];
  targetAssociations: Association[];
  hasSourceAssociations: boolean;
  onCreateNewAssociation: (isOutgoing: boolean) => void;
  onUpdateAssociation: (association: Association, resourceRights: string[], adminRights: string[]) => void;
  onDeleteAssociation: (association: Association) => void;
  selectedNodeFromMainTree?: any | null;
  maxAccessRightsDisplay?: number; // How many access rights to show before truncating
  availableResourceRights: string[];
  adminAccessRights: string[];
  // Creation mode props
  isCreatingAssociation?: boolean;
  creationMode?: 'outgoing' | 'incoming' | null;
  currentNode?: TreeNode;
  onCreateAssociation?: (isOutgoing: boolean, targetNodeId: string, resourceRights: string[], adminRights: string[]) => Promise<void>;
  onCancelCreation?: () => void;
}

export function AssociationTablePanel({
  sourceAssociations,
  targetAssociations,
  hasSourceAssociations,
  onCreateNewAssociation,
  onUpdateAssociation,
  onDeleteAssociation,
  selectedNodeFromMainTree,
  maxAccessRightsDisplay = 3,
  availableResourceRights,
  adminAccessRights,
  isCreatingAssociation = false,
  creationMode = null,
  currentNode,
  onCreateAssociation,
  onCancelCreation,
}: AssociationTablePanelProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [activeTab, setActiveTab] = useState<string | null>('incoming');
  const [expandedAssociation, setExpandedAssociation] = useState<string | null>(null);
  const [isCreationFormExpanded, setIsCreationFormExpanded] = useState(false);
  
  // Separate state for editing existing associations
  const [editingResourceRights, setEditingResourceRights] = useState<string[]>([]);
  const [editingAdminRights, setEditingAdminRights] = useState<string[]>([]);
  
  // Separate state for creating new associations
  const [creationResourceRights, setCreationResourceRights] = useState<string[]>([]);
  const [creationAdminRights, setCreationAdminRights] = useState<string[]>([]);
  
  const [treeDirection, setTreeDirection] = useState<'descendants' | 'ascendants'>('ascendants');
  const [creating, setCreating] = useState(false);


  // Effect to expand creation form when creation mode starts
  React.useEffect(() => {
    if (isCreatingAssociation && creationMode) {
      setIsCreationFormExpanded(true);
      // Clear any expanded association when starting creation
      setExpandedAssociation(null);
      // Clear editing rights when another association might be open
      setEditingResourceRights([]);
      setEditingAdminRights([]);
      // Always start creation with empty rights
      setCreationResourceRights([]);
      setCreationAdminRights([]);
    } else if (!isCreatingAssociation) {
      setIsCreationFormExpanded(false);
      // Clear creation rights when exiting creation mode
      setCreationResourceRights([]);
      setCreationAdminRights([]);
    }
  }, [isCreatingAssociation, creationMode]);

  const handleRowClick = (associationId: string, association: Association) => {
    if (expandedAssociation === associationId) {
      // Collapse if already expanded
      setExpandedAssociation(null);
      // Clear editing rights when collapsing
      setEditingResourceRights([]);
      setEditingAdminRights([]);
    } else {
      // Expand and initialize editing rights (only affects editing, not creation)
      setExpandedAssociation(associationId);
      const resourceRights = association.accessRights.filter(right =>
        availableResourceRights.includes(right)
      );
      const adminRights = association.accessRights.filter(right =>
        adminAccessRights.includes(right)
      );
      setEditingResourceRights(resourceRights);
      setEditingAdminRights(adminRights);
    }
  };

  // Handlers for editing existing associations
  const handleResourceRightToggle = (right: string) => {
    setEditingResourceRights(prev =>
      prev.includes(right)
        ? prev.filter(r => r !== right)
        : [...prev, right]
    );
  };

  const handleAdminRightToggle = (right: string) => {
    setEditingAdminRights(prev =>
      prev.includes(right)
        ? prev.filter(r => r !== right)
        : [...prev, right]
    );
  };

  // Handlers for creating new associations
  const handleCreationResourceRightToggle = (right: string) => {
    setCreationResourceRights(prev =>
      prev.includes(right)
        ? prev.filter(r => r !== right)
        : [...prev, right]
    );
  };

  const handleCreationAdminRightToggle = (right: string) => {
    setCreationAdminRights(prev =>
      prev.includes(right)
        ? prev.filter(r => r !== right)
        : [...prev, right]
    );
  };

  const handleUpdate = (association: Association) => {
    onUpdateAssociation(association, editingResourceRights, editingAdminRights);
    setExpandedAssociation(null);
    // Clear editing rights after update
    setEditingResourceRights([]);
    setEditingAdminRights([]);
  };

  const handleDelete = (association: Association) => {
    onDeleteAssociation(association);
    setExpandedAssociation(null);
    // Clear editing rights after delete
    setEditingResourceRights([]);
    setEditingAdminRights([]);
  };

  const handleCreate = async () => {
    if (!onCreateAssociation || !creationMode || !selectedNodeFromMainTree || !currentNode) {return;}
    
    setCreating(true);
    try {
      const isOutgoing = creationMode === 'outgoing';
      const targetNodeId = selectedNodeFromMainTree.pmId || selectedNodeFromMainTree.id;
      await onCreateAssociation(isOutgoing, targetNodeId, creationResourceRights, creationAdminRights);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelCreation = () => {
    onCancelCreation?.();
    // Clear creation rights when canceling creation
    setCreationResourceRights([]);
    setCreationAdminRights([]);
  };

  const renderAccessRights = (accessRights: string[]) => {
    if (accessRights.length === 0) {
      return <Text size="xs" c="dimmed">No rights</Text>;
    }

    const displayRights = accessRights.slice(0, maxAccessRightsDisplay);
    const hasMore = accessRights.length > maxAccessRightsDisplay;

    return (
      <Stack gap="xs">
        {displayRights.map((right, index) => (
          <Badge key={index} size="xs" variant="light">
            {right}
          </Badge>
        ))}
        {hasMore && (
          <Text size="xs" c="dimmed">
            +{accessRights.length - maxAccessRightsDisplay} more
          </Text>
        )}
      </Stack>
    );
  };

  const renderCreationDetail = () => {
    // Create local atoms for this specific creation detail
    const treeApiAtom = atom<TreeApi<TreeNode> | null>(null);
    const treeDataAtom = atom<TreeNode[]>([]);

    return (
    <Table.Tr>
      <Table.Td colSpan={2} style={{ padding: 0 }}>
        <Box style={{ 
          height: '400px', 
          overflow: 'hidden', 
          display: 'flex',
          borderRadius: '4px'
        }}>
          {/* Left side - Tree view or selection message */}
          <Box style={{ flex: '1', padding: '16px', borderRight: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!selectedNodeFromMainTree ? (
              <Box style={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <Stack align="center" gap="sm">
                  <Text size="md" fw={500} c="dimmed">
                    Select a node from the main tree
                  </Text>
                  <Text size="sm" c="dimmed">
                    Right-click on a node and select "Associate with" to choose the {creationMode === 'outgoing' ? 'target' : 'source'} node
                  </Text>
                </Stack>
              </Box>
            ) : (
              <>
                <Group mb="md" justify="space-between" align="center">
                  <Group gap="xs">
                    <ActionIcon
                      size="sm"
                      variant={treeDirection === 'ascendants' ? 'filled' : 'subtle'}
                      onClick={() => setTreeDirection('ascendants')}
                      title="Show Ascendants"
                    >
                      <IconArrowUp size={12} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant={treeDirection === 'descendants' ? 'filled' : 'subtle'}
                      onClick={() => setTreeDirection('descendants')}
                      title="Show Descendants"
                    >
                      <IconArrowDown size={12} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Box style={{ 
                  flex: 1,
                  border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <PMTree
                    treeApiAtom={treeApiAtom}
                    treeDataAtom={treeDataAtom}
                    rootNode={selectedNodeFromMainTree}
                    direction={treeDirection}
                    headerHeight={0}
                    footerHeight={0}
                    footerOpened={false}
                    disableDrag
                    disableDrop
                    disableEdit
                    disableMultiSelection
                    rowHeight={24}
                    overscanCount={5}
                    style={{ height: '100%', width: '100%' }}
                  />
                </Box>
              </>
            )}
          </Box>
          
          {/* Right side - Access Rights */}
          <Box style={{ flex: '1', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <AccessRightsPanel
                availableResourceRights={availableResourceRights}
                adminAccessRights={adminAccessRights}
                selectedResourceRights={creationResourceRights}
                selectedAdminRights={creationAdminRights}
                onResourceRightToggle={handleCreationResourceRightToggle}
                onAdminRightToggle={handleCreationAdminRightToggle}
                onClearResourceRights={() => setCreationResourceRights([])}
                onClearAdminRights={() => setCreationAdminRights([])}
              />
            </div>
            
            <Group justify="flex-end" mt="md" gap="xs">
              <Button
                size="xs"
                variant="outline" 
                onClick={handleCancelCreation}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleCreate}
                loading={creating}
                disabled={!selectedNodeFromMainTree}
              >
                Create
              </Button>
            </Group>
          </Box>
        </Box>
      </Table.Td>
    </Table.Tr>
    );
  };

  const renderInlineDetail = (association: Association) => {
    // For outgoing associations, show target as root. For incoming, show source as root.
    const rootNode = activeTab === 'outgoing' ? association.targetNode : association.sourceNode;
    
    // Create local atoms for this specific association detail
    const treeApiAtom = atom<TreeApi<TreeNode> | null>(null);
    const treeDataAtom = atom<TreeNode[]>([]);
    
    return (
      <Table.Tr>
        <Table.Td colSpan={2} style={{ padding: 0, backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0] }}>
          <Box style={{ height: '400px', overflow: 'hidden', display: 'flex' }}>
            {/* Left side - Tree view */}
            <Box style={{ flex: '1', padding: '16px', borderRight: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Group mb="md" justify="space-between" align="center">
                <Group gap="xs">
                  <ActionIcon
                    size="sm"
                    variant={treeDirection === 'ascendants' ? 'filled' : 'subtle'}
                    onClick={() => setTreeDirection('ascendants')}
                    title="Show Ascendants"
                  >
                    <IconArrowUp size={12} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant={treeDirection === 'descendants' ? 'filled' : 'subtle'}
                    onClick={() => setTreeDirection('descendants')}
                    title="Show Descendants"
                  >
                    <IconArrowDown size={12} />
                  </ActionIcon>
                </Group>
              </Group>
              <Box style={{ 
                flex: 1,
                border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <PMTree
                  treeApiAtom={treeApiAtom}
                  treeDataAtom={treeDataAtom}
                  rootNode={rootNode}
                  direction={treeDirection}
                  headerHeight={0}
                  footerHeight={0}
                  footerOpened={false}
                  disableDrag
                  disableDrop
                  disableEdit
                  disableMultiSelection
                  rowHeight={24}
                  overscanCount={5}
                  style={{ height: '100%', width: '100%' }}
                />
              </Box>
            </Box>
            
            {/* Right side - Access Rights */}
            <Box style={{ flex: '1', padding: '16px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto' }}>
              <AccessRightsPanel
                availableResourceRights={availableResourceRights}
                adminAccessRights={adminAccessRights}
                selectedResourceRights={editingResourceRights}
                selectedAdminRights={editingAdminRights}
                onResourceRightToggle={handleResourceRightToggle}
                onAdminRightToggle={handleAdminRightToggle}
                onClearResourceRights={() => setEditingResourceRights([])}
                onClearAdminRights={() => setEditingAdminRights([])}
              />
            </div>
            
            <Group justify="flex-end" mt="md" gap="xs">
              <Button
                size="xs"
                variant="outline" 
                onClick={() => handleUpdate(association)}
              >
                Update
              </Button>
              <Button
                size="xs"
                color="red"
                variant="outline"
                onClick={() => handleDelete(association)}
              >
                Delete
              </Button>
            </Group>
          </Box>
        </Box>
      </Table.Td>
    </Table.Tr>
    );
  };

  const renderCreationRow = (mode: 'outgoing' | 'incoming') => {
    if (!isCreatingAssociation || creationMode !== mode) {return null;}

    const sourceNode = mode === 'outgoing' ? currentNode : selectedNodeFromMainTree;
    const targetNode = mode === 'outgoing' ? selectedNodeFromMainTree : currentNode;
    const displayNode = mode === 'outgoing' ? targetNode : sourceNode;
    
    return (
      <React.Fragment key="creation-row">
        <Table.Tr >
          <Table.Td>
            <Group gap="xs" align="center">
              <ActionIcon size="xs" variant="transparent">
                {isCreationFormExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
              </ActionIcon>
              {displayNode ? (
                <>
                  <NodeIcon type={displayNode.type} size="16px" fontSize="16px" />
                  <Text size="sm" fw={500}>{displayNode.name}</Text>
                </>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">Select node from main tree</Text>
              )}
            </Group>
          </Table.Td>
          <Table.Td>
            <Text size="xs" c="dimmed">New association</Text>
          </Table.Td>
        </Table.Tr>
        {isCreationFormExpanded && renderCreationDetail()}
      </React.Fragment>
    );
  };

  const renderOutgoingTable = () => (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Target</Table.Th>
          <Table.Th>Access Rights</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {renderCreationRow('outgoing')}
        {sourceAssociations.length === 0 && !isCreatingAssociation ? (
          <Table.Tr>
            <Table.Td colSpan={2}>
              <Text size="sm" c="dimmed" ta="center">No outgoing associations</Text>
            </Table.Td>
          </Table.Tr>
        ) : (
          sourceAssociations.map((association) => {
            const associationId = `outgoing-${association.targetNode.id}`;
            const isExpanded = expandedAssociation === associationId;
            
            return (
              <React.Fragment key={association.targetNode.id}>
                <Table.Tr 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(associationId, association)}
                >
                  <Table.Td>
                    <Group gap="xs" align="center">
                      <ActionIcon size="xs" variant="transparent">
                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </ActionIcon>
                      <NodeIcon type={association.targetNode.type} size="16px" fontSize="16px" />
                      <Text size="sm">{association.targetNode.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {renderAccessRights(association.accessRights)}
                  </Table.Td>
                </Table.Tr>
                {isExpanded && renderInlineDetail(association)}
              </React.Fragment>
            );
          })
        )}
      </Table.Tbody>
    </Table>
  );

  const renderIncomingTable = () => (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Source</Table.Th>
          <Table.Th>Access Rights</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {renderCreationRow('incoming')}
        {targetAssociations.length === 0 && !isCreatingAssociation ? (
          <Table.Tr>
            <Table.Td colSpan={2}>
              <Text size="sm" c="dimmed" ta="center">No incoming associations</Text>
            </Table.Td>
          </Table.Tr>
        ) : (
          targetAssociations.map((association) => {
            const associationId = `incoming-${association.sourceNode.id}`;
            const isExpanded = expandedAssociation === associationId;
            
            return (
              <React.Fragment key={association.sourceNode.id}>
                <Table.Tr 
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleRowClick(associationId, association)}
                >
                  <Table.Td>
                    <Group gap="xs" align="center">
                      <ActionIcon size="xs" variant="transparent">
                        {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                      </ActionIcon>
                      <NodeIcon type={association.sourceNode.type} size="16px" fontSize="16px" />
                      <Text size="sm">{association.sourceNode.name}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {renderAccessRights(association.accessRights)}
                  </Table.Td>
                </Table.Tr>
                {isExpanded && renderInlineDetail(association)}
              </React.Fragment>
            );
          })
        )}
      </Table.Tbody>
    </Table>
  );

  return (
    <Box style={{ flex: '1', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Tabs.List mb="sm">
          <Tabs.Tab value="incoming">
            Incoming ({targetAssociations.length})
          </Tabs.Tab>
          {hasSourceAssociations && (
            <Tabs.Tab value="outgoing">
              Outgoing ({sourceAssociations.length})
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="outgoing" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Group justify="flex-end" align="center" mb="xs">
            <Button
              size="xs"
              leftSection={<IconPlus size={12} />}
              onClick={() => onCreateNewAssociation(true)}
              disabled={!hasSourceAssociations}
            >
              New
            </Button>
          </Group>
          <Box
            style={{
              flex: 1,
              border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {renderOutgoingTable()}
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="incoming" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Group justify="flex-end" align="center" mb="xs">
            <Button
              size="xs"
              leftSection={<IconPlus size={12} />}
              onClick={() => onCreateNewAssociation(false)}
            >
              New
            </Button>
          </Group>
          <Box
            style={{
              flex: 1,
              border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {renderIncomingTable()}
          </Box>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}