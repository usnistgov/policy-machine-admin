import React, { useState } from 'react';
import {
  Box,
  Button,
  Group,
  Table,
  Text,
  Badge,
  Stack,
  ActionIcon,
  useMantineTheme,
  useMantineColorScheme,
  Title
} from '@mantine/core';
import {
  IconPlus,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons-react';
import { TreeNode } from '@/utils/tree.utils';
import { Association } from '@/components/sidebar/hooks/useAssociations';
import { AccessRightsPanel } from '@/components/sidebar/AccessRightsPanel';
import { NodeIcon } from '@/components/pmtree/tree-utils';

interface SimpleAssociationTableProps {
  associations: Association[];
  selectedNode: TreeNode;
  direction: 'source' | 'target'; // source = left tree shows outgoing, target = right tree shows incoming
  onCreateAssociation: (targetNodeId: string, resourceRights: string[], adminRights: string[]) => Promise<void>;
  onUpdateAssociation: (association: Association, resourceRights: string[], adminRights: string[]) => Promise<void>;
  onDeleteAssociation: (association: Association) => Promise<void>;
  availableResourceRights: string[];
  adminAccessRights: string[];
  targetNode?: TreeNode | null; // Pre-selected target for creation
  isCreating?: boolean;
  onStartCreation?: () => void;
  onCancelCreation?: () => void;
}

export function SimpleAssociationTable({
  associations,
  selectedNode,
  direction,
  onCreateAssociation,
  onUpdateAssociation,
  onDeleteAssociation,
  availableResourceRights,
  adminAccessRights,
  targetNode,
  isCreating = false,
  onStartCreation,
  onCancelCreation
}: SimpleAssociationTableProps) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [expandedAssociation, setExpandedAssociation] = useState<string | null>(null);
  const [editingResourceRights, setEditingResourceRights] = useState<string[]>([]);
  const [editingAdminRights, setEditingAdminRights] = useState<string[]>([]);
  const [creationResourceRights, setCreationResourceRights] = useState<string[]>([]);
  const [creationAdminRights, setCreationAdminRights] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleRowClick = (associationId: string, association: Association) => {
    if (expandedAssociation === associationId) {
      setExpandedAssociation(null);
      setEditingResourceRights([]);
      setEditingAdminRights([]);
    } else {
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
      prev.includes(right) ? prev.filter(r => r !== right) : [...prev, right]
    );
  };

  const handleAdminRightToggle = (right: string) => {
    setEditingAdminRights(prev =>
      prev.includes(right) ? prev.filter(r => r !== right) : [...prev, right]
    );
  };

  const handleCreationResourceRightToggle = (right: string) => {
    setCreationResourceRights(prev =>
      prev.includes(right) ? prev.filter(r => r !== right) : [...prev, right]
    );
  };

  const handleCreationAdminRightToggle = (right: string) => {
    setCreationAdminRights(prev =>
      prev.includes(right) ? prev.filter(r => r !== right) : [...prev, right]
    );
  };

  const handleUpdate = async (association: Association) => {
    await onUpdateAssociation(association, editingResourceRights, editingAdminRights);
    setExpandedAssociation(null);
    setEditingResourceRights([]);
    setEditingAdminRights([]);
  };

  const handleDelete = async (association: Association) => {
    await onDeleteAssociation(association);
    setExpandedAssociation(null);
    setEditingResourceRights([]);
    setEditingAdminRights([]);
  };

  const handleCreate = async () => {
    if (!targetNode?.pmId) return;
    
    setCreating(true);
    try {
      await onCreateAssociation(targetNode.pmId, creationResourceRights, creationAdminRights);
      setCreationResourceRights([]);
      setCreationAdminRights([]);
    } finally {
      setCreating(false);
    }
  };

  const renderAccessRights = (accessRights: string[]) => {
    if (accessRights.length === 0) {
      return <Text size="xs" c="dimmed">No rights</Text>;
    }

    const displayRights = accessRights.slice(0, 3);
    const hasMore = accessRights.length > 3;

    return (
      <Stack gap="xs">
        {displayRights.map((right, index) => (
          <Badge key={index} size="xs" variant="light">
            {right}
          </Badge>
        ))}
        {hasMore && (
          <Text size="xs" c="dimmed">
            +{accessRights.length - 3} more
          </Text>
        )}
      </Stack>
    );
  };

  const renderDetailRow = (association: Association) => {
    return (
      <Table.Tr>
        <Table.Td colSpan={2} style={{ padding: 0, backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0] }}>
          <Box style={{ 
            height: '300px',
            display: 'flex', 
            flexDirection: 'column',
            padding: '16px 24px 16px 16px'
          }}>
            <Box style={{ 
              flex: 1, 
              overflow: 'auto',
              marginBottom: '12px'
            }}>
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
            </Box>
            
            <Group justify="flex-end" gap="xs">
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
        </Table.Td>
      </Table.Tr>
    );
  };

  const renderCreationRow = () => {
    if (!isCreating) return null;

    return (
      <React.Fragment key="creation-row">
        <Table.Tr>
          <Table.Td>
            <Group gap="xs" align="center">
              <ActionIcon size="xs" variant="transparent">
                <IconChevronDown size={14} />
              </ActionIcon>
              {targetNode ? (
                <>
                  <NodeIcon type={targetNode.type} size="18px" fontSize="12px" />
                  <Text size="sm" fw={500}>{targetNode.name}</Text>
                </>
              ) : (
                <Text size="sm" c="dimmed" fs="italic">Select node from opposite tree</Text>
              )}
            </Group>
          </Table.Td>
          <Table.Td>
            <Text size="xs" c="dimmed">New association</Text>
          </Table.Td>
        </Table.Tr>
        <Table.Tr>
          <Table.Td colSpan={2} style={{ padding: 0, backgroundColor: colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0] }}>
            <Box style={{ 
              height: '300px',
              display: 'flex', 
              flexDirection: 'column',
              padding: '16px 24px 16px 16px'
            }}>
              <Box style={{ 
                flex: 1, 
                overflow: 'auto',
                marginBottom: '12px'
              }}>
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
              </Box>
              
              <Group justify="flex-end" gap="xs">
                <Button
                  size="xs"
                  variant="outline" 
                  onClick={onCancelCreation}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  onClick={handleCreate}
                  loading={creating}
                  disabled={!targetNode}
                >
                  Create
                </Button>
              </Group>
            </Box>
          </Table.Td>
        </Table.Tr>
      </React.Fragment>
    );
  };

  const columnTitle = direction === 'source' ? 'Target' : 'Source';
  const getOtherNode = (association: Association) => 
    direction === 'source' ? association.targetNode : association.sourceNode;

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" align="center" mb="sm">
        <Title order={5}>
          {direction === 'source' ? 'Source' : 'Target'} Associations
        </Title>
        <Button
          size="xs"
          leftSection={<IconPlus size={12} />}
          onClick={onStartCreation}
          disabled={direction === 'source' && selectedNode.type !== 'UA'} // Only UA can be source
        >
          Create
        </Button>
      </Group>
      
      <Box
        style={{
          border: `1px solid ${colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          borderRadius: '4px',
          overflow: 'auto',
          flex: 1,
          minHeight: 0
        }}
      >
        <Table striped highlightOnHover size="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{columnTitle}</Table.Th>
              <Table.Th>Access Rights</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {renderCreationRow()}
            {associations.length === 0 && !isCreating ? (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text size="sm" c="dimmed" ta="center">
                    No {direction} associations
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              associations.map((association) => {
                const otherNode = getOtherNode(association);
                const associationId = `${direction}-${otherNode.id}`;
                const isExpanded = expandedAssociation === associationId;
                
                return (
                  <React.Fragment key={otherNode.id}>
                    <Table.Tr 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(associationId, association)}
                    >
                      <Table.Td>
                        <Group gap="xs" align="center">
                          <ActionIcon size="xs" variant="transparent">
                            {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                          </ActionIcon>
                          <NodeIcon type={otherNode.type} size="18px" fontSize="12px" />
                          <Text size="sm">{otherNode.name}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {renderAccessRights(association.accessRights)}
                      </Table.Td>
                    </Table.Tr>
                    {isExpanded && renderDetailRow(association)}
                  </React.Fragment>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Box>
    </Box>
  );
}