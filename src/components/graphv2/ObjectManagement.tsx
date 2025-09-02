import React, { useState } from 'react';
import {
  Stack,
  Group,
  Title,
  Button,
  Card,
  Text,
  Badge,
  ActionIcon,
  Grid,
  Select,
  TextInput,
  Box
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconFile, IconFolder, IconDatabase } from '@tabler/icons-react';

// Sample object data
const sampleObjects = [
  { id: '1', name: 'Employee Database', type: 'database', category: 'HR', size: '2.5 GB', lastModified: '2024-01-15', permissions: 'read-write' },
  { id: '2', name: 'Financial Reports', type: 'folder', category: 'Finance', size: '156 MB', lastModified: '2024-01-20', permissions: 'read-only' },
  { id: '3', name: 'Project Specifications', type: 'document', category: 'Engineering', size: '45 MB', lastModified: '2024-01-18', permissions: 'read-write' },
  { id: '4', name: 'Sales Data Q4', type: 'database', category: 'Sales', size: '1.2 GB', lastModified: '2024-01-22', permissions: 'read-only' },
  { id: '5', name: 'Marketing Assets', type: 'folder', category: 'Marketing', size: '890 MB', lastModified: '2024-01-19', permissions: 'read-write' },
  { id: '6', name: 'Code Repository', type: 'folder', category: 'Engineering', size: '3.4 GB', lastModified: '2024-01-23', permissions: 'read-write' },
];

type ObjectType = 'database' | 'folder' | 'document';

export function ObjectManagement() {
  const [objects, setObjects] = useState(sampleObjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const categories = ['HR', 'Finance', 'Engineering', 'Sales', 'Marketing'];
  const types = ['database', 'folder', 'document'];

  const filteredObjects = objects.filter(obj => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         obj.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || obj.category === filterCategory;
    const matchesType = !filterType || obj.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const addObject = () => {
    const newId = `${objects.length + 1}`;
    const newObject = {
      id: newId,
      name: `New Object ${objects.length + 1}`,
      type: 'document' as ObjectType,
      category: 'Engineering',
      size: '0 KB',
      lastModified: new Date().toISOString().split('T')[0],
      permissions: 'read-write'
    };
    setObjects([...objects, newObject]);
  };

  const deleteObject = (objectId: string) => {
    setObjects(objects.filter(obj => obj.id !== objectId));
  };

  const getTypeIcon = (type: ObjectType) => {
    switch (type) {
      case 'database':
        return <IconDatabase size={20} />;
      case 'folder':
        return <IconFolder size={20} />;
      case 'document':
        return <IconFile size={20} />;
      default:
        return <IconFile size={20} />;
    }
  };

  const getPermissionsBadge = (permissions: string) => {
    return (
      <Badge color={permissions === 'read-write' ? 'blue' : 'gray'} variant="light">
        {permissions}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      database: 'green',
      folder: 'yellow',
      document: 'blue'
    };
    return (
      <Badge color={colors[type as keyof typeof colors]} variant="outline" size="sm">
        {type}
      </Badge>
    );
  };

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>Object Management</Title>
        <Button
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={addObject}
        >
          Add Object
        </Button>
      </Group>

      <Card>
        <Group gap="md" mb="md">
          <TextInput
            placeholder="Search objects..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flexGrow: 1 }}
          />
          <Select
            placeholder="Filter by category"
            data={categories}
            value={filterCategory}
            onChange={setFilterCategory}
            clearable
            style={{ minWidth: 150 }}
          />
          <Select
            placeholder="Filter by type"
            data={types}
            value={filterType}
            onChange={setFilterType}
            clearable
            style={{ minWidth: 120 }}
          />
        </Group>

        <Grid>
          {filteredObjects.map((obj) => (
            <Grid.Col span={6} key={obj.id}>
              <Card withBorder>
                <Group justify="space-between" align="flex-start" mb="xs">
                  <Group gap="sm">
                    {getTypeIcon(obj.type as ObjectType)}
                    <Box>
                      <Text fw={500} size="sm">{obj.name}</Text>
                      <Group gap="xs" mt={4}>
                        {getTypeBadge(obj.type)}
                        <Badge variant="dot" color="gray" size="sm">
                          {obj.category}
                        </Badge>
                      </Group>
                    </Box>
                  </Group>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" size="sm">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="subtle" 
                      color="red" 
                      size="sm"
                      onClick={() => deleteObject(obj.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>

                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Size:</Text>
                    <Text size="xs">{obj.size}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Modified:</Text>
                    <Text size="xs">{obj.lastModified}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Permissions:</Text>
                    {getPermissionsBadge(obj.permissions)}
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {filteredObjects.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No objects found matching your criteria.
          </Text>
        )}
      </Card>
    </Stack>
  );
}