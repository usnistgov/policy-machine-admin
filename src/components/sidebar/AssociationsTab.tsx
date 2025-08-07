import React, { useState, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import { ActionIcon, Group, Stack, Text, Title } from '@mantine/core';
import { NodeType } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';
import { useAssociations, Association } from './hooks/useAssociations';
import { AssociationTablePanel } from './AssociationTablePanel';
import {NodeIcon} from "@/components/ppmtree3/tree-utils";

interface AssociationsTabProps {
  node: TreeNode;
  onClose: () => void;
  selectedNodeFromMainTree?: TreeNode | null; // Node selected from main content tree
  onStartAssociationMode?: (mode: 'outgoing' | 'incoming') => void; // Callback to activate association mode
}

export function AssociationsTab({ node, onClose, selectedNodeFromMainTree, onStartAssociationMode }: AssociationsTabProps) {
  const [isCreatingAssociation, setIsCreatingAssociation] = useState(false);
  const [creationMode, setCreationMode] = useState<'outgoing' | 'incoming' | null>(null);

  // Reset association creation state only when component first mounts/becomes visible
  useEffect(() => {
    setIsCreatingAssociation(false);
    setCreationMode(null);
  }, []); // Empty dependency array = only run on mount

  const hasSourceAssociations = node.type === NodeType.UA;

  // Use the custom hook for association management
  const {
    sourceAssociations,
    targetAssociations,
    availableResourceRights,
    adminAccessRights,
    loading,
    createAssociation,
    updateAssociation,
    deleteAssociation,
  } = useAssociations({ node });


  const handleCreateNewAssociation = (isOutgoingAssociation: boolean) => {
    const mode = isOutgoingAssociation ? 'outgoing' : 'incoming';
    
    // Start association mode through callback to parent
    onStartAssociationMode?.(mode);
    
    setCreationMode(mode);
    setIsCreatingAssociation(true);
    // Association mode activated
  };

  const handleCreateAssociation = async (
      isOutgoing: boolean,
      targetNodeId: string,
      resourceRights: string[],
      adminRights: string[]
  ) => {
    await createAssociation(isOutgoing, targetNodeId, resourceRights, adminRights);
    setIsCreatingAssociation(false);
    setCreationMode(null);
  };

  const handleCancelCreation = () => {
    setIsCreatingAssociation(false);
    setCreationMode(null);
  };

  // Clear creation mode when no node is selected from main tree (but not for association mode)
  useEffect(() => {
    if (!selectedNodeFromMainTree && isCreatingAssociation && !onStartAssociationMode) {
      setIsCreatingAssociation(false);
      setCreationMode(null);
    }
  }, [selectedNodeFromMainTree, isCreatingAssociation, onStartAssociationMode]);

  const handleUpdateAssociation = async (
      association: Association,
      resourceRights: string[],
      adminRights: string[]
  ) => {
    await updateAssociation(association, resourceRights, adminRights);
  };

  if (loading) {
    return (
        <Stack align="center" justify="center" style={{ height: '100%' }}>
          <Text>Loading associations...</Text>
        </Stack>
    );
  }

  return (
      <Stack gap="sm" style={{ height: '100%' }}>
        {/* Header */}
        <Group justify="space-between" align="center" style={{ padding: '8px 8px 0 8px' }}>
          <Title order={3}>
            Associations for <NodeIcon type={node.type} size="18" fontSize="18"/> {node.name}
          </Title>
          <ActionIcon size="sm" variant="subtle" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </Group>

        <div style={{ padding: '0 16px', flex: 1, overflow: 'hidden' }}>
          {/* Association Tables with Inline Details */}
          <AssociationTablePanel
              sourceAssociations={sourceAssociations}
              targetAssociations={targetAssociations}
              hasSourceAssociations={hasSourceAssociations}
              onCreateNewAssociation={handleCreateNewAssociation}
              onUpdateAssociation={handleUpdateAssociation}
              onDeleteAssociation={deleteAssociation}
              selectedNodeFromMainTree={selectedNodeFromMainTree}
              availableResourceRights={availableResourceRights}
              adminAccessRights={adminAccessRights}
              isCreatingAssociation={isCreatingAssociation}
              creationMode={creationMode}
              currentNode={node}
              onCreateAssociation={handleCreateAssociation}
              onCancelCreation={handleCancelCreation}
          />
        </div>

      </Stack>
  );
}