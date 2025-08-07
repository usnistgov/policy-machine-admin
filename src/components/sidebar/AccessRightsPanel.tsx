import React from 'react';
import {ActionIcon, Checkbox, Group, Stack, Text, Title} from '@mantine/core';
import {IconTrash} from '@tabler/icons-react';
import { adminAccessRightsSections } from './hooks/useAssociations';

interface AccessRightsPanelProps {
  availableResourceRights: string[];
  adminAccessRights: string[];
  selectedResourceRights: string[];
  selectedAdminRights: string[];
  onResourceRightToggle: (right: string) => void;
  onAdminRightToggle: (right: string) => void;
  onClearResourceRights: () => void;
  onClearAdminRights: () => void;
}

export function AccessRightsPanel({
  availableResourceRights,
  adminAccessRights,
  selectedResourceRights,
  selectedAdminRights,
  onResourceRightToggle,
  onAdminRightToggle,
  onClearResourceRights,
  onClearAdminRights,
}: AccessRightsPanelProps) {
  return (
    <Stack>
      {/* Resource Access Rights */}
      <div>
        <Group justify="space-between" align="center" mb="sm">
          <Title order={6}>Resource Access Rights</Title>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={onClearResourceRights}
            disabled={selectedResourceRights.length === 0}
            title="Clear all resource rights"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {availableResourceRights.map(right => (
            <Checkbox
              key={right}
              label={right}
              checked={selectedResourceRights.includes(right)}
              onChange={() => onResourceRightToggle(right)}
              size="xs"
              mb={4}
              styles={{
                label: { fontSize: '12px' },
                body: { alignItems: 'flex-start' }
              }}
            />
          ))}
        </div>
      </div>

      {/* Admin Access Rights */}
      <div>
        <Group justify="space-between" align="center" mb="sm">
          <Title order={6}>Admin Access Rights</Title>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={onClearAdminRights}
            disabled={selectedAdminRights.length === 0}
            title="Clear all admin rights"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
        <div style={{ overflowY: 'auto' }}>
          {Object.entries(adminAccessRightsSections).map(([sectionName, rights]) => (
            <div key={sectionName} style={{ marginBottom: '12px' }}>
              <Text size="xs" fw={600} c="dimmed" mb={4} style={{ textTransform: 'capitalize' }}>
                {sectionName}
              </Text>
              {rights.map(right => (
                <Checkbox
                  key={right}
                  label={right}
                  checked={selectedAdminRights.includes(right)}
                  onChange={() => onAdminRightToggle(right)}
                  size="xs"
                  mb={4}
                  ml={8}
                  styles={{
                    label: { fontSize: '12px' },
                    body: { alignItems: 'flex-start' }
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Stack>
  );
}