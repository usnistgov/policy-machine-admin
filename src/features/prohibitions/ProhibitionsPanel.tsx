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
    TextInput
} from "@mantine/core";
import { IconPlus, IconBan, IconSearch } from "@tabler/icons-react";
import { ProhibitionDetails } from "./ProhibitionDetails";
import { QueryService, Prohibition } from "@/shared/api/pdp.api";
import { TreeNode } from "@/features/pmtree/tree-utils";

interface ProhibitionsPanelProps {
    selectedNodes?: TreeNode[];
}

export function ProhibitionsPanel({ selectedNodes }: ProhibitionsPanelProps) {
    const [prohibitions, setProhibitions] = useState<Prohibition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accordionValue, setAccordionValue] = useState<string | null>(null);
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
        setAccordionValue("create-new");
    }, []);

    const handleCancelCreate = useCallback(() => {
        setIsCreatingNew(false);
        setAccordionValue(null);
    }, []);

    const handleCreateSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        setIsCreatingNew(false);
        setAccordionValue(null);
        
        if (action === 'create' && prohibition) {
            // Manually append the new prohibition to the list
            setProhibitions(prev => [...prev, prohibition]);
        }
    }, []);

    const handleEditSuccess = useCallback((prohibition?: Prohibition, action?: 'create' | 'update' | 'delete') => {
        setAccordionValue(null);
        
        if (action === 'update' && prohibition) {
            // Manually update the prohibition in the list
            setProhibitions(prev => 
                prev.map(p => p.name === prohibition.name ? prohibition : p)
            );
        } else if (action === 'delete') {
            // Manually remove the prohibition from the list
            const prohibitionToDelete = prohibitions.find(p => accordionValue === p.name);
            if (prohibitionToDelete) {
                setProhibitions(prev => prev.filter(p => p.name !== prohibitionToDelete.name));
            }
        }
    }, [accordionValue, prohibitions]);

    const handleAccordionChange = useCallback((value: string | null) => {
        setAccordionValue(value);
        // If closing the create new accordion, cancel creation
        if (value !== "create-new" && isCreatingNew) {
            setIsCreatingNew(false);
        }
    }, [isCreatingNew]);

    // Filter prohibitions based on search text
    const filteredProhibitions = useMemo(() => {
        if (!filterText.trim()) {
            return prohibitions;
        }

        const searchText = filterText.toLowerCase();
        return prohibitions.filter(prohibition => {
            // Search in prohibition name
            if (prohibition.name.toLowerCase().includes(searchText)) {
                return true;
            }

            // Search in subject name
            if (prohibition.subject?.node?.name?.toLowerCase().includes(searchText)) {
                return true;
            }

            // Search in container conditions
            if (prohibition.containerConditions?.some(cc => 
                cc.container?.name?.toLowerCase().includes(searchText)
            )) {
                return true;
            }

            return false;
        });
    }, [prohibitions, filterText]);

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
                <Group mb="sm">
                    <Title order={4}>Prohibitions</Title>
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
                    placeholder="Filter by name, subject, or container..."
                    value={filterText}
                    onChange={(event) => setFilterText(event.currentTarget.value)}
                    leftSection={<IconSearch size={16} />}
                    size="sm"
                />
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, overflowY: 'auto', paddingLeft: '16px', paddingRight: '16px' }}>
                {prohibitions.length === 0 && !isCreatingNew ? (
                    <Alert variant="light" color="gray" mb="md">
                        <Text size="sm">No prohibitions found. Click the + button to create one.</Text>
                    </Alert>
                ) : null}
                
                {prohibitions.length > 0 && filteredProhibitions.length === 0 && filterText.trim() && !isCreatingNew ? (
                    <Alert variant="light" color="yellow" mb="md">
                        <Text size="sm">No prohibitions match your filter "{filterText}".</Text>
                    </Alert>
                ) : null}

                <Accordion
                    value={accordionValue}
                    onChange={handleAccordionChange}
                    variant="contained"
                    radius="md"
                    chevronPosition="left"
                >
                    {/* Create New Prohibition Accordion Item */}
                    {isCreatingNew && (
                        <Accordion.Item key="create-new" value="create-new">
                            <Accordion.Control>
                                <Group gap="xs">
                                    <IconPlus size={16} />
                                    <Text fw={500}>Create New Prohibition</Text>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ProhibitionDetails
                                    selectedNodes={selectedNodes}
                                    onCancel={handleCancelCreate}
                                    onSuccess={handleCreateSuccess}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    )}

                    {/* Existing Prohibitions */}
                    {filteredProhibitions.map((prohibition) => (
                        <Accordion.Item key={prohibition.name} value={prohibition.name}>
                            <Accordion.Control>
                                <Group justify="space-between" style={{ width: '100%' }}>
                                    <Group gap="xs">
                                        <IconBan size={20} color="red" />
                                        <Stack gap={0}>
                                            <Text size="md" fw={600}>{prohibition.name}</Text>
                                            <Text size="s" c="dimmed" style={{ maxWidth: '200px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                {prohibition.subject?.node?.name}
                                            </Text>
                                        </Stack>
                                    </Group>

                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <ProhibitionDetails
                                    selectedNodes={selectedNodes}
                                    initialProhibition={prohibition}
                                    isEditing
                                    onCancel={() => setAccordionValue(null)}
                                    onSuccess={handleEditSuccess}
                                />
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </Box>
        </Box>
    );
}