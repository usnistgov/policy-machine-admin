import {AppShell} from "@mantine/core";
import classes from "./navbar.module.css";
import {NavBar} from "@/components/navbar/NavBar";
import { PMLEditor } from "@/components/PMLEditor";
import { UserMenu } from "@/components/UserMenu";

export function PML() {
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
            <AppShell.Main>
                <UserMenu />
                <div style={{ padding: "8px", height: "calc(100vh - 32px)" }}>
                    <PMLEditor
                        title="PML Editor"
                        placeholder={``}
                    />
                </div>
            </AppShell.Main>
        </AppShell>
    );
}