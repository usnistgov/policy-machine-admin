import icon from "@/assets/pm-icon.svg"
import React from 'react';

interface PMIconProps {
  style?: React.CSSProperties;
}

export function PMIcon({ style }: PMIconProps) {
    return (
        <img src={icon} alt="Policy Machine Icon" style={style} />
    )
}