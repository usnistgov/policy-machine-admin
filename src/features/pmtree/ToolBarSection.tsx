import React from 'react';
import { Stack, Text, Center } from '@mantine/core';

export interface ToolBarSectionProps {
	title: string;
	children: React.ReactNode;
	contentHeight?: number;
}

export function ToolBarSection({ title, children, contentHeight = 30 }: ToolBarSectionProps) {
	return (
		<Stack gap={2}>
			<Text size="xs" c="dimmed" fw={500}>
				{title}
			</Text>
			<Center style={{ height: contentHeight }}>
				{children}
			</Center>
		</Stack>
	);
}