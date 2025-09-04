import React, { useState, useEffect } from 'react';
import { Stack, Group, Text, TextInput, Textarea, Divider, Card, Box } from '@mantine/core';
import { TreeNode } from '@/utils/tree.utils';
import { NodeType, QueryService } from '@/api/pdp.api';
import { NodeIcon } from '@/components/pmtree/tree-utils';
import { PMTree } from '@/components/pmtree';
import { PMNode } from '@/components/pmtree/PMNode';
import { atom } from 'jotai';
import { TreeApi } from 'react-arborist';
import { AssociationsTab } from '@/components/sidebar/AssociationsTab';

// Create atoms for the assignments tree
const assignmentsTreeApiAtom = atom<TreeApi<TreeNode> | null>(null);
const assignmentsTreeDataAtom = atom<TreeNode[]>([]);

interface InspectPanelProps {
  node: TreeNode;
  onClose: () => void;
}

export function InspectPanel({ node, onClose }: InspectPanelProps) {
  const [assignments, setAssignments] = useState<TreeNode[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [node]);

  const loadAssignments = async () => {
    if (!node.pmId) return;
    
    setLoadingAssignments(true);
    try {
      // Fetch adjacent descendants (assignments) for this node
      const response = await QueryService.selfComputeAdjacentDescendantPrivileges(node.pmId);
      
      // Transform to TreeNodes
      const assignmentNodes = response
        .map(nodePriv => nodePriv.node)
        .filter((n): n is NonNullable<typeof n> => n !== undefined)
        .map(n => ({
          id: n.id,
          pmId: n.id,
          name: n.name,
          type: n.type,
          properties: n.properties,
          children: []
        }));
      
      setAssignments(assignmentNodes);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const hasProperties = node.properties && Object.keys(node.properties).length > 0;
  const propertiesText = hasProperties 
    ? Object.entries(node.properties!)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n')
    : '';

  return (
    <Stack gap="md" style={{ height: '100%' }}>
      {/* Node Header */}
      <Card padding="md" withBorder>
        <Group gap="md" align="center">
          <NodeIcon type={node.type} size="48px" fontSize="32px" />
          <Stack gap="xs" style={{ flex: 1 }}>
            <Text size="lg" fw={600}>{node.name}</Text>
            <Text size="sm" c="dimmed">{node.type} • ID: {node.pmId || 'N/A'}</Text>
          </Stack>
        </Group>
      </Card>

      <Stack gap="md" style={{ flex: 1, overflow: 'auto' }}>
        {/* Properties */}
        {hasProperties && (
          <Card padding="md" withBorder>
            <Stack gap="sm">
              <Text size="sm" fw={500}>Properties</Text>
              <Textarea
                value={propertiesText}
                readOnly
                autosize
                minRows={2}
                maxRows={6}
                styles={{
                  input: {
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }
                }}
              />
            </Stack>
          </Card>
        )}

        {/* Assignments */}
        <Card padding="md" withBorder style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Stack gap="sm" style={{ flex: 1 }}>
            <Text size="sm" fw={500}>Assignments</Text>
            <Text size="xs" c="dimmed">
              Descendants of {node.name} (multi-select enabled)
            </Text>
            
            <Box style={{ flex: 1, minHeight: '200px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
              {loadingAssignments ? (
                <Text size="sm" c="dimmed" ta="center" pt="md">Loading assignments...</Text>
              ) : assignments.length > 0 ? (
                <PMTree
                  treeApiAtom={assignmentsTreeApiAtom}
                  treeDataAtom={assignmentsTreeDataAtom}
                  rootNodes={assignments}
                  height="100%"
                  direction="descendants"
                  disableMultiSelection={false} // Enable multi-selection
                >
                  {(nodeProps) => (
                    <PMNode
                      {...nodeProps}
                      direction="descendants"
                      treeDataAtom={assignmentsTreeDataAtom}
                    />
                  )}
                </PMTree>
              ) : (
                <Text size="sm" c="dimmed" ta="center" pt="md">No assignments found</Text>
              )}
            </Box>
          </Stack>
        </Card>

        {/* Associations */}
        <Card padding="md" withBorder>
          <Stack gap="sm">
            <Text size="sm" fw={500}>Associations</Text>
            <Text size="xs" c="dimmed">
              Incoming and outgoing associations for {node.name}
            </Text>
            
            <Box style={{ maxHeight: '300px', overflow: 'auto' }}>
              <AssociationsTab
                node={node}
                selectedNodeFromMainTree={null}
                onStartAssociationMode={() => {}}
                onRefreshTree={() => {}}
              />
            </Box>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}