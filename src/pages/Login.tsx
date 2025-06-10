import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, Button, Paper, Title, Container, Group, Stack } from '@mantine/core';
import { PMIcon } from '@/components/icons/PMIcon';
import { AuthService } from '@/lib/auth';

export function Login() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ensure we're logged out when visiting the login page
  AuthService.logout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      return;
    }

    setLoading(true);
    
    // Use the auth service to login
    AuthService.login(username);
    
    // Navigate to the main page
    navigate('/');
    
    setLoading(false);
  };

  return (
    <Container size={500} my={40}>
      <Stack align="center" gap="xl" mb="xl">
        <PMIcon style={{ width: '150px' }} />
        <Title order={1} ta="center" fw={900}>
          Policy Machine Admin Tool
        </Title>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          
          <Group justify="flex-end" mt="xl">
            <Button type="submit" loading={loading}>
              Sign in
            </Button>
          </Group>
        </form>
      </Paper>
    </Container>
  );
} 