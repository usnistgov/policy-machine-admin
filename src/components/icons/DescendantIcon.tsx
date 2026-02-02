import React from "react";
import {AscendantIcon} from "@/components/icons/AscendantIcon";

export interface DescendantIconProps {
	size?: string;
	color?: string;
}

export function DescendantIcon({
	                                        size = '14px',
	                                        color = 'currentColor'
                                        }: DescendantIconProps) {
	return (
		<span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
			<AscendantIcon size={size} color={color} />
		</span>
	);
}
