import React from "react";

export interface IncomingAssociationIconProps {
	size?: string;
	color?: string;
}

export function IncomingAssociationIcon({
	size = '14px',
	color = 'currentColor'
}: IncomingAssociationIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={color}
			style={{ display: 'inline-flex' }}
		>
			{/* Wide arrow point */}
			<path d="M1 12 L10 3 L10 21 Z" />
			{/* Narrow stem */}
			<rect x="10" y="10" width="4" height="4" />
			{/* Dot 1 */}
			<circle cx="17" cy="12" r="2" />
			{/* Dot 2 */}
			<circle cx="22" cy="12" r="2" />
		</svg>
	);
}
