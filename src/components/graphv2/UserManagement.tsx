import React, { useState } from 'react';
import {
  Stack,
  Group,
  Title,
  Button,
  Table,
  Text,
  Badge,
  ActionIcon,
  Card,
  TextInput,
  Select
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconSearch } from '@tabler/icons-react';

// Sample user data
const sampleUsers = [
  { id: '1', name: 'John Doe', email: 'john.doe@company.com', department: 'Engineering', role: 'Developer', status: 'active' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@company.com', department: 'Sales', role: 'Manager', status: 'active' },
  { id: '3', name: 'Bob Johnson', email: 'bob.johnson@company.com', department: 'HR', role: 'Coordinator', status: 'inactive' },
  { id: '4', name: 'Alice Wilson', email: 'alice.wilson@company.com', department: 'Engineering', role: 'Senior Developer', status: 'active' },
  { id: '5', name: 'Charlie Brown', email: 'charlie.brown@company.com', department: 'Finance', role: 'Analyst', status: 'active' },
];

export function UserManagement() {
  const [users, setUsers] = useState(sampleUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);

  const departments = ['Engineering', 'Sales', 'HR', 'Finance'];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = !filterDepartment || user.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const addUser = () => {
    const newId = `${users.length + 1}`;
    const newUser = {
      id: newId,
      name: `New User ${users.length + 1}`,
      email: `user${users.length + 1}@company.com`,
      department: 'Engineering',
      role: 'Developer',
      status: 'active'
    };
    setUsers([...users, newUser]);
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge color={status === 'active' ? 'green' : 'gray'} variant="light">
        {status}
      </Badge>
    );
  };

  return (
    <Stack>
      <Group justify="space-between" align="center">
        <Title order={3}>User Management</Title>
        <Button
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={addUser}
        >
          Add User
        </Button>
      </Group>

      <Card>
        <Group gap="md" mb="md">
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            style={{ flexGrow: 1 }}
          />
          <Select
            placeholder="Filter by department"
            data={departments}
            value={filterDepartment}
            onChange={setFilterDepartment}
            clearable
            style={{ minWidth: 200 }}
          />
        </Group>

        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>
                  <Text fw={500}>{user.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{user.email}</Text>
                </Table.Td>
                <Table.Td>{user.department}</Table.Td>
                <Table.Td>{user.role}</Table.Td>
                <Table.Td>{getStatusBadge(user.status)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" size="sm">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon 
                      variant="subtle" 
                      color="red" 
                      size="sm"
                      onClick={() => deleteUser(user.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {filteredUsers.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No users found matching your criteria.
          </Text>
        )}
      </Card>
    </Stack>
  );
}