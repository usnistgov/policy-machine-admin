import React from 'react';
import { BaseOperationIcon, OperationIconProps } from './BaseOperationIcon';

export const AdminOperationIcon: React.FC<OperationIconProps> = (props) => {
  const bgFillColor = props.filled ? (props.fillColor || 'var(--mantine-primary-color-filled)') : 'white';

  return (
    <BaseOperationIcon {...props}>
      {/* Graph edges */}
      <g strokeWidth="1.75">
        {/* Upper left to bottom (solid) */}
        <line x1="4" y1="4" x2="12" y2="17" />

        {/* Upper left to upper right (dotted) */}
        <line x1="4" y1="4" x2="20" y2="4" strokeDasharray="1 3" />

        {/* Upper right to bottom (solid) */}
        <line x1="20" y1="4" x2="12" y2="17" />

        {/* Graph nodes (circles) */}
        {/* Upper left node */}
        <circle cx="4" cy="4" r="3" fill={bgFillColor} />

        {/* Upper right node */}
        <circle cx="20" cy="4" r="3" fill={bgFillColor} />

        {/* Bottom node */}
        <circle cx="12" cy="17" r="3" fill={bgFillColor} />
      </g>
    </BaseOperationIcon>
  );
};
