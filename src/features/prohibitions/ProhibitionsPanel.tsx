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
import { IconPlus, IconBan, IconSearch, IconRefresh } from "@tabler/icons-react";
import { ProhibitionDetails } from "./ProhibitionDetails";
import { Prohibition } from "@/shared/api/pdp.types";
import * as QueryService from "@/shared/api/pdp_query.api";
import { TreeNode } from "@/features/pmtree/tree-utils";

interface ProhibitionsPanelProps {
    selectedNodes?: TreeNode[];
}

export function ProhibitionsPanel({ selectedNodes }: ProhibitionsPanelProps) {
    const [prohibitions, setProhibitions] = useState<Prohibition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedProhibition, setSelectedProhibition] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [filterText, setFilterText] = useState("");

    // Fetch prohibitions on component mount
    const fetchProhibitions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedProhibitions = await QueryService.getProhibitions();
            setProhibitions(fetchedProhibitions);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProhibitions();
    }, [fetchProhibitions]);

    const handleCreateNew = useCallback(() => {
        setIsCreatingNew(true);
        setSelectedProhibition(null);
    }, []);

    const handleSelectProhibition = useCallback((name: string) => {
        setSelectedProhibition(name);
        setIsCreatingNew(false);
    }, []);

    const handleCancelCreate = useCallback(() => {
        setIsCreatingNew(false);
    }, []);

    const handleCreateSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        setIsCreatingNew(false);

        if (action === 'create' && prohibition) {
            // Manually append the new prohibition to the list
            setProhibitions(prev => [...prev, prohibition]);
            setSelectedProhibition(prohibition.name);
        }
    }, []);

    const handleEditSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        if (action === 'update' && prohibition) {
            // Manually update the prohibition in the list
            setProhibitions(prev =>
                prev.map(p => p.name === prohibition.name ? prohibition : p)
            );
        } else if (action === 'delete') {
            // Manually remove the prohibition from the list
            if (selectedProhibition) {
                setProhibitions(prev => prev.filter(p => p.name !== selectedProhibition));
                setSelectedProhibition(null);
            }
        }
    }, [selectedProhibition]);

    // Filter prohibitions based on search text
    const filteredProhibitions = useMemo(() => {
        if (!filterText.trim()) {
            return prohibitions;
        }

        const searchText = filterText.toLowerCase();
        return prohibitions.filter(prohibition =>
            prohibition.name.toLowerCase().includes(searchText)
        );
    }, [prohibitions, filterText]);

    // Get the currently selected prohibition object
    const currentProhibition = useMemo(() => {
        if (!selectedProhibition) return null;
        return prohibitions.find(p => p.name === selectedProhibition) || null;
    }, [prohibitions, selectedProhibition]);

    if (loading) {
        return (
            <Center style={{ height: '100%' }}>
                <Stack align="center" gap="md">
                    <Loader />
                    <Text size="sm" c="dimmed">Loading prohibitions...</Text>
                </Stack>
            </Center>
        );
    }

    if (error) {
        return (
            <Box p="md">
                <Alert variant="light" color="red" title="Error loading prohibitions">
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
                    <Title order={4}>Prohibitions</Title>
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
                                placeholder="Filter prohibitions..."
                                value={filterText}
                                onChange={(event) => setFilterText(event.currentTarget.value)}
                                leftSection={<IconSearch size={16} />}
                                size="sm"
                                style={{ flex: 1 }}
                            />
                            <ActionIcon
                                variant="light"
                                color="var(--mantine-primary-color-filled)"
                                onClick={fetchProhibitions}
                                disabled={loading}
                            >
                                <IconRefresh size={20} />
                            </ActionIcon>
                        </Group>
                    </Box>

                    {/* Prohibition List */}
                    <Box style={{ flex: 1, overflowY: 'auto' }}>
                        {prohibitions.length === 0 && !isCreatingNew ? (
                            <Box p="md">
                                <Text size="sm" c="dimmed">No prohibitions found.</Text>
                            </Box>
                        ) : null}

                        {prohibitions.length > 0 && filteredProhibitions.length === 0 && filterText.trim() ? (
                            <Box p="md">
                                <Text size="sm" c="dimmed">No matches found.</Text>
                            </Box>
                        ) : null}

                        {filteredProhibitions.map((prohibition) => (
                            <NavLink
                                key={prohibition.name}
                                label={prohibition.name}
                                leftSection={<IconBan size={16} color="red" />}
                                active={selectedProhibition === prohibition.name && !isCreatingNew}
                                onClick={() => handleSelectProhibition(prohibition.name)}
                            />
                        ))}
                    </Box>
                </Box>

                {/* Right Panel - Details */}
                <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {isCreatingNew ? (
                        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 10px 10px 10px' }}>
                            <Group mb="md" justify="space-between">
                                <Title order={5}>Create New Prohibition</Title>
                            </Group>
                            <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                <ProhibitionDetails
                                    selectedNodes={selectedNodes}
                                    onCancel={handleCancelCreate}
                                    onSuccess={handleCreateSuccess}
                                />
                            </Box>
                        </Box>
                    ) : currentProhibition ? (
                        <Box p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Group mb="md" justify="space-between">
                                <Stack gap={0}>
                                    <Title order={5}>{currentProhibition.name}</Title>
                                    <Text size="sm" c="dimmed">Subject: {currentProhibition.subject?.node?.name || 'Unknown'}</Text>
                                </Stack>
                            </Group>
                            <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                                <ProhibitionDetails
                                    selectedNodes={selectedNodes}
                                    initialProhibition={currentProhibition}
                                    isEditing
                                    onCancel={() => setSelectedProhibition(null)}
                                    onSuccess={handleEditSuccess}
                                />
                            </Box>
                        </Box>
                    ) : (
                        <Center style={{ height: '100%' }}>
                            <Stack align="center" gap="xs">
                                <IconBan size={48} color="gray" />
                                <Text c="dimmed" size="sm">Select a prohibition to view details</Text>
                            </Stack>
                        </Center>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
