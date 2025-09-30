import React, { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFunction, IconPlus, IconX } from "@tabler/icons-react";
import {
  AdjudicationService,
  ParamType,
  QueryService,
  Signature,
} from "@/shared/api/pdp.api";

type FunctionMode = "operation" | "routine";

interface MapEntryValue {
  key: any;
  value: any;
}

export function AdminFunctions() {
  const [mode, setMode] = useState<FunctionMode>("operation");
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedSignature = useMemo(() => {
    return signatures.find((signature) => signature.name === selectedName) ?? null;
  }, [signatures, selectedName]);

  useEffect(() => {
    let isMounted = true;
    async function loadSignatures() {
      setLoading(true);
      try {
        const response =
            mode === "operation"
                ? await QueryService.getAdminOperationNames()
                : await QueryService.getAdminRoutineNames();
        if (!isMounted) {
          return;
        }
        const list = response?.signatures ?? [];
        setSignatures(list);
        setSelectedName(list.length > 0 ? list[0].name ?? null : null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        notifications.show({
          color: "red",
          title: "Failed to load signatures",
          message: (error as Error).message,
        });
        setSignatures([]);
        setSelectedName(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSignatures();
    return () => {
      isMounted = false;
    };
  }, [mode]);

  useEffect(() => {
    if (!selectedSignature) {
      setFormValues({});
      return;
    }

    const nextValues: Record<string, any> = {};
    for (const param of selectedSignature.params ?? []) {
      nextValues[param.name] = createDefaultValueForParamType(param.type);
    }
    setFormValues(nextValues);
  }, [selectedSignature]);

  const handleParamChange = (paramName: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleExecute = async () => {
    if (!selectedSignature || !selectedSignature.name) {
      notifications.show({
        color: "red",
        title: "No function selected",
        message: "Select an admin operation or routine before executing.",
      });
      return;
    }

    const args: Record<string, any> = {};
    for (const param of selectedSignature.params ?? []) {
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
      if (mode === "operation") {
        await AdjudicationService.genericAdminCmd(selectedSignature.name, args);
      } else {
        await AdjudicationService.genericRoutineCmd(selectedSignature.name, args);
      }
      notifications.show({
        color: "green",
        title: "Execution succeeded",
        message: `${mode === "operation" ? "Operation" : "Routine"} "${selectedSignature.name}" executed successfully.`,
      });
    } catch (error) {
      notifications.show({
        color: "red",
        title: "Execution failed",
        message: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectOptions = useMemo(
      () =>
          signatures.map((signature) => ({
            value: signature.name ?? "",
            label: signature.name ?? "(unnamed)",
          })),
      [signatures],
  );

  return (
      <Stack gap="md" p="md" style={{ height: "100%" }}>
        <Group justify="space-between" align="center">
          <Title order={4}>Admin Functions</Title>
          <SegmentedControl
              size="sm"
              value={mode}
              onChange={(value) => setMode(value as FunctionMode)}
              data={[
                { label: "Operations", value: "operation" },
                { label: "Routines", value: "routine" },
              ]}
          />
        </Group>

        {loading ? (
            <Center style={{ flex: 1 }}>
              <Loader size="sm" />
            </Center>
        ) : signatures.length === 0 ? (
            <Center style={{ flex: 1 }}>
              <Text size="sm" c="dimmed">
                No {mode === "operation" ? "operations" : "routines"} available.
              </Text>
            </Center>
        ) : (
            <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
              <Title order={5}>{mode === "operation" ? "Operation" : "Routine"}</Title>
              <Select
                  data={selectOptions}
                  value={selectedName ?? ""}
                  onChange={(value) => setSelectedName(value)}
              />
              <Title order={5}>Parameters</Title>
              <ScrollArea style={{ flex: 1 }}>
                {selectedSignature && (selectedSignature.params?.length ?? 0) > 0 ? (
                    <Accordion
                        chevronPosition="left"
                        variant="contained"
                        multiple
                        defaultValue={selectedSignature.params?.map((param, index) =>
                            param.name && param.name.length > 0 ? param.name : `param-${index}`
                        )}
                    >
                      {selectedSignature.params?.map((param, index) => {
                        const itemValue = param.name && param.name.length > 0 ? param.name : `param-${index}`;
                        const displayName = param.name && param.name.length > 0 ? param.name : `Parameter ${index + 1}`;
                        const typeLabel = formatParamTypeLabel(param.type ?? undefined);
                        return (
                            <Accordion.Item key={itemValue} value={itemValue}>
                              <Accordion.Control>
                                <Group gap="xs" align="center">
                                  <Title order={6}>{displayName}</Title>
                                  <Text size="xs" c="dimmed">
                                    ({typeLabel})
                                  </Text>
                                </Group>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Box>
                                  <ParamField
                                      name={displayName}
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
                ) : (
                    <Box py="sm">
                      <Text size="sm" c="dimmed">
                        This {mode === "operation" ? "operation" : "routine"} has no parameters.
                      </Text>
                    </Box>
                )}
              </ScrollArea>
              <Group justify="flex-end">
                <Button
                    leftSection={<IconFunction size={16} />}
                    onClick={handleExecute}
                    loading={submitting}
                >
                  Execute
                </Button>
              </Group>
            </Stack>
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
