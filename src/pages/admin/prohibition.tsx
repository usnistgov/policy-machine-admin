import {AppShell, Stack, Text, Card, List, Loader, Alert, Badge, Divider} from "@mantine/core";
import {useEffect, useState} from "react";
import {IconBan, IconAlertCircle} from "@tabler/icons-react";
import classes from "./navbar.module.css";
import {NavBar} from "@/components/navbar/NavBar";
import {UserMenu} from "@/components/UserMenu";
import {QueryService, Prohibition as ProhibitionType} from "@/api/pdp.api";

export function Prohibition() {
    const [prohibitions, setProhibitions] = useState<ProhibitionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProhibitions();
    }, []);

    const fetchProhibitions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await QueryService.getProhibitions();
            setProhibitions(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch prohibitions');
        } finally {
            setLoading(false);
        }
    };

    const renderSubject = (prohibition: ProhibitionType) => {
        if (!prohibition.subject) return "No subject";
        if (prohibition.subject.process) return `Process: ${prohibition.subject.process}`;
        if (prohibition.subject.node) return `Node: ${prohibition.subject.node.name} (${prohibition.subject.node.type})`;
        return "Unknown subject";
    };

    const renderContainerConditions = (containerConditions: ProhibitionType['containerConditions']) => {
        if (!containerConditions || containerConditions.length === 0) return null;
        
        return (
            <div>
                <Text size="sm" fw={500} mb="xs">Container Conditions:</Text>
                <List size="sm">
                    {containerConditions.map((cc, index) => (
                        <List.Item key={index}>
                            {cc.container ? `${cc.container.name} (${cc.container.type})` : 'Unknown container'}
                            {cc.complement && <Badge size="xs" color="orange" ml="xs">Complement</Badge>}
                        </List.Item>
                    ))}
                </List>
            </div>
        );
    };

    return (
        <AppShell
            header={{ height: 0 }}
            navbar={{
                width: 75,
                breakpoint: 'sm',
            }}
            padding="md"
        >
            <AppShell.Navbar p="sm" style={{height: "100vh"}} className={classes.navbar}>
                <NavBar activePageIndex={2} />
            </AppShell.Navbar>
            <AppShell.Main style={{height: "100vh", overflow: "auto"}}>
                <UserMenu />
                <Stack gap="md" p="md">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <IconBan size={24} />
                        <Text size="xl" fw={600}>Prohibitions</Text>
                    </div>

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                            <Loader size="md" />
                        </div>
                    )}

                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
                            {error}
                        </Alert>
                    )}

                    {!loading && !error && prohibitions.length === 0 && (
                        <Alert color="blue" title="No Prohibitions">
                            No prohibitions are currently configured in the system.
                        </Alert>
                    )}

                    {!loading && !error && prohibitions.length > 0 && (
                        <Stack gap="md">
                            {prohibitions.map((prohibition, index) => (
                                <Card key={index} shadow="sm" padding="lg" withBorder>
                                    <Stack gap="sm">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text fw={600} size="lg">{prohibition.name}</Text>
                                            <Badge color={prohibition.intersection ? "orange" : "blue"}>
                                                {prohibition.intersection ? "Intersection" : "Union"}
                                            </Badge>
                                        </div>

                                        <Divider />

                                        <div>
                                            <Text size="sm" fw={500} mb="xs">Subject:</Text>
                                            <Text size="sm" c="dimmed">{renderSubject(prohibition)}</Text>
                                        </div>

                                        <div>
                                            <Text size="sm" fw={500} mb="xs">Access Rights:</Text>
                                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                {prohibition.accessRights.length > 0 ? (
                                                    prohibition.accessRights.map((right, idx) => (
                                                        <Badge key={idx} size="sm" variant="light" color="red">
                                                            {right}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <Text size="sm" c="dimmed">No access rights specified</Text>
                                                )}
                                            </div>
                                        </div>

                                        {renderContainerConditions(prohibition.containerConditions)}
                                    </Stack>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Stack>
            </AppShell.Main>
        </AppShell>
    );
}