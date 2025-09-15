import '@mantine/core/styles.css';
import '@mantine/core/styles/global.css';

import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import {Notifications} from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import { ThemeProvider, useTheme } from './shared/theme/ThemeContext';

function AppContent() {
    const { theme, themeMode } = useTheme();
    
    return (
        <MantineProvider theme={theme} defaultColorScheme={themeMode} forceColorScheme={themeMode}>
            <QueryClientProvider client={queryClient}>
                <Notifications position="top-right" />
                <Router />
            </QueryClientProvider>
        </MantineProvider>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

