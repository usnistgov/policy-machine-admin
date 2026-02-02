import React from "react";

export interface AscendantIconProps {
	size?: string;
	color?: string;
}

export function AscendantIcon({
	size = '14px',
	color = 'currentColor'
}: AscendantIconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={color}
			style={{ display: 'inline-flex' }}
		>
			<g transform="translate(-1 1.4) scale(0.65, 0.88)">
				<g transform="rotate(-90 12 12)">
					<path
						d="M12 2.5a1.5 1.5 0 0 0 -1.3 0.75l-8.5 14.25a1.5 1.5 0 0 0 1.3 2.25h17a1.5 1.5 0 0 0 1.3 -2.25l-8.5 -14.25a1.5 1.5 0 0 0 -1.3 -0.75z"/>
				</g>
			</g>
			<rect x="10" y="8" width="14" height="8" />
		</svg>
	);
}
