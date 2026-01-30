import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    ActionIcon,
    Box,
    Text,
    Group,
    Title,
    Stack,
    Alert,
    Loader,
    Center,
    TextInput,
    Button,
    NavLink
} from "@mantine/core";
import {IconPlus, IconSearch, IconTrash, IconCalendarCode, IconRefresh} from "@tabler/icons-react";
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
    const [selectedObligation, setSelectedObligation] = useState<string | null>(null);
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
        setSelectedObligation(null);
    }, []);

    const handleSelectObligation = useCallback((name: string) => {
        setSelectedObligation(name);
        setIsCreatingNew(false);
    }, []);

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

        // Reset creation state and select the new obligation
        setIsCreatingNew(false);
        setSelectedObligation(extractedName);

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
            setSelectedObligation(null);

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
        return obligations.filter(obligation =>
            obligation.name.toLowerCase().includes(searchText)
        );
    }, [obligations, filterText]);

    // Get the currently selected obligation object
    const currentObligation = useMemo(() => {
        if (!selectedObligation) {return null;}
        return obligations.find(o => o.name === selectedObligation) || null;
    }, [obligations, selectedObligation]);

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
                <Group>
                    <Title order={4}>Obligations</Title>
                    <Button
                        variant="filled"
                        color="var(--mantine-primary-color-filled)"
                        onClick={handleCreateNew}
                        disabled={isCreatingNew}
                        rightSection={<IconPlus size={20} />}
                    >
                        Create
                    </Button>
                </Group>
            </Box>

            {/* Content - List and Details side by side */}
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
                {/* Left Panel - List */}
                <Box style={{ width: '250px', borderRight: '1px solid var(--mantine-color-default-border)', display: 'flex', flexDirection: 'column' }}>
                    <Box p="sm">
                        <Group gap="xs">
                            <TextInput
                                placeholder="Filter obligations..."
                                value={filterText}
                                onChange={(event) => setFilterText(event.currentTarget.value)}
                                leftSection={<IconSearch size={16} />}
                                size="sm"
                                style={{ flex: 1 }}
                            />
                            <ActionIcon
                                variant="light"
                                color="var(--mantine-primary-color-filled)"
                                onClick={fetchObligations}
                                disabled={loading}
                            >
                                <IconRefresh size={20} />
                            </ActionIcon>
                        </Group>
                    </Box>

                    {/* Obligation List */}
                    <Box style={{ flex: 1, overflowY: 'auto' }}>
                    {obligations.length === 0 && !isCreatingNew ? (
                        <Box p="md">
                            <Text size="sm" c="dimmed">No obligations found.</Text>
                        </Box>
                    ) : null}

                    {obligations.length > 0 && filteredObligations.length === 0 && filterText.trim() ? (
                        <Box p="md">
                            <Text size="sm" c="dimmed">No matches found.</Text>
                        </Box>
                    ) : null}

                    {filteredObligations.map((obligation) => (
                        <NavLink
                            key={obligation.name}
                            label={obligation.name}
                            leftSection={<IconCalendarCode size={16} />}
                            active={selectedObligation === obligation.name && !isCreatingNew}
                            onClick={() => handleSelectObligation(obligation.name)}
                        />
                    ))}
                    </Box>
                </Box>

                {/* Right Panel - Details */}
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {isCreatingNew ? (
                        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 10px 10px 10px' }}>
                            <Group mb="md" justify="space-between">
                                <Title order={5}>Create New Obligation</Title>
                                <Button variant="default" size="xs" onClick={() => setIsCreatingNew(false)}>
                                    Cancel
                                </Button>
                            </Group>
                            <Box style={{ flex: 1, minHeight: 0 }}>
                                <PMLEditor
                                    onExecute={handleCreateObligation}
                                    containerHeight="100%"
                                    autoFocus
                                />
                            </Box>
                        </Box>
                    ) : currentObligation ? (
                        <Box p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Group mb="md" justify="space-between">
                                <Stack gap={0}>
                                    <Title order={5}>{currentObligation.name}</Title>
                                    <Text size="sm" c="dimmed">Author: {currentObligation.author?.name || 'Unknown'}</Text>
                                </Stack>
                                <Button
                                    color="red"
                                    variant="light"
                                    size="xs"
                                    leftSection={<IconTrash size={14} />}
                                    loading={isDeleting === currentObligation.name}
                                    onClick={() => handleDeleteObligation(currentObligation.name)}
                                >
                                    Delete
                                </Button>
                            </Group>
                            <Box style={{ flex: 1, minHeight: 0 }}>
                                <PMLEditor
                                    initialValue={currentObligation.pml}
                                    readOnly
                                    hideButtons
                                    containerHeight="100%"
                                />
                            </Box>
                        </Box>
                    ) : (
                        <Center style={{ height: '100%' }}>
                            <Stack align="center" gap="xs">
                                <IconCalendarCode size={48} color="gray" />
                                <Text c="dimmed" size="sm">Select an obligation to view details</Text>
                            </Stack>
                        </Center>
                    )}
                </Box>
            </Box>
        </Box>
    );
}