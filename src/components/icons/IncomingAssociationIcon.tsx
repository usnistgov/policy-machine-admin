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
			{/* Triangle pointing left (rotated from tabler triangle) */}
			<g transform="translate(-1 1.4) scale(0.65, 0.88)">
				<g transform="rotate(-90 12 12)">
					<path
						d="M12 2.5a1.5 1.5 0 0 0 -1.3 0.75l-8.5 14.25a1.5 1.5 0 0 0 1.3 2.25h17a1.5 1.5 0 0 0 1.3 -2.25l-8.5 -14.25a1.5 1.5 0 0 0 -1.3 -0.75z"/>
				</g>
			</g>
			{/* Narrow stem */}
			<rect x="10" y="10" width="4" height="4" />
			{/* Dot 1 */}
			<circle cx="17" cy="12" r="2" />
			{/* Dot 2 */}
			<circle cx="22" cy="12" r="2" />
		</svg>
	);
}
