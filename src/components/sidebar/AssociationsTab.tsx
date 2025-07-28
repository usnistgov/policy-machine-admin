import React, { useState, useEffect } from 'react';
import { Stack, Text, Group, Button, Alert, ScrollArea, ActionIcon, Divider, Badge, Card, Title, Switch, Box, SimpleGrid, Checkbox } from '@mantine/core';
import { IconX, IconEye, IconPlus, IconChevronDown, IconChevronRight, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { TreeNode } from '@/utils/tree.utils';
import { NodeIcon } from '@/components/tree/util';
import { NodeType, QueryService, AdjudicationService } from '@/api/pdp.api';
import { PPMTree } from '@/components/ppmtree3';
import { atom, PrimitiveAtom } from 'jotai';
import { TreeApi } from 'react-arborist';

interface Association {
  id: string;
  sourceNode: TreeNode;
  targetNode: TreeNode;
  accessRights: string[];
}

interface AssociationsTabProps {
  node: TreeNode;
  onClose: () => void;
}

export function AssociationsTab({ node, onClose }: AssociationsTabProps) {
  const [sourceAssociations, setSourceAssociations] = useState<Association[]>([]);
  const [targetAssociations, setTargetAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAssociation, setExpandedAssociation] = useState<string | null>(null);
  const [showDescendants, setShowDescendants] = useState<Record<string, boolean>>({});
  const [availableResourceRights, setAvailableResourceRights] = useState<string[]>([]);
  const [editingRights, setEditingRights] = useState<Record<string, { resourceRights: string[], adminRights: string[] }>>({});
  const [treeAtoms, setTreeAtoms] = useState<Record<string, { apiAtom: PrimitiveAtom<TreeApi<TreeNode> | null>, dataAtom: PrimitiveAtom<TreeNode[]> }>>({});

  const hasSourceAssociations = node.type === NodeType.UA;

  // Admin access rights organized by sections (from AdminAccessRights.java)
  const adminAccessRightsSections = {
    wildcard: [
      '*',       
      '*a',         
      '*r',       
      '*a:graph', 
      '*a:prohibition', 
      '*a:obligation',  
      '*a:operation',   
      '*a:routine',     
      '*q',       
      '*q:graph', 
      '*q:prohibition', 
      '*q:obligation',  
      '*q:operation',   
      '*q:routine'      
    ],
    graph: [
      'create_policy_class',
      'create_object',
      'create_object_attribute',
      'create_user_attribute',
      'create_user',
      'set_node_properties',
      'delete_policy_class',
      'delete_object',
      'delete_object_attribute',
      'delete_user_attribute',
      'delete_user',
      'delete_policy_class_from',
      'delete_object_from',
      'delete_object_attribute_from',
      'delete_user_attribute_from',
      'delete_user_from',
      'assign',
      'assign_to',
      'deassign',
      'deassign_from',
      'associate',
      'associate_to',
      'dissociate',
      'dissociate_from'
    ],
    prohibitions: [
      'create_prohibition',
      'create_process_prohibition',
      'create_prohibition_with_complement_container',
      'delete_process_prohibition',
      'delete_prohibition',
      'delete_prohibition_with_complement_container'
    ],
    obligations: [
      'create_obligation',
      'create_obligation_with_any_pattern',
      'delete_obligation',
      'delete_obligation_with_any_pattern'
    ],
    operations: [
      'set_resource_operations',
      'create_admin_operation',
      'delete_admin_operation'
    ],
    routines: [
      'create_admin_routine',
      'delete_admin_routine'
    ],
    policy: [
      'reset',
      'serialize_policy',
      'deserialize_policy'
    ],
    query: [
      'query_access',
      'query_policy_classes',
      'query_assignments',
      'query_subgraph',
      'query_associations',
      'query_prohibitions',
      'query_process_prohibitions',
      'query_obligations',
      'query_resource_operations',
      'query_admin_operations',
      'query_admin_routines'
    ]
  };

  // Flatten all admin rights for filtering
  const adminAccessRights = Object.values(adminAccessRightsSections).flat();

  useEffect(() => {
    loadAssociations();
  }, [node.id]);

  const loadAssociations = async () => {
    setLoading(true);
    try {
      // Fetch available resource operations
      const resourceOpsResponse = await QueryService.getResourceOperations();
      const resourceOps = resourceOpsResponse.values || [];
      setAvailableResourceRights(resourceOps);

      // Fetch associations for this node
      const sourceAssocs: Association[] = []; // Associations where this node is the source (only for UA)
      const targetAssocs: Association[] = []; // Associations where this node is the target

      // For UA nodes: Get associations where this UA is the source
      if (node.type === NodeType.UA && node.pmId) {
        const sourceAssociations = await QueryService.getAssociationsWithSource(node.pmId);
        sourceAssociations.forEach((assoc) => {
          if (assoc.target) {
            const association: Association = {
              id: `${assoc.ua?.id || node.id}-${assoc.target.id}`,
              sourceNode: {
                id: assoc.ua?.id || node.id,
                pmId: assoc.ua?.id || node.pmId,
                name: assoc.ua?.name || node.name,
                type: NodeType.UA,
                children: []
              },
              targetNode: {
                id: assoc.target.id,
                pmId: assoc.target.id,
                name: assoc.target.name,
                type: assoc.target.type as NodeType,
                children: []
              },
              accessRights: assoc.accessRights
            };
            sourceAssocs.push(association);
          }
        });
      }

      // For all nodes: Get associations where this node is the target
      if (node.pmId) {
        const targetAssociations = await QueryService.getAssociationsWithTarget(node.pmId);
        targetAssociations.forEach((assoc) => {
          if (assoc.ua) {
            const association: Association = {
              id: `${assoc.ua.id}-${assoc.target?.id || node.id}`,
              sourceNode: {
                id: assoc.ua.id,
                pmId: assoc.ua.id,
                name: assoc.ua.name,
                type: NodeType.UA,
                children: []
              },
              targetNode: {
                id: assoc.target?.id || node.id,
                pmId: assoc.target?.id || node.pmId,
                name: assoc.target?.name || node.name,
                type: (assoc.target?.type as NodeType) || node.type,
                children: []
              },
              accessRights: assoc.accessRights
            };
            targetAssocs.push(association);
          }
        });
      }

      setSourceAssociations(sourceAssocs);
      setTargetAssociations(targetAssocs);
    } catch (error) {
      console.error('Failed to load associations:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load associations',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewAssociation = () => {
    alert('Create new association clicked');
  };

  const handleExpandAssociation = (associationId: string) => {
    const isExpanding = expandedAssociation !== associationId;
    setExpandedAssociation(isExpanding ? associationId : null);
    
    // Initialize editing rights and tree atoms when expanding
    if (isExpanding) {
      const association = [...sourceAssociations, ...targetAssociations].find(a => a.id === associationId);
      if (association) {
        const resourceRights = association.accessRights.filter(right => availableResourceRights.includes(right));
        const adminRights = association.accessRights.filter(right => adminAccessRights.includes(right));
        
        setEditingRights(prev => ({
          ...prev,
          [associationId]: { resourceRights, adminRights }
        }));

        // Create tree atoms for this association if they don't exist
        if (!treeAtoms[associationId]) {
          const apiAtom = atom<TreeApi<TreeNode> | null>(null);
          const dataAtom = atom<TreeNode[]>([]);
          
          setTreeAtoms(prev => ({
            ...prev,
            [associationId]: { apiAtom, dataAtom }
          }));
        }

        // Initialize direction state for this association
        if (!(associationId in showDescendants)) {
          setShowDescendants(prev => ({
            ...prev,
            [associationId]: false
          }));
        }
      }
    }
  };

  const handleResourceRightToggle = (associationId: string, right: string) => {
    setEditingRights(prev => ({
      ...prev,
      [associationId]: {
        ...prev[associationId],
        resourceRights: prev[associationId]?.resourceRights.includes(right)
          ? prev[associationId].resourceRights.filter(r => r !== right)
          : [...(prev[associationId]?.resourceRights || []), right]
      }
    }));
  };

  const handleAdminRightToggle = (associationId: string, right: string) => {
    setEditingRights(prev => ({
      ...prev,
      [associationId]: {
        ...prev[associationId],
        adminRights: prev[associationId]?.adminRights.includes(right)
          ? prev[associationId].adminRights.filter(r => r !== right)
          : [...(prev[associationId]?.adminRights || []), right]
      }
    }));
  };

  const handleUpdateAssociation = async (association: Association) => {
    const editingData = editingRights[association.id];
    if (!editingData) {
      notifications.show({
        title: 'Error',
        message: 'No editing data found for this association',
        color: 'red',
      });
      return;
    }

    try {
      const allRights = [...editingData.resourceRights, ...editingData.adminRights];
      
      // Update the association via API
      if (!association.sourceNode.pmId || !association.targetNode.pmId) {
        throw new Error('Missing node IDs for association update');
      }
      
      await AdjudicationService.associate(
        association.sourceNode.pmId,
        association.targetNode.pmId,
        allRights
      );

      notifications.show({
        title: 'Association Updated',
        message: `Successfully updated association between ${association.sourceNode.name} and ${association.targetNode.name}`,
        color: 'green',
      });

      // Reload associations to reflect changes
      await loadAssociations();
      
      // Close expanded view
      setExpandedAssociation(null);
    } catch (error) {
      console.error('Failed to update association:', error);
      notifications.show({
        title: 'Update Failed',
        message: `Failed to update association: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
    }
  };

  const handleDeleteAssociation = (association: Association) => {
    alert(`Delete association: ${association.id}`);
  };

  const renderAssociationsList = (associations: Association[], title: string) => {
    // Determine which node to show in the list based on the title/context
    const isShowingSourceNodes = title.includes('FROM'); // Show source nodes (UAs)
    const isShowingTargetNodes = title.includes('TO'); // Show target nodes (OAs, Os)
    
    return (
    <div style={{ flex: 1 }}>
      <Group justify="space-between" mb="md">
        <Title order={5}>{title}</Title>
        {(title.includes('TO') || title.includes('FROM') || title.includes('Target') || title.includes('Source')) && (
          <Button
            size="xs" 
            leftSection={<IconPlus size={14} />}
            onClick={handleCreateNewAssociation}
          >
            New
          </Button>
        )}
      </Group>

      {associations.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">
          No {title.toLowerCase()} found
        </Text>
      ) : (
        <Stack gap="xs">
          {associations.map((association) => (
            <Card key={association.id} withBorder radius="sm" style={{ }}>
              {/* Basic Association Info */}
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => handleExpandAssociation(association.id)}
              >
                <Group justify="space-between" align="center">
                  <Group gap="sm" align="center">
                    {expandedAssociation === association.id ? 
                      <IconChevronDown size={16} /> : 
                      <IconChevronRight size={16} />
                    }
                    <NodeIcon 
                      type={isShowingSourceNodes ? association.sourceNode.type : association.targetNode.type}
                      size="20px" 
                      fontSize="18px"
                    />
                    <Text size="md" fw={500}>
                      {isShowingSourceNodes ? association.sourceNode.name : association.targetNode.name}
                    </Text>
                  </Group>
                </Group>
                
                {association.accessRights.length > 0 && (
                  <Text size="s" c="dimmed" mt="xs" lineClamp={1}>
                    {association.accessRights.slice(0, 3).join(', ')}
                    {association.accessRights.length > 3 && '...'}
                  </Text>
                )}
              </div>

              {/* Expanded Detail View - Within Same Card */}
              {expandedAssociation === association.id && (
                <>
                  <Divider my="md" />
                  <div style={{ padding: '16px', borderRadius: '8px', height: '500px', display: 'flex', flexDirection: 'column' }}>
                    <Group gap="md" align="flex-start" style={{ height: '100%' }}>
                      {/* Left Panel - PMTree (30%) */}
                      <Box style={{ flex: '0 0 30%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Group justify="space-between" align="center" mb="sm">
                          <Group gap="xs">
                            <ActionIcon 
                              size="sm" 
                              variant={!showDescendants[association.id] ? 'filled' : 'subtle'}
                              onClick={() => {
                                setShowDescendants(prev => ({
                                  ...prev,
                                  [association.id]: false
                                }));
                              }}
                              title="Show Ascendants"
                            >
                              <IconArrowUp size={12} />
                            </ActionIcon>
                            <ActionIcon 
                              size="sm" 
                              variant={showDescendants[association.id] ? 'filled' : 'subtle'}
                              onClick={() => {
                                setShowDescendants(prev => ({
                                  ...prev,
                                  [association.id]: true
                                }));
                              }}
                              title="Show Descendants"
                            >
                              <IconArrowDown size={12} />
                            </ActionIcon>
                          </Group>
                        </Group>
                        
                        <div style={{ 
                          flex: 1,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          {treeAtoms[association.id] && (
                            <PPMTree
                              treeApiAtom={treeAtoms[association.id].apiAtom}
                              treeDataAtom={treeAtoms[association.id].dataAtom}
                              rootNode={isShowingSourceNodes ? association.targetNode : association.sourceNode}
                              direction={showDescendants[association.id] ? "descendants" : "ascendants"}
                              headerHeight={0}
                              footerHeight={0}
                              footerOpened={false}
                              disableDrag={true}
                              disableDrop={true}
                              disableEdit={true}
                              disableMultiSelection={true}
                              rowHeight={32}
                              overscanCount={5}
                              clickHandlers={{
                                onLeftClick: (node: TreeNode) => {
                                  console.log('Tree node clicked:', node);
                                },
                                onRightClick: (node: TreeNode) => {
                                  console.log('Tree node right-clicked:', node);
                                }
                              }}
                              style={{ height: '100%', width: '100%' }}
                            />
                          )}
                        </div>
                      </Box>

                      <Divider orientation="vertical" />

                      {/* Right Panel - Access Rights (70%) */}
                      <Stack style={{ flex: 1, height: '100%' }} gap="sm">
                        <Text size="sm" fw={600}>Access Rights</Text>

                        <div style={{ flex: 1, overflow: 'auto' }}>
                          <SimpleGrid cols={2} spacing="sm" style={{ height: '100%' }}>
                            {/* Resource Access Rights */}
                            <div>
                              <Group justify="space-between" align="center" mb="sm">
                                <Title order={6}>Resource Access Rights</Title>
                                <Button 
                                  size="xs" 
                                  variant="subtle" 
                                  color="gray"
                                  onClick={() => setEditingRights(prev => ({
                                    ...prev,
                                    [association.id]: { ...prev[association.id], resourceRights: [] }
                                  }))}
                                  disabled={!(editingRights[association.id]?.resourceRights?.length > 0)}
                                >
                                  Clear
                                </Button>
                              </Group>
                              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {availableResourceRights.map(right => (
                                  <Checkbox
                                    key={right}
                                    label={right}
                                    checked={editingRights[association.id]?.resourceRights.includes(right) || false}
                                    onChange={() => handleResourceRightToggle(association.id, right)}
                                    size="xs"
                                    mb={4}
                                    styles={{
                                      label: { fontSize: '12px' },
                                      body: { alignItems: 'flex-start' }
                                    }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Admin Access Rights */}
                            <div>
                              <Group justify="space-between" align="center" mb="sm">
                                <Title order={6}>Admin Access Rights</Title>
                                <Button 
                                  size="xs" 
                                  variant="subtle" 
                                  color="gray"
                                  onClick={() => setEditingRights(prev => ({
                                    ...prev,
                                    [association.id]: { ...prev[association.id], adminRights: [] }
                                  }))}
                                  disabled={!(editingRights[association.id]?.adminRights?.length > 0)}
                                >
                                  Clear
                                </Button>
                              </Group>
                              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                {Object.entries(adminAccessRightsSections).map(([sectionName, rights]) => (
                                  <div key={sectionName} style={{ marginBottom: '12px' }}>
                                    <Text size="xs" fw={600} c="dimmed" mb={4} style={{ textTransform: 'capitalize' }}>
                                      {sectionName}
                                    </Text>
                                    {rights.map(right => (
                                      <Checkbox
                                        key={right}
                                        label={right}
                                        checked={editingRights[association.id]?.adminRights.includes(right) || false}
                                        onChange={() => handleAdminRightToggle(association.id, right)}
                                        size="xs"
                                        mb={4}
                                        ml={8}
                                        styles={{
                                          label: { fontSize: '12px' },
                                          body: { alignItems: 'flex-start' }
                                        }}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </SimpleGrid>
                        </div>

                        <Group justify="flex-end" gap="xs" mt="sm">
                          <Button 
                            size="xs" 
                            variant="outline"
                            onClick={() => handleUpdateAssociation(association)}
                          >
                            Update
                          </Button>
                          <Button 
                            size="xs" 
                            color="red" 
                            variant="outline"
                            onClick={() => handleDeleteAssociation(association)}
                          >
                            Delete
                          </Button>
                        </Group>
                      </Stack>
                    </Group>
                  </div>
                </>
              )}
            </Card>
          ))}
        </Stack>
      )}
    </div>
    );
  };

  if (loading) {
    return (
      <Stack align="center" justify="center" style={{ height: '100%' }}>
        <Text>Loading associations...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      {/* Header */}
      <Group justify="space-between" align="center" style={{ padding: '16px 16px 0 16px' }}>
        <Group gap="sm" align="center">
          <IconEye size={20} />
          <Text fw={500} truncate style={{ maxWidth: '250px' }}>
            Associations for {node.name}
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

      <div style={{ padding: '0 16px', flex: 1, overflow: 'hidden' }}>
        <Stack gap="md" style={{ height: '100%' }}>
          {hasSourceAssociations ? (
            // UA nodes show both directions
            <>
              {renderAssociationsList(sourceAssociations, 'Target Associations')}
              {renderAssociationsList(targetAssociations, 'Source Associations')}
            </>
          ) : (
            // OA and O nodes show only associations where they are the target
            renderAssociationsList(targetAssociations, 'Source Associations')
          )}
        </Stack>
      </div>
    </Stack>
  );
}