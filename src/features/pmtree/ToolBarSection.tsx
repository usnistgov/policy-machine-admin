import React from 'react';
import { Stack, Text, Box } from '@mantine/core';

export interface ToolBarSectionProps {
	title: string;
	children: React.ReactNode;
	contentHeight?: number;
}

export function ToolBarSection({ title, children, contentHeight = 30 }: ToolBarSectionProps) {
	return (
		<Stack gap={2} align="flex-start">
			<Text size="xs" c="dimmed" fw={500}>
				{title}
			</Text>
			<Box style={{ height: contentHeight, display: 'flex', alignItems: 'center' }}>
				{children}
			</Box>
		</Stack>
	);
}