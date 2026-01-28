import React, { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Center,
  Code,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFunction, IconPlus, IconRefresh, IconTrash, IconX } from "@tabler/icons-react";
import {
  AdjudicationService,
  ParamType,
  QueryService,
  Signature,
} from "@/shared/api/pdp.api";
import { PMLEditor } from "@/features/pml/PMLEditor";

type OperationType = "admin" | "resource" | "query" | "routine" | "function";

interface MapEntryValue {
  key: any;
  value: any;
}

// Helper function to unwrap protobuf Value message
function unwrapValue(value: any): any {
  if (!value || typeof value !== 'object') {
    return value;
  }

  // Check which oneof field is set and return its value
  if (value.stringValue !== undefined && value.stringValue !== null) {
    return value.stringValue;
  }
  if (value.int64Value !== undefined && value.int64Value !== null) {
    return value.int64Value;
  }
  if (value.boolValue !== undefined && value.boolValue !== null) {
    return value.boolValue;
  }
  if (value.listValue !== undefined && value.listValue !== null) {
    // Recursively unwrap list elements
    if (Array.isArray(value.listValue.values)) {
      return value.listValue.values.map(unwrapValue);
    }
    return value.listValue;
  }
  if (value.mapValue !== undefined && value.mapValue !== null) {
    // Recursively unwrap map values
    if (value.mapValue.values && typeof value.mapValue.values === 'object') {
      const unwrapped: Record<string, any> = {};
      for (const [key, val] of Object.entries(value.mapValue.values)) {
        unwrapped[key] = unwrapValue(val);
      }
      return unwrapped;
    }
    return value.mapValue;
  }

  // If no oneof field is set or recognized, return the value as-is
  return value;
}

interface OperationsProps {
  initialMode?: OperationType;
}

export function Operations({ initialMode = "admin" }: OperationsProps) {
  const [mode, setMode] = useState<OperationType>(initialMode);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string | null>(null);

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    try {
      let list: Signature[];
      switch (mode) {
        case "admin":
          list = await QueryService.getAdminOperationSignatures();
          break;
        case "resource":
          list = await QueryService.getResourceOperationSignatures();
          break;
        case "query":
          list = await QueryService.getQuerySignatures();
          break;
        case "routine":
          list = await QueryService.getRoutineSignatures();
          break;
        case "function":
          list = await QueryService.getFunctionSignatures();
          break;
        default:
          list = [];
      }
      setSignatures(list);
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Failed to load signatures",
        message: (error as Error).message,
      });
      setSignatures([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  const getOperationTypeLabel = useCallback((type: OperationType): string => {
    switch (type) {
      case "admin": return "Admin Operations";
      case "resource": return "Resource Operations";
      case "query": return "Queries";
      case "routine": return "Routines";
      case "function": return "Functions";
      default: return "Operations";
    }
  }, []);

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setAccordionValue("create-new");
  };

  const handleAccordionChange = (value: string | null) => {
    setAccordionValue(value);
    if (value !== "create-new" && isCreatingNew) {
      setIsCreatingNew(false);
    }
  };

  const handleCreateOperation = useCallback(async (pml: string) => {
    try {
      // Execute the PML
      await AdjudicationService.executePML(pml);

      // Wait a moment for the backend to process and make the operation available
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload signatures to include the newly created operation
      await loadSignatures();

      // Reset creation state after successful reload
      setIsCreatingNew(false);
      setAccordionValue(null);

      notifications.show({
        color: 'green',
        title: `${getOperationTypeLabel(mode).slice(0, -1)} Created`,
        message: `${getOperationTypeLabel(mode).slice(0, -1)} has been created successfully`,
      });
    } catch (error) {
      throw error; // Let PMLEditor handle the error display
    }
  }, [mode, loadSignatures]);

  return (
      <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box p="md" pb="sm">
          <Group mb="sm">
            <Title order={4}>{getOperationTypeLabel(mode)}</Title>
            <Group gap="xs">
              <ActionIcon
                variant="filled"
                color="var(--mantine-primary-color-filled)"
                onClick={loadSignatures}
                disabled={loading}
              >
                <IconRefresh size={20} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                color="var(--mantine-primary-color-filled)"
                onClick={handleCreateNew}
                disabled={isCreatingNew}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        {/* Content */}
        <Box style={{ flex: 1, overflowY: 'auto', paddingLeft: '16px', paddingRight: '16px' }}>
          {loading ? (
            <Center style={{ height: '100%' }}>
              <Loader size="sm" />
            </Center>
          ) : (
            <Accordion
              value={accordionValue}
              onChange={handleAccordionChange}
              variant="contained"
              radius="md"
              chevronPosition="left"
            >
              {/* Create New Operation Accordion Item */}
              {isCreatingNew && (
                <Accordion.Item key="create-new" value="create-new">
                  <Accordion.Control>
                    <Group gap="xs">
                      <IconPlus size={16} />
                      <Text fw={500}>Create New {getOperationTypeLabel(mode).slice(0, -1)}</Text>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <PMLEditor
                      onExecute={handleCreateOperation}
                      containerHeight={400}
                      autoFocus={true}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              )}

              {/* Existing Operations */}
              {signatures.length === 0 && !isCreatingNew ? (
                <Center style={{ padding: '2rem' }}>
                  <Text size="sm" c="dimmed">
                    No {getOperationTypeLabel(mode).toLowerCase()} available.
                  </Text>
                </Center>
              ) : null}

              {signatures.map((signature) => (
                <Accordion.Item key={signature.name} value={signature.name || ""}>
                  <Accordion.Control>
                    <Text fw={500}>{signature.name || "(unnamed)"}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <OperationDetails
                      signature={signature}
                      mode={mode}
                      getOperationTypeLabel={getOperationTypeLabel}
                      onDelete={loadSignatures}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Box>
      </Box>
  );
}

interface OperationDetailsProps {
  signature: Signature;
  mode: OperationType;
  getOperationTypeLabel: (type: OperationType) => string;
  onDelete: () => void;
}

function OperationDetails({ signature, mode, getOperationTypeLabel, onDelete }: OperationDetailsProps) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [returnValue, setReturnValue] = useState<any>(null);

  useEffect(() => {
    const nextValues: Record<string, any> = {};
    for (const param of signature.params ?? []) {
      nextValues[param.name] = createDefaultValueForParamType(param.type);
    }
    setFormValues(nextValues);
    setReturnValue(null); // Clear return value when signature changes
  }, [signature]);

  const handleParamChange = (paramName: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleExecute = async () => {
    if (!signature.name) {
      notifications.show({
        color: "red",
        title: "No operation selected",
        message: "Select an operation before executing.",
      });
      return;
    }

    const args: Record<string, any> = {};
    for (const param of signature.params ?? []) {
      const conversion = convertValueForSubmission(
          param.name,
          param.type,
          formValues[param.name],
      );
      if (conversion.error) {
        notifications.show({
          color: "red",
          title: "Invalid parameter value",
          message: conversion.error,
        });
        return;
      }
      if (conversion.include) {
        args[param.name] = conversion.value;
      }
    }

    setSubmitting(true);
    try {
      const response = await AdjudicationService.adjudicateOperation(signature.name, args);

      // Store return value if present, unwrapping the protobuf Value structure
      if (response?.value !== undefined && response?.value !== null) {
        const unwrapped = unwrapValue(response.value);
        setReturnValue(unwrapped);
      } else {
        setReturnValue(null);
      }

      notifications.show({
        color: "green",
        title: "Execution succeeded",
        message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} operation "${signature.name}" executed successfully.`,
      });
    } catch (error) {
      setReturnValue(null);
      notifications.show({
        color: "red",
        title: "Execution failed",
        message: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!signature.name) {
      notifications.show({
        color: "red",
        title: "No operation selected",
        message: "Select an operation before deleting.",
      });
      return;
    }

    setDeleting(true);
    try {
      await AdjudicationService.deleteAdminOperation(signature.name);

      notifications.show({
        color: "green",
        title: "Operation Deleted",
        message: `${getOperationTypeLabel(mode).slice(0, -1)} "${signature.name}" has been deleted successfully.`,
      });

      // Reload the signatures list
      onDelete();
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Delete failed",
        message: (error as Error).message,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack gap="sm">
      {(signature.params?.length ?? 0) > 0 ? (
        <>
          <Title order={5}>Parameters</Title>
          <ScrollArea style={{ maxHeight: 400 }}>
            <Accordion
              chevronPosition="left"
              variant="contained"
              multiple
              defaultValue={signature.params?.map((param, index) =>
                param.name && param.name.length > 0 ? param.name : `param-${index}`
              )}
            >
              {signature.params?.map((param, index) => {
                const itemValue = param.name && param.name.length > 0 ? param.name : `param-${index}`;
                const displayName = param.name && param.name.length > 0 ? param.name : `Parameter ${index + 1}`;
                const typeLabel = formatParamTypeLabel(param.type ?? undefined);
                const hasReqCaps = param.reqCaps && param.reqCaps.values && param.reqCaps.values.length > 0;
                return (
                  <Accordion.Item key={itemValue} value={itemValue}>
                    <Accordion.Control>
                      <Stack gap={2}>
                        <Group gap="xs" align="center">
                          <Title order={6}>{displayName}</Title>
                          <Text size="xs" c="dimmed">
                            ({typeLabel})
                          </Text>
                        </Group>
                        {hasReqCaps && (
                          <Text size="xs" c="blue" fw={500}>
                            Required capabilities: {param.reqCaps!.values.join(', ')}
                          </Text>
                        )}
                      </Stack>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Box>
                        <ParamField
                          name={param.name}
                          type={param.type}
                          value={formValues[param.name]}
                          onChange={(value) => handleParamChange(param.name, value)}
                        />
                      </Box>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </ScrollArea>
        </>
      ) : (
        <Box py="sm">
          <Text size="sm" c="dimmed">
            This {getOperationTypeLabel(mode).toLowerCase().replace(/s$/, '')} has no parameters.
          </Text>
        </Box>
      )}
      <Group justify="flex-end">
        <Button
          leftSection={<IconTrash size={16} />}
          onClick={handleDelete}
          loading={deleting}
          disabled={submitting}
          color="red"
          variant="outline"
        >
          Delete
        </Button>
        <Button
          leftSection={<IconFunction size={16} />}
          onClick={handleExecute}
          loading={submitting}
          disabled={deleting}
        >
          Execute
        </Button>
      </Group>

      {/* Display return value if present */}
      {returnValue !== null && returnValue !== undefined && (
        <Box mt="md" p="md" style={{
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: '4px',
          backgroundColor: 'var(--mantine-color-gray-0)'
        }}>
          <Title order={6} mb="xs">Return Value</Title>
          <Code block style={{
            maxHeight: '300px',
            overflow: 'auto',
            fontSize: '12px',
            whiteSpace: 'pre-wrap'
          }}>
            {JSON.stringify(returnValue, null, 2)}
          </Code>
        </Box>
      )}
    </Stack>
  );
}

interface ParamFieldProps {
  name: string;
  type?: ParamType | null;
  value: any;
  onChange: (value: any) => void;
  depth?: number;
}

function ParamField({ name, type, value, onChange, depth = 0 }: ParamFieldProps) {
  const kind = getParamTypeKind(type);
  const indent = depth > 0 ? depth * 12 : 0;
  const label = name && name.length > 0 ? name : undefined;

  if (kind === "string") {
    return (
        <Box style={{ marginLeft: indent }}>
          <TextInput
              label={label}
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.currentTarget.value)}
              placeholder="Enter text"
          />
        </Box>
    );
  }

  if (kind === "long") {
    return (
        <Box style={{ marginLeft: indent }}>
          <NumberInput
              label={label}
              value={value === "" || value === undefined || value === null ? "" : Number(value)}
              onChange={(val) => onChange(val === "" ? "" : Number(val))}
              allowNegative
          />
        </Box>
    );
  }

  if (kind === "boolean") {
    return (
        <Box style={{ marginLeft: indent }}>
          <Switch
              label={label}
              checked={Boolean(value)}
              labelPosition="left"
              onChange={(event) => onChange(event.currentTarget.checked)}
          />
        </Box>
    );
  }

  if (kind === "any") {
    return (
        <Box style={{ marginLeft: indent }}>
          <Textarea
              label={label ? `${label} (JSON)` : "JSON"}
              autosize
              minRows={3}
              placeholder='Enter JSON, e.g. { "key": "value" }'
              value={typeof value === "string" ? value : ""}
              onChange={(event) => onChange(event.currentTarget.value)}
          />
        </Box>
    );
  }

  if (kind === "list") {
    const items: any[] = Array.isArray(value) ? [...value] : [];
    const elementType = type?.listType?.elementType;
    const title = label ?? "Items";
    return (
      <Box style={{ marginLeft: indent }}>
        <Text fw={500} mb="xs">{title}</Text>
        {items.length === 0 ? (
          <Text size="xs" c="dimmed">
            No items
          </Text>
        ) : (
          <Stack gap="xs">
            {items.map((item, index) => (
            <Box
              key={index}
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "4px",
                padding: "8px",
                paddingRight: "36px",
                position: "relative",
              }}
            >
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onChange(items.filter((_, idx) => idx !== index))}
                style={{ position: "absolute", top: 6, right: 6 }}
              >
                <IconX size={14} color="red" />
              </ActionIcon>
              <ParamField
                name={`Item ${index + 1}`}
                type={elementType}
                value={item}
                  onChange={(childValue) => {
                    const nextValues = [...items];
                    nextValues[index] = childValue;
                    onChange(nextValues);
                  }}
                  depth={depth + 1}
                />
              </Box>
            ))}
          </Stack>
        )}
        <Button
          mt="sm"
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            onChange([...items, createDefaultValueForParamType(elementType)])
          }
        >
          Add item
        </Button>
      </Box>
    );
  }

  const entries: MapEntryValue[] = Array.isArray(value)
      ? [...(value as MapEntryValue[])]
      : [];
  const mapType = type?.mapType;
  const addEntry = () => {
    onChange([
      ...entries,
      createDefaultMapEntry(mapType),
    ]);
  };
  const title = label ?? "Entries";
  return (
    <Box style={{ marginLeft: indent }}>
      <Text fw={500} mb="xs">{title}</Text>
      {entries.length === 0 ? (
        <Text size="xs" c="dimmed">
          No entries
        </Text>
      ) : (
        <Stack gap="xs">
          {entries.map((entry, index) => (
            <Box
              key={index}
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "4px",
                padding: "8px",
                paddingRight: "36px",
                position: "relative",
              }}
            >
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onChange(entries.filter((_, idx) => idx !== index))}
                style={{ position: "absolute", top: 6, right: 6 }}
              >
                <IconX size={14} color="red" />
              </ActionIcon>
              <Stack gap="xs">
                <ParamField
                  name="Key"
                  type={mapType?.keyType}
                  value={entry.key}
                  onChange={(newKey) => {
                    const next = [...entries];
                    next[index] = { ...entry, key: newKey };
                    onChange(next);
                  }}
                  depth={depth + 1}
                />
                <ParamField
                  name="Value"
                  type={mapType?.valueType}
                  value={entry.value}
                  onChange={(newValue) => {
                    const next = [...entries];
                    next[index] = { ...entry, value: newValue };
                    onChange(next);
                  }}
                  depth={depth + 1}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      <Button
        mt="sm"
        variant="outline"
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={addEntry}
      >
        Add entry
      </Button>
    </Box>
  );
}

type ParamTypeKind = "string" | "long" | "boolean" | "list" | "map" | "any";

function getParamTypeKind(paramType?: ParamType | null): ParamTypeKind {
  if (paramType?.stringType !== undefined && paramType.stringType !== null) {
    return "string";
  }
  if (paramType?.longType !== undefined && paramType.longType !== null) {
    return "long";
  }
  if (paramType?.booleanType !== undefined && paramType.booleanType !== null) {
    return "boolean";
  }
  if (paramType?.listType !== undefined && paramType.listType !== null) {
    return "list";
  }
  if (paramType?.mapType !== undefined && paramType.mapType !== null) {
    return "map";
  }
  return "any";
}

function formatParamTypeLabel(paramType?: ParamType | null): string {
  const kind = getParamTypeKind(paramType);
  switch (kind) {
    case "string":
      return "string";
    case "long":
      return "number";
    case "boolean":
      return "boolean";
    case "list": {
      const elementType = paramType?.listType?.elementType;
      return `[]${formatParamTypeLabel(elementType)}`;
    }
    case "map": {
      const keyType = paramType?.mapType?.keyType;
      const valueType = paramType?.mapType?.valueType;
      return `map[${formatParamTypeLabel(keyType)}]${formatParamTypeLabel(valueType)}`;
    }
    case "any":
    default:
      return "JSON";
  }
}

function createDefaultValueForParamType(paramType?: ParamType | null): any {
  const kind = getParamTypeKind(paramType);
  switch (kind) {
    case "string":
      return "";
    case "long":
      return "";
    case "boolean":
      return false;
    case "list":
      return [];
    case "map":
      return [] as MapEntryValue[];
    case "any":
    default:
      return "";
  }
}

function createDefaultMapEntry(mapType?: ParamType["mapType"] | null): MapEntryValue {
  return {
    key: createDefaultValueForParamType(mapType?.keyType ?? undefined),
    value: createDefaultValueForParamType(mapType?.valueType ?? undefined),
  };
}

interface ConversionResult {
  value: any;
  include: boolean;
  error?: string;
}

function convertValueForSubmission(
    paramName: string,
    paramType: ParamType | undefined,
    rawValue: any,
): ConversionResult {
  const kind = getParamTypeKind(paramType);
  switch (kind) {
    case "string": {
      const strValue = typeof rawValue === "string" ? rawValue : "";
      return { value: strValue, include: true };
    }
    case "long": {
      if (rawValue === "" || rawValue === undefined || rawValue === null) {
        return { value: 0, include: true };
      }
      const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return { value: undefined, include: false, error: `${paramName} must be a valid number.` };
      }
      return { value: Math.trunc(numericValue), include: true };
    }
    case "boolean":
      return { value: Boolean(rawValue), include: true };
    case "list": {
      const items = Array.isArray(rawValue) ? [...rawValue] : [];
      const elementType = paramType?.listType?.elementType;
      const converted: any[] = [];
      for (let i = 0; i < items.length; i += 1) {
        const result = convertValueForSubmission(`${paramName}[${i}]`, elementType, items[i]);
        if (result.error) {
          return { value: undefined, include: false, error: result.error };
        }
        if (result.include) {
          converted.push(result.value);
        }
      }
      return { value: converted, include: true };
    }
    case "map": {
      const entries: MapEntryValue[] = Array.isArray(rawValue)
          ? [...(rawValue as MapEntryValue[])]
          : [];
      const mapType = paramType?.mapType;
      const converted: Record<string, any> = {};
      for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        const keyResult = convertValueForSubmission(
            `${paramName}[${i}].key`,
            mapType?.keyType,
            entry?.key,
        );
        if (keyResult.error) {
          return { value: undefined, include: false, error: keyResult.error };
        }
        if (!keyResult.include || keyResult.value === undefined || keyResult.value === null) {
          return {
            value: undefined,
            include: false,
            error: `${paramName} entry ${i + 1} is missing a key.`,
          };
        }
        if (typeof keyResult.value === "string" && keyResult.value.length === 0) {
          return {
            value: undefined,
            include: false,
            error: `${paramName} entry ${i + 1} is missing a key.`,
          };
        }
        const valueResult = convertValueForSubmission(
            `${paramName}[${i}].value`,
            mapType?.valueType,
            entry?.value,
        );
        if (valueResult.error) {
          return { value: undefined, include: false, error: valueResult.error };
        }
        if (valueResult.include) {
          converted[String(keyResult.value)] = valueResult.value;
        }
      }
      return { value: converted, include: true };
    }
    case "any":
    default: {
      const jsonText = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!jsonText) {
        return { value: {}, include: true };
      }
      try {
        const parsed = JSON.parse(jsonText);
        return { value: parsed, include: true };
      } catch (error) {
        return {
          value: undefined,
          include: false,
          error: `${paramName} must be valid JSON.`,
        };
      }
    }
  }
}
