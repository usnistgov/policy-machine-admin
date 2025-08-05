import React, { useState, useEffect } from 'react';
import {
  IconPlus,
  IconChevronDown,
  IconChevronUp,
  IconTree,
  IconArrowUp,
  IconArrowDown,
  IconChevronRight
} from '@tabler/icons-react';
import { Box, Button, Group, Table, Tabs, Text, Badge, Stack, ActionIcon, Divider, useMantineTheme, useMantineColorScheme } from '@mantine/core';
import { TreeNode } from '@/utils/tree.utils';
import { Association } from '../hooks/useAssociations';
import { NodeIcon } from '@/components/tree/util';
import { AccessRightsPanel } from './AccessRightsPanel';
import { PPMTree } from '@/components/ppmtree3';
import { atom } from 'jotai';
import { TreeApi } from 'react-arborist';

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
  const [editingResourceRights, setEditingResourceRights] = useState<string[]>([]);
  const [editingAdminRights, setEditingAdminRights] = useState<string[]>([]);
  const [treeDirection, setTreeDirection] = useState<'descendants' | 'ascendants'>('ascendants');
  const [creating, setCreating] = useState(false);

  // Create atoms for the tree view of the expanded association
  const [detailTreeApiAtom] = useState(() => atom<TreeApi<TreeNode> | null>(null));
  const [detailTreeDataAtom] = useState(() => atom<TreeNode[]>([]));

  // Effect to expand creation row when creation mode starts
  React.useEffect(() => {
    if (isCreatingAssociation && creationMode) {
      const creationId = `creation-${creationMode}`;
      setExpandedAssociation(creationId);
      setEditingResourceRights([]);
      setEditingAdminRights([]);
    } else if (!isCreatingAssociation) {
      // Clear creation expansion when not creating
      if (expandedAssociation?.startsWith('creation-')) {
        setExpandedAssociation(null);
      }
    }
  }, [isCreatingAssociation, creationMode]);

  const handleRowClick = (associationId: string, association: Association) => {
    if (expandedAssociation === associationId) {
      // Collapse if already expanded
      setExpandedAssociation(null);
    } else {
      // Expand and initialize editing rights
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

  const handleUpdate = (association: Association) => {
    onUpdateAssociation(association, editingResourceRights, editingAdminRights);
    setExpandedAssociation(null);
  };

  const handleDelete = (association: Association) => {
    onDeleteAssociation(association);
    setExpandedAssociation(null);
  };

  const handleCreate = async () => {
    if (!onCreateAssociation || !creationMode || !selectedNodeFromMainTree || !currentNode) return;
    
    setCreating(true);
    try {
      const isOutgoing = creationMode === 'outgoing';
      const targetNodeId = selectedNodeFromMainTree.pmId || selectedNodeFromMainTree.id;
      await onCreateAssociation(isOutgoing, targetNodeId, editingResourceRights, editingAdminRights);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelCreation = () => {
    onCancelCreation?.();
    setExpandedAssociation(null);
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

  const renderCreationDetail = () => (
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
                  <PPMTree
                    treeApiAtom={detailTreeApiAtom}
                    treeDataAtom={detailTreeDataAtom}
                    rootNode={selectedNodeFromMainTree}
                    direction={treeDirection}
                    headerHeight={0}
                    footerHeight={0}
                    footerOpened={false}
                    disableDrag={true}
                    disableDrop={true}
                    disableEdit={true}
                    disableMultiSelection={true}
                    rowHeight={24}
                    overscanCount={5}
                    clickHandlers={{
                      onLeftClick: (node: TreeNode) => {
                        console.log('Tree node clicked:', node);
                      },
                      onRightClick: undefined,
                    }}
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

  const renderInlineDetail = (association: Association) => (
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
              <PPMTree
                treeApiAtom={detailTreeApiAtom}
                treeDataAtom={detailTreeDataAtom}
                rootNode={association.targetNode} // Start from the target node
                direction={treeDirection}
                headerHeight={0}
                footerHeight={0}
                footerOpened={false}
                disableDrag={true}
                disableDrop={true}
                disableEdit={true}
                disableMultiSelection={true}
                rowHeight={24}
                overscanCount={5}
                clickHandlers={{
                  onLeftClick: (node: TreeNode) => {
                    console.log('Tree node clicked:', node);
                  },
                  onRightClick: undefined, // Disable right-click
                }}
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

  const renderCreationRow = (mode: 'outgoing' | 'incoming') => {
    if (!isCreatingAssociation || creationMode !== mode) return null;
    
    const creationId = `creation-${mode}`;
    const isExpanded = expandedAssociation === creationId;
    
    const sourceNode = mode === 'outgoing' ? currentNode : selectedNodeFromMainTree;
    const targetNode = mode === 'outgoing' ? selectedNodeFromMainTree : currentNode;
    const displayNode = mode === 'outgoing' ? targetNode : sourceNode;
    
    return (
      <React.Fragment key="creation-row">
        <Table.Tr >
          <Table.Td>
            <Group gap="xs" align="center">
              <ActionIcon size="xs" variant="transparent">
                {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
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
        {isExpanded && renderCreationDetail()}
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