import { AppShell, Container, Title, Tabs, Box, Paper, Text, Group, Button, TextInput, Select, NumberInput, Switch, Stack, Alert, Code, Notification, Grid } from "@mantine/core";
import { IconInfoCircle, IconPlayerPlay, IconAlertCircle, IconCheck } from "@tabler/icons-react";
import classes from "./navbar.module.css";
import { NavBar } from "@/components/navbar/NavBar";
import { UserMenu } from "@/components/UserMenu";
import { useState, useEffect } from "react";
import { QueryService, AdjudicationService, Signature } from "@/api/pdp.api";
import { Param, ParamType } from "@/generated/grpc/pdp_query";
import { useForm } from "@mantine/form";
import { theme } from "@/theme";

interface FormValues {
  [key: string]: any;
}

export function Execute() {
  const [operationSignatures, setOperationSignatures] = useState<Signature[]>([]);
  const [routineSignatures, setRoutineSignatures] = useState<Signature[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>("operations");
  const [selectedFunction, setSelectedFunction] = useState<string>("");
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    initialValues: {},
  });

  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      const [operationsResponse, routinesResponse] = await Promise.all([
        QueryService.getAdminOperationNames(),
        QueryService.getAdminRoutineNames()
      ]);
      
      setOperationSignatures(operationsResponse.signatures || []);
      setRoutineSignatures(routinesResponse.signatures || []);
    } catch (err) {
      setError(`Failed to load function signatures: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleTabChange = (value: string | null) => {
    setSelectedTab(value);
    // Reset selection when switching tabs
    setSelectedFunction("");
    setSelectedSignature(null);
    setResult(null);
    setError(null); // Also clear any errors
    form.reset();
  };

  const handleFunctionSelect = async (functionName: string) => {
    setSelectedFunction(functionName);
    setResult(null);
    setError(null);
    
    if (!functionName) {
      setSelectedSignature(null);
      form.reset();
      return;
    }

    try {
      let signature: Signature;
      
      if (selectedTab === "operations") {
        signature = await QueryService.getAdminOperation(functionName);
      } else {
        signature = await QueryService.getAdminRoutine(functionName);
      }
      
      setSelectedSignature(signature);
      
      // Reset form with default values based on signature
      const initialValues: FormValues = {};
      signature.params?.forEach(param => {
        initialValues[param.name] = getDefaultValue(param.type);
      });
      form.setValues(initialValues);
    } catch (err) {
      setError(`Failed to load function signature: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getDefaultValue = (paramType?: ParamType): any => {
    if (!paramType) return "";
    
    if (paramType.stringType) return "";
    if (paramType.longType) return 0;
    if (paramType.booleanType) return false;
    if (paramType.listType) return [];
    if (paramType.mapType) return {};
    if (paramType.anyType) return "";
    
    return "";
  };

  const renderFormField = (param: Param) => {
    const { name, type } = param;
    
    if (!type) {
      return (
        <TextInput
          key={name}
          label={name}
          {...form.getInputProps(name)}
        />
      );
    }

    if (type.stringType) {
      return (
        <TextInput
          key={name}
          label={name}
          placeholder="Enter string value"
          {...form.getInputProps(name)}
        />
      );
    }

    if (type.longType) {
      return (
        <NumberInput
          key={name}
          label={name}
          placeholder="Enter number"
          {...form.getInputProps(name)}
        />
      );
    }

    if (type.booleanType) {
      return (
        <Switch
          key={name}
          label={name}
          {...form.getInputProps(name, { type: 'checkbox' })}
        />
      );
    }

    if (type.listType) {
      return (
        <TextInput
          key={name}
          label={`${name} (comma-separated list)`}
          placeholder="item1,item2,item3"
          {...form.getInputProps(name)}
          onChange={(event) => {
            const value = event.currentTarget.value;
            const list = value ? value.split(',').map(item => item.trim()) : [];
            form.setFieldValue(name, list);
          }}
          value={Array.isArray(form.values[name]) ? form.values[name].join(',') : form.values[name]}
        />
      );
    }

    if (type.mapType) {
      return (
        <TextInput
          key={name}
          label={`${name} (JSON object)`}
          placeholder='{"key": "value"}'
          {...form.getInputProps(name)}
          onChange={(event) => {
            const value = event.currentTarget.value;
            try {
              const obj = value ? JSON.parse(value) : {};
              form.setFieldValue(name, obj);
            } catch {
              form.setFieldValue(name, value);
            }
          }}
          value={typeof form.values[name] === 'object' ? JSON.stringify(form.values[name]) : form.values[name]}
        />
      );
    }

    // Default to string input for any type
    return (
      <TextInput
        key={name}
        label={`${name} (any type)`}
        placeholder="Enter value"
        {...form.getInputProps(name)}
      />
    );
  };

  const executeFunction = async () => {
    if (!selectedSignature) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const args: Record<string, any> = {};
      
      // Process form values to match expected types
      selectedSignature.params?.forEach(param => {
        const value = form.values[param.name];
        if (value !== undefined && value !== null && value !== "") {
          args[param.name] = value;
        }
      });

      let response;
      if (selectedTab === "operations") {
        response = await AdjudicationService.genericAdminCmd(selectedSignature.name, args);
      } else {
        response = await AdjudicationService.genericRoutineCmd(selectedSignature.name, args);
      }
      setResult(response);
    } catch (err) {
      setError(`Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSignatures = selectedTab === "operations" ? operationSignatures : routineSignatures;
  const functionOptions = currentSignatures.map(sig => ({
    value: sig.name,
    label: sig.name
  }));

  const functionSelectLabel = selectedTab === "operations" ? "Select Operation" : "Select Routine";

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
                        <NavBar activePageIndex={5} />
      </AppShell.Navbar>
      <AppShell.Main>
        <UserMenu />
        <Container size="xl" style={{ padding: "8px", height: "calc(100vh - 32px)" }}>
          <Stack gap="md">
            <Title order={2} c={theme.colors?.violet?.[6]}>Function Execution</Title>
            
            <Paper p="md" shadow="sm" radius="md">
              <Tabs value={selectedTab} onChange={handleTabChange}>
                <Tabs.List>
                  <Tabs.Tab value="operations" leftSection={<IconPlayerPlay size={16} />}>
                    Admin Operations
                  </Tabs.Tab>
                  <Tabs.Tab value="routines" leftSection={<IconPlayerPlay size={16} />}>
                    Admin Routines
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="operations" pt="md">
                  <Stack gap="md">
                    <Grid>
                      <Grid.Col span={6}>
                        <Stack gap="md">
                          <Select
                            key={`operations-${selectedTab}`}
                            label={functionSelectLabel}
                            placeholder="Choose a function to execute"
                            data={functionOptions}
                            value={selectedFunction}
                            onChange={(value) => handleFunctionSelect(value || "")}
                            searchable
                            clearable
                          />

                          {selectedSignature && (
                            <Box>                              
                              {selectedSignature.params && selectedSignature.params.length > 0 ? (
                                <Stack gap="sm">
                                  {selectedSignature.params.map(param => renderFormField(param))}
                                </Stack>
                              ) : (
                                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                                  This function doesn't require any parameters
                                </Alert>
                              )}

                              <Group mt="md">
                                <Button
                                  onClick={executeFunction}
                                  loading={isLoading}
                                  leftSection={<IconPlayerPlay size={16} />}
                                  color={theme.colors?.violet?.[6]}
                                >
                                  Execute Function
                                </Button>
                              </Group>
                            </Box>
                          )}
                        </Stack>
                      </Grid.Col>
                      
                      <Grid.Col span={6}>
                        {error && (
                          <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error" mb="md">
                            {error}
                          </Alert>
                        )}

                        {result ? (
                          <Box>
                            <Group gap="xs" mb="md">
                              <IconCheck size={16} color={theme.colors?.green?.[6]} />
                              <Text size="sm" fw={500}>Execution Result</Text>
                            </Group>
                            <Code block style={{ maxHeight: "400px", overflow: "auto" }}>
                              {JSON.stringify(result, null, 2)}
                            </Code>
                          </Box>
                        ) : (
                          <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", backgroundColor: "var(--mantine-color-gray-0)", border: "1px dashed var(--mantine-color-gray-4)", borderRadius: "var(--mantine-radius-md)" }}>
                            
                          </Box>
                        )}
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="routines" pt="md">
                  <Stack gap="md">
                    <Grid>
                      <Grid.Col span={6}>
                        <Stack gap="md">
                          <Select
                            key={`routines-${selectedTab}`}
                            label={functionSelectLabel}
                            placeholder="Choose a function to execute"
                            data={functionOptions}
                            value={selectedFunction}
                            onChange={(value) => handleFunctionSelect(value || "")}
                            searchable
                            clearable
                          />

                          {selectedSignature && (
                            <Box>
                              <Text size="sm" fw={500} mb="md">Function Parameters</Text>
                              
                              {selectedSignature.params && selectedSignature.params.length > 0 ? (
                                <Stack gap="sm">
                                  {selectedSignature.params.map(param => renderFormField(param))}
                                </Stack>
                              ) : (
                                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                                  This function doesn't require any parameters
                                </Alert>
                              )}

                              <Group mt="md">
                                <Button
                                  onClick={executeFunction}
                                  loading={isLoading}
                                  leftSection={<IconPlayerPlay size={16} />}
                                  color={theme.colors?.violet?.[6]}
                                >
                                  Execute Function
                                </Button>
                              </Group>
                            </Box>
                          )}
                        </Stack>
                      </Grid.Col>
                      
                      <Grid.Col span={6}>
                        {error && (
                          <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error" mb="md">
                            {error}
                          </Alert>
                        )}

                        {result ? (
                          <Box>
                            <Group gap="xs" mb="md">
                              <IconCheck size={16} color={theme.colors?.green?.[6]} />
                              <Text size="sm" fw={500}>Execution Result</Text>
                            </Group>
                            <Code block style={{ maxHeight: "400px", overflow: "auto" }}>
                              {JSON.stringify(result, null, 2)}
                            </Code>
                          </Box>
                        ) : (
                          <Box style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", backgroundColor: "var(--mantine-color-gray-0)", border: "1px dashed var(--mantine-color-gray-4)", borderRadius: "var(--mantine-radius-md)" }}>
                            <Text c="dimmed" ta="center">
                              Results will appear here after execution
                            </Text>
                          </Box>
                        )}
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
} 