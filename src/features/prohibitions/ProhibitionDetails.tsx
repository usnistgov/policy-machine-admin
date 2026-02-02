import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Checkbox,
  Group,
  Stack,
  TextInput,
  Text,
  Alert,
  ActionIcon,
  Divider, useMantineTheme
} from "@mantine/core";
import { IconSquareRoundedMinus, IconPlus } from "@tabler/icons-react";
import { AccessRightsSelection } from "@/components/access-rights";
import { TreeNode, NodeIcon } from "@/features/pmtree/tree-utils";
import { NodeType, Prohibition } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import * as AdjudicationService from "@/shared/api/pdp_adjudication.api";
import { notifications } from "@mantine/notifications";

interface ProhibitionDetailsProps {
  selectedNodes?: TreeNode[];
  initialProhibition?: Prohibition | null;
  isEditing?: boolean;
  onCancel: () => void;
  onSuccess: (prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => void;
}

export function ProhibitionDetails({
                                     selectedNodes = [],
                                     initialProhibition,
                                     isEditing = false,
                                     onCancel,
                                     onSuccess
                                   }: ProhibitionDetailsProps) {
  const theme = useMantineTheme();
  const [name, setName] = useState(initialProhibition?.name || "");
  const [subject, setSubject] = useState<TreeNode | null>(null);
  const [selectedAccessRights, setSelectedAccessRights] = useState<string[]>(initialProhibition?.accessRights || []);
  const [intersection, setIntersection] = useState(initialProhibition?.intersection || false);
  const [containerConditions, setContainerConditions] = useState<Array<{ node: TreeNode; isComplement: boolean }>>(
      initialProhibition?.containerConditions.map(cc => ({
        node: {
          id: cc.container?.id || "",
          name: cc.container?.name || "",
          type: cc.container?.type as NodeType || NodeType.ANY,
          pmId: cc.container?.id || ""
        },
        isComplement: cc.complement
      })) || []
  );

  // Selection modes
  const [isSelectingSubject, setIsSelectingSubject] = useState(false);
  const [isSelectingContainer, setIsSelectingContainer] = useState(false);

  // Resource operations
  const [resourceOperations, setResourceOperations] = useState<string[]>([]);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize subject from initial prohibition or selected nodes
  useEffect(() => {
    if (initialProhibition?.subject?.node) {
      setSubject({
        id: initialProhibition.subject.node.id,
        name: initialProhibition.subject.node.name,
        type: initialProhibition.subject.node.type as NodeType,
        pmId: initialProhibition.subject.node.id
      });
    }
  }, [initialProhibition]);

  // Handle subject selection from tree
  useEffect(() => {
    if (isSelectingSubject && selectedNodes && selectedNodes.length > 0) {
      // Only allow U and UA nodes for subject
      const validNode = selectedNodes.find(node =>
          node.type === NodeType.U || node.type === NodeType.UA
      );

      if (validNode) {
        setSubject(validNode);
        setIsSelectingSubject(false);
      }
    }
  }, [selectedNodes, isSelectingSubject]);

  // Handle container condition selection from tree
  useEffect(() => {
    if (isSelectingContainer && selectedNodes && selectedNodes.length > 0) {
      const newContainers = selectedNodes.filter(node =>
          !containerConditions.some(cc => cc.node.pmId === node.pmId)
      );

      if (newContainers.length > 0) {
        setContainerConditions(prev => [
          ...prev,
          ...newContainers.map(node => ({ node, isComplement: false }))
        ]);
      }
      // Keep selection mode open - don't automatically exit
    }
  }, [selectedNodes, isSelectingContainer, containerConditions]);

  // Fetch resource operations
  useEffect(() => {
    async function fetchResourceOperations() {
      try {
        const accessRights = await QueryService.getResourceAccessRights();
        setResourceOperations(accessRights);
      } catch (error) {
        setResourceOperations([]);
      }
    }
    fetchResourceOperations();
  }, []);

  const handleRemoveSubject = useCallback(() => {
    setSubject(null);
  }, []);

  const handleRemoveContainerCondition = useCallback((nodeToRemove: TreeNode) => {
    setContainerConditions(prev => prev.filter(cc => cc.node.id !== nodeToRemove.id));
  }, []);

  const handleToggleContainerComplement = useCallback((nodeId: string) => {
    setContainerConditions(prev => prev.map(cc =>
        cc.node.id === nodeId
            ? { ...cc, isComplement: !cc.isComplement }
            : cc
    ));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'Prohibition name is required',
      });
      return;
    }

    if (!subject) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'Subject must be selected',
      });
      return;
    }

    if (selectedAccessRights.length === 0) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'At least one access right must be selected',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const containerConditionsForApi = containerConditions.map(cc => ({
        containerId: cc.node.pmId || cc.node.id,
        complement: cc.isComplement
      }));

      const prohibitionData: Prohibition = {
        name,
        subject: {
          node: {
            id: subject.pmId || subject.id,
            name: subject.name,
            type: subject.type as NodeType,
            properties: {}
          }
        },
        accessRights: selectedAccessRights,
        intersection,
        containerConditions: containerConditions.map(cc => ({
          container: {
            id: cc.node.pmId || cc.node.id,
            name: cc.node.name,
            type: cc.node.type as NodeType,
            properties: {}
          },
          complement: cc.isComplement
        }))
      };

      if (!isEditing) {
        await AdjudicationService.createProhibition(
            name,
            subject.pmId || subject.id,
            undefined, // No process support for now
            selectedAccessRights,
            intersection,
            containerConditionsForApi
        );
        notifications.show({
          color: 'green',
          title: 'Prohibition Created',
          message: 'Prohibition has been created successfully',
        });
        // Reset selection modes
        setIsSelectingSubject(false);
        setIsSelectingContainer(false);
        onSuccess(prohibitionData, 'create');
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: isEditing ? 'Update Error' : 'Creation Error',
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, subject, selectedAccessRights, intersection, containerConditions, isEditing, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (!initialProhibition?.name) {return;}

    setIsSubmitting(true);

    try {
      await AdjudicationService.deleteProhibition(initialProhibition.name);
      notifications.show({
        color: 'green',
        title: 'Prohibition Deleted',
        message: 'Prohibition has been deleted successfully',
      });
      // Reset selection modes
      setIsSelectingSubject(false);
      setIsSelectingContainer(false);
      onSuccess(undefined, 'delete');
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Delete Error',
        message: (error as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [initialProhibition, onSuccess]);

  return (
      <Box p="md">
        <Stack gap="md">
          {/* Name Field */}
          <TextInput
              label="Name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={isEditing} // Name cannot be changed when editing
          />

          {/* Subject Selection */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Subject *</Text>
            <Box style={{}}>
              {!subject && !isSelectingSubject && !isEditing && (
                  <Alert variant="light" color="blue" mb="sm">
                    <Text size="sm">
                      Select a U or UA node from the tree on the left, or click "Select Subject" button
                    </Text>
                  </Alert>
              )}
              {isSelectingSubject && !isEditing && (
                  <Alert variant="light" color="orange" mb="sm">
                    <Text size="sm">
                      Selecting subject... Click on a U or UA node in the tree to the left
                    </Text>
                  </Alert>
              )}
              {subject && (
                  <Group justify="space-between" style={{
                    padding: '8px 12px',
                    border: '1px solid var(--mantine-color-gray-2)',
                    borderRadius: '4px',
                    backgroundColor: isEditing ? 'var(--mantine-color-gray-1)' : 'white'
                  }}>
                    <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                      <NodeIcon type={subject.type} size={18} />
                      <Text
                          size="sm"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                      >
                        {subject.name}
                      </Text>
                    </Group>
                    {!isEditing && (
                        <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={handleRemoveSubject}
                        >
                          <IconSquareRoundedMinus size={16} />
                        </ActionIcon>
                    )}
                  </Group>
              )}
            </Box>

            {!subject && !isEditing && (
                <Group justify="flex-start" mt="xs">
                  <Button
                      variant="light"
                      size="xs"
                      onClick={() => setIsSelectingSubject(!isSelectingSubject)}
                  >
                    {isSelectingSubject ? 'Cancel Selection' : 'Select Subject'}
                  </Button>
                </Group>
            )}
          </Box>

          {/* Access Rights */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Access Rights *</Text>
            <Box style={{ height: '250px', border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px', overflow: 'hidden' }}>
              <AccessRightsSelection
                  selectedRights={selectedAccessRights}
                  onRightsChange={setSelectedAccessRights}
                  resourceAccessRights={resourceOperations}
                  readOnly={isEditing}
              />
            </Box>
          </Box>

          {/* Intersection Checkbox */}
          <Checkbox
              label="Intersection"
              checked={intersection}
              onChange={(event) => setIntersection(event.currentTarget.checked)}
              disabled={isEditing}
          />

          {/* Container Conditions */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Container Conditions</Text>
            {isSelectingContainer && !isEditing && (
                <Alert variant="light" color="orange" mb="sm">
                  <Text size="sm">
                    Selecting container... Click on nodes in the left tree to add container conditions
                  </Text>
                </Alert>
            )}
            <Box style={{
              maxHeight: "200px",
              overflow: "auto",
            }}>
              {containerConditions.length === 0 && !isSelectingContainer && (
                  <Alert variant="light" color="gray" mb="sm">
                    <Text size="sm">No container conditions defined</Text>
                  </Alert>
              )}
              <Stack gap="xs">
                {containerConditions.map((cc) => (
                    <Group key={cc.node.id} justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: isEditing ? 'var(--mantine-color-gray-1)' : 'white'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <NodeIcon type={cc.node.type} size={18} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {cc.node.name}
                        </Text>
                        <Checkbox
                            label="Complement"
                            size="xs"
                            checked={cc.isComplement}
                            onChange={() => handleToggleContainerComplement(cc.node.id)}
                            disabled={isEditing}
                        />
                      </Group>
                      {!isEditing && (
                          <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveContainerCondition(cc.node)}
                          >
                            <IconSquareRoundedMinus size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                ))}
              </Stack>
            </Box>

            {!isEditing && (
                <Group justify="flex-start" mt="xs">
                  {!isSelectingContainer ? (
                      <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => setIsSelectingContainer(true)}
                      >
                        Add Container
                      </Button>
                  ) : (
                      <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setIsSelectingContainer(false)}
                      >
                        Stop Selecting
                      </Button>
                  )}
                </Group>
            )}
          </Box>

          <Divider />

          {/* Action Buttons */}
          <Group justify="center" gap="md">
            {isEditing ? (
                <>
                  <Button
                      color="red"
                      variant="filled"
                      loading={isSubmitting}
                      onClick={handleDelete}
                  >
                    Delete
                  </Button>
                  <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                  >
                    Close
                  </Button>
                </>
            ) : (
                <>
                  <Button
                      color="var(--mantine-primary-filled)"
                      loading={isSubmitting}
                      onClick={handleSubmit}
                      disabled={!name.trim() || !subject || selectedAccessRights.length === 0}
                  >
                    Create
                  </Button>
                  <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </>
            )}
          </Group>
        </Stack>
      </Box>
  );
}