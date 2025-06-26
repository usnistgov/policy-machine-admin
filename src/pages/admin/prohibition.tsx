import {AppShell} from "@mantine/core";
import classes from "./navbar.module.css";
import {NavBar} from "@/components/navbar/NavBar";
import { UserMenu } from "@/components/UserMenu";

export function Prohibition() {
    return (
        <AppShell
            header={{ height: 0 }}
            navbar={{
                width: 75,
                breakpoint: 'sm',
            }}
            padding="md"
        >
            <AppShell.Navbar p="sm" style={{height: "100vh"}} className={classes.navbar}>
                <NavBar activePageIndex={2} />
            </AppShell.Navbar>
            <AppShell.Main style={{height: "100vh"}}>
                <UserMenu />
                prohibitions
            </AppShell.Main>
        </AppShell>
    );
}