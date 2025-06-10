import {
    IconBan,
    IconBinaryTree,
    IconFileCode,
    IconHome2,
    IconLogout,
    IconSwitchHorizontal,
    IconPlayerPlay,
    IconListTree
} from "@tabler/icons-react";
import {Divider, Stack, Tooltip, UnstyledButton} from "@mantine/core";
import classes from "./navbar.module.css";
import {PMIcon} from "@/components/icons/PMIcon";
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import { AuthService } from "@/lib/auth";

export function NavBar({activePageIndex}: {activePageIndex: number}) {
    const [, setActive] = useState(activePageIndex);
    const navigate = useNavigate();

    const routeChange = (page: string) =>{
        const path = `/${page.toLowerCase()}`;
        navigate(path);
    }

    const handleLogout = () => {
        AuthService.logout(true);
    };

    const links = linkData.map((link, index) => (
        <NavbarLink
            {...link}
            key={link.label}
            active={index === activePageIndex}
            onClick={() => {
                setActive(index);
                routeChange(link.label);
            }}
        />
    ));

    return (
        <>
            <div className={classes.navbarMain}>
                <Stack justify="center" gap={0}>
                    <PMIcon />
                    <Divider style={{marginTop: "20px", marginBottom: "20px"}} />
                    {links}
                </Stack>
            </div>
        </>
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

  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, style, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon stroke={2} style={style} />
      </UnstyledButton>
    </Tooltip>
  );
}

const linkData = [
    { icon: IconListTree, label: 'Graph'},
    { icon: IconBinaryTree, label: 'DAG', style: {transform: "rotate(180deg)"}},
    { icon: IconBan, label: 'Prohibitions' },
    { icon: IconFileCode, label: 'PML' },
    { icon: IconPlayerPlay, label: 'Execute' },
];