import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Card,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  LoadingOverlay,
  Title,
  Tooltip,
  ActionIcon
} from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconAutomation,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconLayoutSidebar, IconLayoutBottombar, IconLayoutSidebarRight, IconMoon, IconSun
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import classes from './navbar.module.css';
import { NavBar } from '@/components/navbar/NavBar';
import { UserMenu } from '@/components/UserMenu';
import { PMLEditor } from '@/components/PMLEditor';
import { QueryService, AdjudicationService, Obligation } from '@/api/pdp.api';
import { AuthService } from '@/lib/auth';
import {PMIcon} from "@/components/icons/PMIcon";
import {useTheme} from "@/contexts/ThemeContext";

interface ObligationCardProps {
  obligation: Obligation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (name: string, pml: string) => void;
  onDelete: (name: string) => void;
  isUpdating: boolean;
}

const ObligationCard: React.FC<ObligationCardProps> = ({
                                                         obligation,
                                                         isExpanded,
                                                         onToggleExpand,
                                                         onUpdate,
                                                         onDelete,
                                                         isUpdating
                                                       }) => {
  const [editedPML, setEditedPML] = useState(obligation.pml);

  const handleUpdate = () => {
    onUpdate(obligation.name, editedPML);
  };

  const handleDelete = () => {
    onDelete(obligation.name);
  };

  return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group
            justify="space-between"
            align="center"
            style={{ cursor: 'pointer' }}
            onClick={onToggleExpand}
        >
          <div>
            <Text fw={500} size="lg">
              {obligation.name}
            </Text>
            {obligation.author && (
                <Text size="sm" c="dimmed">
                  Author: {obligation.author.name}
                </Text>
            )}
          </div>
          {isExpanded ?
              <IconChevronUp size={16} /> :
              <IconChevronDown size={16} />
          }
        </Group>

        {isExpanded && (
            <Stack gap="md" mt="md">
              <div style={{ 
                border: '1px solid #e9ecef', 
                borderRadius: '8px', 
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'white'
              }}>
                <PMLEditor
                    title=""
                    initialValue={obligation.pml}
                    placeholder=""
                    onChange={setEditedPML}
                    readOnly={false}
                    hideButtons={true}
                    containerHeight={400}
                />
              </div>
              <Group justify="flex-end">
                <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdate();
                    }}
                    disabled={editedPML === obligation.pml}
                >
                  Update
                </Button>
                <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    disabled={isUpdating}
                >
                  Delete
                </Button>
              </Group>
            </Stack>
        )}
      </Card>
  );
};

interface CreateObligationCardProps {
  onCancel: () => void;
  onCreate: (pml: string) => void;
  isCreating: boolean;
}

const CreateObligationCard: React.FC<CreateObligationCardProps> = ({ onCancel, onCreate, isCreating }) => {
  const [pmlContent, setPMLContent] = useState('');

  const handleCreate = () => {
    onCreate(pmlContent);
  };

  return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text fw={500} size="lg" mb="md">
          Create New Obligation
        </Text>
        <Stack gap="md">
          <div style={{ 
            border: '1px solid #e9ecef', 
            borderRadius: '8px', 
            overflow: 'hidden',
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'white'
          }}>
            <PMLEditor
                title=""
                initialValue={pmlContent}
                placeholder="Enter PML code for the new obligation..."
                onChange={setPMLContent}
                readOnly={false}
                hideButtons={true}
                containerHeight={400}
            />
          </div>
          <Group justify="flex-end">
            <Button
                variant="outline"
                onClick={onCancel}
                disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
                onClick={handleCreate}
                loading={isCreating}
                disabled={!pmlContent.trim()}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Card>
  );
};

export default function ObligationsPage() {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [error, setError] = useState<string>('');
  const [expandedObligationId, setExpandedObligationId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { themeMode, toggleTheme } = useTheme();

  useEffect(() => {
    loadObligations();
  }, []);

  const loadObligations = async () => {
    setError('');

    try {
      const obligationsData = await QueryService.getObligations();
      setObligations(obligationsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to load obligations: ${errorMessage}`);
      console.error('Error loading obligations:', error);
    }
  };

  const handleDeleteObligation = async (obligationName: string) => {
    setIsUpdating(true);
    try {
      const deletePML = `delete obligation "${obligationName}"`;
      await AdjudicationService.executePML(deletePML);

      notifications.show({
        title: 'Success',
        message: `Obligation "${obligationName}" deleted successfully`,
        color: 'green',
      });

      // Remove from local state and collapse if expanded
      setObligations(prev => prev.filter(o => o.name !== obligationName));
      if (expandedObligationId === obligationName) {
        setExpandedObligationId(null);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifications.show({
        title: 'Error',
        message: `Failed to delete obligation: ${errorMessage}`,
        color: 'red',
      });
      console.error('Error deleting obligation:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateObligation = async (obligationName: string, updatedPML: string) => {
    setIsUpdating(true);
    let deleteFailed = false;
    let deleteError = '';

    // Parse the new obligation name from the PML
    const match = updatedPML.match(/create obligation\s+"([^"]+)"/);
    const newObligationName = match && match[1] ? match[1] : obligationName;

    try {
      // Try to delete the old obligation
      const deletePML = `delete obligation "${obligationName}"`;
      await AdjudicationService.executePML(deletePML);
    } catch (error) {
      deleteFailed = true;
      deleteError = error instanceof Error ? error.message : 'Unknown error occurred';
    }

    try {
      // Try to create the new obligation with the updated PML
      await AdjudicationService.executePML(updatedPML);

      notifications.show({
        title: deleteFailed ? 'Partial Success' : 'Success',
        message: deleteFailed
            ? `Delete failed (${deleteError}), but create succeeded. Obligation "${newObligationName}" updated.`
            : `Obligation "${newObligationName}" updated successfully`,
        color: deleteFailed ? 'yellow' : 'green',
      });

      // Update local state with the new obligation data
      setObligations(prev =>
          prev.map(o => o.name === obligationName
              ? { ...o, name: newObligationName, pml: updatedPML }
              : o
          )
      );

      // Update expanded obligation ID if it changed
      if (newObligationName !== obligationName) {
        setExpandedObligationId(newObligationName);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifications.show({
        title: 'Error',
        message: `Failed to update obligation: ${deleteFailed ? `Delete failed (${deleteError}). ` : ''}${errorMessage}`,
        color: 'red',
      });
      console.error('Error updating obligation:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateObligation = async (pmlContent: string) => {
    if (!pmlContent.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please provide PML content for the obligation',
        color: 'red',
      });
      return;
    }

    // Parse the obligation name from the PML
    const match = pmlContent.match(/create obligation\s+"([^"]+)"/);
    if (!match || !match[1]) {
      notifications.show({
        title: 'Error',
        message: 'Invalid PML: Could not parse obligation name',
        color: 'red',
      });
      return;
    }

    const obligationName = match[1];
    const currentUsername = AuthService.getUsername();

    setIsCreating(true);
    try {
      await AdjudicationService.executePML(pmlContent);

      notifications.show({
        title: 'Success',
        message: 'Obligation created successfully',
        color: 'green',
      });

      // Create new obligation object and add to local state
      const newObligation: Obligation = {
        name: obligationName,
        author: currentUsername ? {
          name: currentUsername,
          type: 'U', // User type
          properties: {}
        } : undefined,
        pml: pmlContent,
      };

      // Add to obligations list (remove any existing with same name to avoid duplicates)
      setObligations(prev => [newObligation, ...prev.filter(o => o.name !== obligationName)]);

      // Hide create form and expand the new obligation
      setShowCreateForm(false);
      setExpandedObligationId(obligationName);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifications.show({
        title: 'Error',
        message: `Failed to create obligation: ${errorMessage}`,
        color: 'red',
      });
      console.error('Error creating obligation:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setExpandedObligationId(null); // Collapse any expanded obligations
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  const toggleExpanded = (obligationName: string) => {
    setExpandedObligationId(current =>
        current === obligationName ? null : obligationName
    );
  };

  return (
      <AppShell
          header={{ height: 60 }}
          transitionDuration={0}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <PMIcon style={{width: '36px', height: '36px'}}/>
              <Title order={2}>Policy Machine</Title>
            </Group>

            <NavBar activePageIndex={3} />

            <Group>
              <Tooltip label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
                <ActionIcon
                    variant="subtle"
                    size="md"
                    onClick={toggleTheme}
                >
                  {themeMode === 'light' ? <IconMoon size={24} /> : <IconSun size={24} />}
                </ActionIcon>
              </Tooltip>

              <UserMenu />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main style={{height: "100vh", overflow: "auto"}}>
          <Stack gap="md" style={{padding: "50px 200px", minHeight: "calc(100vh - 60px)"}}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconAutomation size={24} />
                <Text size="xl" fw={600}>Obligations</Text>
              </div>
              <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleShowCreateForm}
                  disabled={showCreateForm || isCreating}
              >
                Create Obligation
              </Button>
            </div>

            {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                  {error}
                </Alert>
            )}

            <div style={{ width: '100%' }}>

              <Stack gap="md">
                {showCreateForm && (
                    <CreateObligationCard
                        onCancel={handleCancelCreate}
                        onCreate={handleCreateObligation}
                        isCreating={isCreating}
                    />
                )}

                {obligations.length === 0 && !showCreateForm && (
                    <Text ta="center" c="dimmed" size="lg" py="xl">
                      No obligations found. Create your first obligation using the button above.
                    </Text>
                )}

                {obligations.map((obligation) => (
                    <ObligationCard
                        key={obligation.name}
                        obligation={obligation}
                        isExpanded={expandedObligationId === obligation.name}
                        onToggleExpand={() => toggleExpanded(obligation.name)}
                        onUpdate={handleUpdateObligation}
                        onDelete={handleDeleteObligation}
                        isUpdating={isUpdating}
                    />
                ))}
              </Stack>
            </div>
          </Stack>
        </AppShell.Main>
      </AppShell>
  );
}