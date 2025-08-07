import React, { useEffect, useState } from 'react';
import { Menu, Button, rem, useMantineTheme } from '@mantine/core';
import { IconChevronDown, IconLogout, IconUserSquareRounded } from '@tabler/icons-react';
import { AuthService } from '@/lib/auth';

export function UserMenu() {
    const theme = useMantineTheme();
    const [username, setUsername] = useState<string | null>(null);
    
    useEffect(() => {
        setUsername(AuthService.getUsername());
    }, []);
    
    const handleLogout = () => {
        AuthService.logout(true);
    };

    return (
        <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
                <Button 
                    variant="transparent"
                    style={{
                        borderRadius: '20px' 
                    }}
                    rightSection={<IconChevronDown size={14} />}
                    leftSection={<IconUserSquareRounded size={24} />}
                >
                    {username}
                </Button>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item 
                    leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />} 
                    onClick={handleLogout}
                >
                    Logout
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
} 