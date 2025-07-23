import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import {Notifications} from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";

export default function App() {
    return (
        <MantineProvider theme={theme}>
            <QueryClientProvider client={queryClient}>
                <Notifications position="top-right" />
                <Router />
            </QueryClientProvider>
        </MantineProvider>
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

