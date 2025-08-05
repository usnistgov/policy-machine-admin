import { useState, useEffect, useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import { AdjudicationService, NodeType, QueryService } from '@/api/pdp.api';
import { TreeNode } from '@/utils/tree.utils';

export interface Association {
  id: string;
  sourceNode: TreeNode;
  targetNode: TreeNode;
  accessRights: string[];
}

export interface UseAssociationsProps {
  node: TreeNode;
}

export interface UseAssociationsReturn {
  // Data
  sourceAssociations: Association[];
  targetAssociations: Association[];
  availableResourceRights: string[];
  adminAccessRights: string[];
  loading: boolean;
  
  
  // Actions
  loadAssociations: () => Promise<void>;
  createAssociation: (isOutgoing: boolean, targetNodeId: string, resourceRights: string[], adminRights: string[]) => Promise<void>;
  updateAssociation: (association: Association, resourceRights: string[], adminRights: string[]) => Promise<void>;
  deleteAssociation: (association: Association) => Promise<void>;
}

// Admin access rights organized by sections
const adminAccessRightsSections = {
  wildcard: [
    '*', '*a', '*r', '*a:graph', '*a:prohibition', '*a:obligation', 
    '*a:operation', '*a:routine', '*q', '*q:graph', '*q:prohibition', 
    '*q:obligation', '*q:operation', '*q:routine'
  ],
  graph: [
    'create_policy_class', 'create_object', 'create_object_attribute',
    'create_user_attribute', 'create_user', 'set_node_properties',
    'delete_policy_class', 'delete_object', 'delete_object_attribute',
    'delete_user_attribute', 'delete_user', 'delete_policy_class_from',
    'delete_object_from', 'delete_object_attribute_from', 'delete_user_attribute_from',
    'delete_user_from', 'assign', 'assign_to', 'deassign', 'deassign_from',
    'associate', 'associate_to', 'dissociate', 'dissociate_from'
  ],
  prohibitions: [
    'create_prohibition', 'create_process_prohibition', 
    'create_prohibition_with_complement_container', 'delete_process_prohibition',
    'delete_prohibition', 'delete_prohibition_with_complement_container'
  ],
  obligations: [
    'create_obligation', 'create_obligation_with_any_pattern',
    'delete_obligation', 'delete_obligation_with_any_pattern'
  ],
  operations: [
    'set_resource_operations', 'create_admin_operation', 'delete_admin_operation'
  ],
  routines: ['create_admin_routine', 'delete_admin_routine'],
  policy: ['reset', 'serialize_policy', 'deserialize_policy'],
  query: [
    'query_access', 'query_policy_classes', 'query_assignments', 'query_subgraph',
    'query_associations', 'query_prohibitions', 'query_process_prohibitions',
    'query_obligations', 'query_resource_operations', 'query_admin_operations',
    'query_admin_routines'
  ]
};

export function useAssociations({ node }: UseAssociationsProps): UseAssociationsReturn {
  const [sourceAssociations, setSourceAssociations] = useState<Association[]>([]);
  const [targetAssociations, setTargetAssociations] = useState<Association[]>([]);
  const [availableResourceRights, setAvailableResourceRights] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);


  // Flatten all admin rights for filtering
  const adminAccessRights = useMemo(() => 
    Object.values(adminAccessRightsSections).flat(), 
    []
  );

  const loadAssociations = async () => {
    setLoading(true);
    try {
      // Fetch available resource operations
      const resourceOpsResponse = await QueryService.getResourceOperations();
      const resourceOps = resourceOpsResponse.values || [];
      setAvailableResourceRights(resourceOps);

      const sourceAssocs: Association[] = [];
      const targetAssocs: Association[] = [];

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

  const createAssociation = async (
    isOutgoing: boolean, 
    targetNodeId: string, 
    resourceRights: string[], 
    adminRights: string[]
  ) => {
    try {
      const allRights = [...resourceRights, ...adminRights];

      if (isOutgoing) {
        if (!node.pmId) throw new Error('Source node missing PM ID');
        await AdjudicationService.associate(node.pmId, targetNodeId, allRights);
      } else {
        if (!node.pmId) throw new Error('Target node missing PM ID');
        await AdjudicationService.associate(targetNodeId, node.pmId, allRights);
      }

      notifications.show({
        title: 'Association Created',
        message: 'Successfully created new association',
        color: 'green',
      });

      await loadAssociations();
    } catch (error) {
      console.error('Failed to create association:', error);
      notifications.show({
        title: 'Creation Failed',
        message: `Failed to create association: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
      throw error;
    }
  };

  const updateAssociation = async (
    association: Association, 
    resourceRights: string[], 
    adminRights: string[]
  ) => {
    try {
      const allRights = [...resourceRights, ...adminRights];

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

      await loadAssociations();
    } catch (error) {
      console.error('Failed to update association:', error);
      notifications.show({
        title: 'Update Failed',
        message: `Failed to update association: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
      throw error;
    }
  };

  const deleteAssociation = async (association: Association) => {
    try {
      if (!association.sourceNode.pmId || !association.targetNode.pmId) {
        throw new Error('Missing node IDs for association deletion');
      }

      await AdjudicationService.dissociate(
        association.sourceNode.pmId,
        association.targetNode.pmId
      );

      notifications.show({
        title: 'Association Deleted',
        message: `Successfully deleted association between ${association.sourceNode.name} and ${association.targetNode.name}`,
        color: 'green',
      });

      await loadAssociations();
    } catch (error) {
      console.error('Failed to delete association:', error);
      notifications.show({
        title: 'Delete Failed',
        message: `Failed to delete association: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red',
      });
      throw error;
    }
  };

  useEffect(() => {
    loadAssociations();
  }, [node.id]);

  return {
    sourceAssociations,
    targetAssociations,
    availableResourceRights,
    adminAccessRights,
    loading,
    loadAssociations,
    createAssociation,
    updateAssociation,
    deleteAssociation,
  };
}

export { adminAccessRightsSections };