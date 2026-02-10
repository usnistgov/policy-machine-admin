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
  const [isConjunctive, setIsConjunctive] = useState(initialProhibition?.isConjunctive || false);
  const [inclusionSet, setInclusionSet] = useState<TreeNode[]>(
      initialProhibition?.inclusionSet.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type as NodeType,
        pmId: node.id
      })) || []
  );
  const [exclusionSet, setExclusionSet] = useState<TreeNode[]>(
      initialProhibition?.exclusionSet.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type as NodeType,
        pmId: node.id
      })) || []
  );

  // Check if this is a process prohibition (read-only, delete only)
  const isProcessProhibition = Boolean(initialProhibition?.subject?.process);

  // Selection modes
  const [isSelectingSubject, setIsSelectingSubject] = useState(false);
  const [isSelectingInclusion, setIsSelectingInclusion] = useState(false);
  const [isSelectingExclusion, setIsSelectingExclusion] = useState(false);

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

  // Handle inclusion set selection from tree
  useEffect(() => {
    if (isSelectingInclusion && selectedNodes && selectedNodes.length > 0) {
      const newNodes = selectedNodes.filter(node =>
          !inclusionSet.some(n => n.pmId === node.pmId)
      );

      if (newNodes.length > 0) {
        setInclusionSet(prev => [...prev, ...newNodes]);
      }
    }
  }, [selectedNodes, isSelectingInclusion, inclusionSet]);

  // Handle exclusion set selection from tree
  useEffect(() => {
    if (isSelectingExclusion && selectedNodes && selectedNodes.length > 0) {
      const newNodes = selectedNodes.filter(node =>
          !exclusionSet.some(n => n.pmId === node.pmId)
      );

      if (newNodes.length > 0) {
        setExclusionSet(prev => [...prev, ...newNodes]);
      }
    }
  }, [selectedNodes, isSelectingExclusion, exclusionSet]);

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

  const handleRemoveFromInclusionSet = useCallback((nodeToRemove: TreeNode) => {
    setInclusionSet(prev => prev.filter(n => n.id !== nodeToRemove.id));
  }, []);

  const handleRemoveFromExclusionSet = useCallback((nodeToRemove: TreeNode) => {
    setExclusionSet(prev => prev.filter(n => n.id !== nodeToRemove.id));
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
        isConjunctive,
        inclusionSet: inclusionSet.map(n => ({
          id: n.pmId || n.id,
          name: n.name,
          type: n.type as NodeType,
          properties: {}
        })),
        exclusionSet: exclusionSet.map(n => ({
          id: n.pmId || n.id,
          name: n.name,
          type: n.type as NodeType,
          properties: {}
        }))
      };

      if (!isEditing) {
        await AdjudicationService.createProhibition(
            name,
            subject.pmId || subject.id,
            undefined, // No process support for now
            selectedAccessRights,
            isConjunctive,
            inclusionSet.map(n => n.pmId || n.id),
            exclusionSet.map(n => n.pmId || n.id)
        );
        notifications.show({
          color: 'green',
          title: 'Prohibition Created',
          message: 'Prohibition has been created successfully',
        });
        // Reset selection modes
        setIsSelectingSubject(false);
        setIsSelectingInclusion(false);
        setIsSelectingExclusion(false);
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
  }, [name, subject, selectedAccessRights, isConjunctive, inclusionSet, exclusionSet, isEditing, onSuccess]);

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
      setIsSelectingInclusion(false);
      setIsSelectingExclusion(false);
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
          {/* Process Prohibition Alert */}
          {isProcessProhibition && (
              <Alert variant="light" color="yellow">
                <Text size="sm">
                  This is a process prohibition and can only be deleted, not edited.
                </Text>
              </Alert>
          )}

          {/* Name Field */}
          <TextInput
              label="Name"
              required
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={isEditing || isProcessProhibition} // Name cannot be changed when editing or for process prohibitions
          />

          {/* Subject Selection */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Subject *</Text>
            <Box style={{}}>
              {/* Process Prohibition - show user ID and process (read-only) */}
              {isProcessProhibition && initialProhibition?.subject && (
                  <Stack gap="xs">
                    <Group justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-1)'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500}>User ID:</Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {initialProhibition.subject.node?.id || 'N/A'}
                        </Text>
                      </Group>
                    </Group>
                    <Group justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--mantine-color-gray-1)'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500}>Process:</Text>
                        <Text size="sm" style={{ flex: 1 }}>
                          {initialProhibition.subject.process}
                        </Text>
                      </Group>
                    </Group>
                  </Stack>
              )}

              {/* Node Prohibition - normal subject selection */}
              {!isProcessProhibition && (
                  <>
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
                  </>
              )}
            </Box>

            {!subject && !isEditing && !isProcessProhibition && (
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
                  readOnly={isEditing || isProcessProhibition}
              />
            </Box>
          </Box>

          {/* Conjunctive Checkbox */}
          <Checkbox
              label="Conjunctive (intersection mode)"
              checked={isConjunctive}
              onChange={(event) => setIsConjunctive(event.currentTarget.checked)}
              disabled={isEditing || isProcessProhibition}
          />

          {/* Inclusion Set */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Inclusion Set</Text>
            {isSelectingInclusion && !isEditing && !isProcessProhibition && (
                <Alert variant="light" color="orange" mb="sm">
                  <Text size="sm">
                    Selecting... Click on nodes in the left tree to add to inclusion set
                  </Text>
                </Alert>
            )}
            <Box style={{
              maxHeight: "150px",
              overflow: "auto",
            }}>
              {inclusionSet.length === 0 && !isSelectingInclusion && (
                  <Alert variant="light" color="gray" mb="sm">
                    <Text size="sm">No nodes in inclusion set</Text>
                  </Alert>
              )}
              <Stack gap="xs">
                {inclusionSet.map((node) => (
                    <Group key={node.id} justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: (isEditing || isProcessProhibition) ? 'var(--mantine-color-gray-1)' : 'white'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <NodeIcon type={node.type} size={18} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {node.name}
                        </Text>
                      </Group>
                      {!isEditing && !isProcessProhibition && (
                          <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveFromInclusionSet(node)}
                          >
                            <IconSquareRoundedMinus size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                ))}
              </Stack>
            </Box>

            {!isEditing && !isProcessProhibition && (
                <Group justify="flex-start" mt="xs">
                  {!isSelectingInclusion ? (
                      <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => { setIsSelectingInclusion(true); setIsSelectingExclusion(false); }}
                      >
                        Add to Inclusion
                      </Button>
                  ) : (
                      <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setIsSelectingInclusion(false)}
                      >
                        Stop Selecting
                      </Button>
                  )}
                </Group>
            )}
          </Box>

          {/* Exclusion Set */}
          <Box>
            <Text size="sm" fw={500} mb="xs">Exclusion Set</Text>
            {isSelectingExclusion && !isEditing && !isProcessProhibition && (
                <Alert variant="light" color="orange" mb="sm">
                  <Text size="sm">
                    Selecting... Click on nodes in the left tree to add to exclusion set
                  </Text>
                </Alert>
            )}
            <Box style={{
              maxHeight: "150px",
              overflow: "auto",
            }}>
              {exclusionSet.length === 0 && !isSelectingExclusion && (
                  <Alert variant="light" color="gray" mb="sm">
                    <Text size="sm">No nodes in exclusion set</Text>
                  </Alert>
              )}
              <Stack gap="xs">
                {exclusionSet.map((node) => (
                    <Group key={node.id} justify="space-between" style={{
                      padding: '8px 12px',
                      border: '1px solid var(--mantine-color-gray-2)',
                      borderRadius: '4px',
                      backgroundColor: (isEditing || isProcessProhibition) ? 'var(--mantine-color-gray-1)' : 'white'
                    }}>
                      <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                        <NodeIcon type={node.type} size={18} />
                        <Text size="sm" style={{ flex: 1 }}>
                          {node.name}
                        </Text>
                      </Group>
                      {!isEditing && !isProcessProhibition && (
                          <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => handleRemoveFromExclusionSet(node)}
                          >
                            <IconSquareRoundedMinus size={16} />
                          </ActionIcon>
                      )}
                    </Group>
                ))}
              </Stack>
            </Box>

            {!isEditing && !isProcessProhibition && (
                <Group justify="flex-start" mt="xs">
                  {!isSelectingExclusion ? (
                      <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconPlus size={14} />}
                          onClick={() => { setIsSelectingExclusion(true); setIsSelectingInclusion(false); }}
                      >
                        Add to Exclusion
                      </Button>
                  ) : (
                      <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setIsSelectingExclusion(false)}
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
            {(isEditing || isProcessProhibition) ? (
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