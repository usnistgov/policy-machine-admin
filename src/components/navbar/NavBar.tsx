import {
    IconBan,
    IconBinaryTree,
    IconFileCode,
    IconHome2,
    IconLogout,
    IconSwitchHorizontal,
    IconPlayerPlay,
    IconListTree,
    IconAutomation
} from "@tabler/icons-react";
import {ActionIcon, Divider, Group, Stack, Tooltip, UnstyledButton} from "@mantine/core";
import classes from "./navbar.module.css";
import {PMIcon} from "@/components/icons/PMIcon";
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import { AuthService } from "@/lib/auth";
import { useTheme } from "@/contexts/ThemeContext";

export function NavBar({activePageIndex}: {activePageIndex: number}) {
    const { themeMode } = useTheme();
    const [, setActive] = useState(activePageIndex);
    const navigate = useNavigate();

    const routeChange = (page: string) =>{
        const path = `/${page.toLowerCase()}`;
        navigate(path);
    }

    const links = linkData.map((link, index) => (
        <NavbarLink
            {...link}
            key={link.label}
            active={index === activePageIndex}
            themeMode={themeMode}
            onClick={() => {
                setActive(index);
                routeChange(link.label);
            }}
        />
    ));

    return (
        <Group gap="xs">
            {links}
        </Group>
    )
}

export interface NavBarProps {
    active: string
}

interface NavbarLinkProps {
  active?: boolean;
  icon: typeof IconHome2;
  label: string;
  style?: React.CSSProperties;
  themeMode: string;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, style, active, themeMode, onClick }: NavbarLinkProps) {
  return (
    <UnstyledButton 
      onClick={onClick} 
      className={classes.navbarLink}
      data-active={active || undefined}
      style={{
        color: themeMode === 'dark' 
          ? 'var(--mantine-color-gray-4)' 
          : 'var(--mantine-color-gray-7)',
        '--hover-color': themeMode === 'dark' 
          ? 'var(--mantine-color-gray-8)' 
          : 'var(--mantine-color-gray-1)'
      } as React.CSSProperties}
    >
      <Group gap="xs" wrap="nowrap">
        <Icon stroke={1.5} style={style} size={16} />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
      </Group>
    </UnstyledButton>
  );
}

const linkData = [
    { icon: IconListTree, label: 'Graph'},
    { icon: IconBinaryTree, label: 'DAG', style: {transform: "rotate(180deg)"}},
    { icon: IconBan, label: 'Prohibitions' },
    { icon: IconAutomation, label: 'Obligations' },
    { icon: IconFileCode, label: 'PML' },
    { icon: IconPlayerPlay, label: 'Execute' },
];