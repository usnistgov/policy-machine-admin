import React from "react";
import { IncomingAssociationIcon } from "./IncomingAssociationIcon";

export interface OutgoingAssociationIconProps {
	size?: string;
	color?: string;
}

export function OutgoingAssociationIcon({
	size = '14px',
	color = 'currentColor'
}: OutgoingAssociationIconProps) {
	return (
		<span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}>
			<IncomingAssociationIcon size={size} color={color} />
		</span>
	);
}
