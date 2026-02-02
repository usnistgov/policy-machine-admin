import {AppShell, Group, Title, useMantineTheme} from "@mantine/core";
import {PMIcon} from "@/components/icons/PMIcon";
import {UserMenu} from "@/features/user-menu/UserMenu";
import React from "react";
import {Dashboard} from "@/pages/dashboard/Dashboard";

export function DashboardPage() {
	const mantineTheme = useMantineTheme();

	return (
		<AppShell
			header={{ height: 40 }}
			transitionDuration={0}
			style={{ height: '100vh', overflow: 'hidden' }}
		>
			<AppShell.Header style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
				<Group h="100%" px="md" justify="space-between">
					<Group>
						<PMIcon style={{width: '32px', height: '32px'}}/>
						<Title order={3}>Policy Machine</Title>
					</Group>
					<Group>
						{/*<Tooltip label={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}>
							<ActionIcon
								variant="subtle"
								size="md"
								onClick={toggleTheme}
							>
								{themeMode === 'light' ? <IconMoon size={24} /> : <IconSun size={24} />}
							</ActionIcon>
						</Tooltip>*/}

						<UserMenu />
					</Group>
				</Group>
			</AppShell.Header>
			<AppShell.Main style={{
				backgroundColor: mantineTheme.other.intellijContentBg,
				display: 'flex',
				flexDirection: 'column',
				height: '100vh'
			}}>
				<div style={{ flex: 1, minHeight: 0 }}>
					<Dashboard />
				</div>
			</AppShell.Main>
		</AppShell>
	);
}