import React, { useState } from 'react';
import {
  AppShell,
  Text,
  Button,
  Group,
  Title,
  useMantineTheme, Tooltip, ActionIcon
} from '@mantine/core';
import {
  IconHierarchy,
  IconUsers,
  IconFiles, IconLayoutSidebar, IconLayoutBottombar, IconLayoutSidebarRight, IconSun, IconMoon
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { UserMenu } from '@/components/UserMenu';
import { PMIcon } from '@/components/icons/PMIcon';
import { AttributeHierarchy } from '@/components/graphv2/AttributeHierarchy';
import { UserManagement } from '@/components/graphv2/UserManagement';
import { ObjectManagement } from '@/components/graphv2/ObjectManagement';
import {useTheme} from "@/contexts/ThemeContext";

type NavigationItem = 'attributes' | 'users' | 'objects';

export function GraphV2() {
  const mantineTheme = useMantineTheme();
  const { themeMode, toggleTheme } = useTheme();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [asideOpened, { toggle: toggleAside }] = useDisclosure(false);
  const [footerOpened, { toggle: toggleFooter }] = useDisclosure(false);

  const [activeNavItem, setActiveNavItem] = useState<NavigationItem>('attributes');

  const renderContent = () => {
    switch (activeNavItem) {
      case 'attributes':
        return <AttributeHierarchy />;
      case 'users':
        return <UserManagement />;
      case 'objects':
        return <ObjectManagement />;
      default:
        return <Text>Select a navigation item</Text>;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { desktop: !desktopOpened },
      }}
      aside={{
        width: 400,
        breakpoint: 'md',
        collapsed: { desktop: !asideOpened },
      }}
      footer={{
        height: 300,
        collapsed: !footerOpened,
      }}
      transitionDuration={0}
    >
      <AppShell.Header style={{ backgroundColor: mantineTheme.other.intellijPanelBg }}>
        <Group h="100%" px="md" justify="space-between" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
          <Group>
            <PMIcon style={{width: '36px', height: '36px'}}/>
            <Title order={2}>Policy Machine</Title>
          </Group>

          <Group gap="xs">
            <Button
              variant={activeNavItem === 'attributes' ? 'filled' : 'subtle'}
              leftSection={<IconHierarchy size={16} />}
              onClick={() => setActiveNavItem('attributes')}
              size="sm"
            >
              Attribute Hierarchy
            </Button>
            <Button
              variant={activeNavItem === 'users' ? 'filled' : 'subtle'}
              leftSection={<IconUsers size={16} />}
              onClick={() => setActiveNavItem('users')}
              size="sm"
            >
              User Management
            </Button>
            <Button
              variant={activeNavItem === 'objects' ? 'filled' : 'subtle'}
              leftSection={<IconFiles size={16} />}
              onClick={() => setActiveNavItem('objects')}
              size="sm"
            >
              Object Management
            </Button>
          </Group>

          <Group>
            <Tooltip label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
              <ActionIcon
                  variant="subtle"
                  size="md"
                  onClick={toggleTheme}
              >
                {themeMode === 'light' ? <IconMoon size={24} /> : <IconSun size={24} />}
              </ActionIcon>
            </Tooltip>
            <UserMenu />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{
        height: '100%',
        position: 'relative',
        paddingLeft: '10%',
        paddingRight: '10%',
        paddingTop: '5%',
        paddingBottom: '10%',
      }}>
        {renderContent()}
      </AppShell.Main>
    </AppShell>
  );
}