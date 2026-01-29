import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box,
    Text,
    Accordion,
    Group,
    ActionIcon,
    Title,
    Stack,
    Alert,
    Loader,
    Center,
    TextInput,
    Button
} from "@mantine/core";
import { IconPlus, IconAutomation, IconSearch, IconTrash } from "@tabler/icons-react";
import { Obligation } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import * as AdjudicationService from "@/shared/api/pdp_adjudication.api";
import { PMLEditor } from "@/features/pml/PMLEditor";
import { AuthService } from "@/lib/auth";
import { notifications } from "@mantine/notifications";

export function ObligationsPanel() {
    const [obligations, setObligations] = useState<Obligation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accordionValue, setAccordionValue] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [filterText, setFilterText] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Fetch obligations on component mount
    const fetchObligations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedObligations = await QueryService.getObligations();
            setObligations(fetchedObligations);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchObligations();
    }, [fetchObligations]);

    const handleCreateNew = useCallback(() => {
        setIsCreatingNew(true);
        setAccordionValue("create-new");
    }, []);

    const handleAccordionChange = useCallback((value: string | null) => {
        setAccordionValue(value);
        // If closing the create new accordion, cancel creation
        if (value !== "create-new" && isCreatingNew) {
            setIsCreatingNew(false);
        }
    }, [isCreatingNew]);

    // Handle creating new obligation
    const handleCreateObligation = useCallback(async (pml: string) => {
        // Extract obligation name from PML content
        const obligationNameMatch = pml.match(/create\s+obligation\s+"([^"]+)"/i);
        if (!obligationNameMatch) {
            throw new Error('PML must contain "create obligation \\"name\\"" statement');
        }

        const extractedName = obligationNameMatch[1];
        const currentUser = AuthService.getUsername();
        
        if (!currentUser) {
            throw new Error('Unable to determine current user');
        }

        // Execute the PML to create the obligation
        await AdjudicationService.executePML(pml);

        // Create obligation object to add to local state
        const newObligation: Obligation = {
            name: extractedName,
            author: {
                id: currentUser,
                name: currentUser,
                type: 'U' as any,
                properties: {}
            },
            pml
        };

        // Add to local state
        setObligations(prev => [...prev, newObligation]);
        
        // Reset creation state
        setIsCreatingNew(false);
        setAccordionValue(null);

        notifications.show({
            color: 'green',
            title: 'Obligation Created',
            message: 'Obligation has been created successfully',
        });
    }, []);

    // Handle deleting an obligation
    const handleDeleteObligation = useCallback(async (obligationName: string) => {
        setIsDeleting(obligationName);

        try {
            await AdjudicationService.deleteObligation(obligationName);
            
            // Remove from local state
            setObligations(prev => prev.filter(o => o.name !== obligationName));
            setAccordionValue(null);

            notifications.show({
                color: 'green',
                title: 'Obligation Deleted',
                message: 'Obligation has been deleted successfully',
            });
        } catch (error) {
            notifications.show({
                color: 'red',
                title: 'Delete Error',
                message: (error as Error).message,
            });
        } finally {
            setIsDeleting(null);
        }
    }, []);

    // Filter obligations based on search text
    const filteredObligations = useMemo(() => {
        if (!filterText.trim()) {
            return obligations;
        }

        const searchText = filterText.toLowerCase();
        return obligations.filter(obligation => {
            // Search in obligation name
            if (obligation.name.toLowerCase().includes(searchText)) {
                return true;
            }

            // Search in author name
            if (obligation.author?.name?.toLowerCase().includes(searchText)) {
                return true;
            }

            return false;
        });
    }, [obligations, filterText]);

    if (loading) {
        return (
            <Center style={{ height: '100%' }}>
                <Stack align="center" gap="md">
                    <Loader />
                    <Text size="sm" c="dimmed">Loading obligations...</Text>
                </Stack>
            </Center>
        );
    }

    if (error) {
        return (
            <Box p="md">
                <Alert variant="light" color="red" title="Error loading obligations">
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box p="md" pb="sm">
                <Group mb="sm">
                    <Title order={4}>Obligations</Title>
                    <ActionIcon
                        variant="filled"
                        color="var(--mantine-primary-color-filled)"
                        onClick={handleCreateNew}
                        disabled={isCreatingNew}
                    >
                        <IconPlus size={20} />
                    </ActionIcon>
                </Group>
                <TextInput
                    placeholder="Filter by name or author..."
                    value={filterText}
                    onChange={(event) => setFilterText(event.currentTarget.value)}
                    leftSection={<IconSearch size={16} />}
                    size="sm"
                />
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, overflowY: 'auto', paddingLeft: '16px', paddingRight: '16px' }}>
                {obligations.length === 0 && !isCreatingNew ? (
                    <Alert variant="light" color="gray" mb="md">
                        <Text size="sm">No obligations found. Click the + button to create one.</Text>
                    </Alert>
                ) : null}
                
                {obligations.length > 0 && filteredObligations.length === 0 && filterText.trim() && !isCreatingNew ? (
                    <Alert variant="light" color="yellow" mb="md">
                        <Text size="sm">No obligations match your filter "{filterText}".</Text>
                    </Alert>
                ) : null}

                <Accordion
                    value={accordionValue}
                    onChange={handleAccordionChange}
                    variant="contained"
                    radius="md"
                    chevronPosition="left"
                >
                    {/* Create New Obligation Accordion Item */}
                    {isCreatingNew && (
                        <Accordion.Item key="create-new" value="create-new">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconPlus size={16} />
                                    <Text fw={500}>Create New Obligation</Text>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <PMLEditor
                                    onExecute={handleCreateObligation}
                                    containerHeight={400}
                                    autoFocus={true}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    )}

                    {/* Existing Obligations */}
                    {filteredObligations.map((obligation) => (
                        <Accordion.Item key={obligation.name} value={obligation.name}>
                            <Accordion.Control>
                                <Group justify="space-between" style={{ width: '100%' }}>
                                    <Group gap="xs">
                                        <IconAutomation size={20} color="blue" />
                                        <Stack gap={0}>
                                            <Text size="md" fw={600}>{obligation.name}</Text>
                                            <Text size="s" c="dimmed" style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                Author: {obligation.author?.name || 'Unknown'}
                                            </Text>
                                        </Stack>
                                    </Group>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Box>
                                    <PMLEditor 
                                        title="Obligation" 
                                        initialValue={obligation.pml}
                                        readOnly
                                        hideButtons
                                        containerHeight={400}
                                    />
                                    <Group justify="center" mt="md">
                                        <Button
                                            color="red"
                                            variant="filled"
                                            leftSection={<IconTrash size={16} />}
                                            loading={isDeleting === obligation.name}
                                            onClick={() => handleDeleteObligation(obligation.name)}
                                        >
                                            Delete Obligation
                                        </Button>
                                    </Group>
                                </Box>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </Box>
        </Box>
    );
}