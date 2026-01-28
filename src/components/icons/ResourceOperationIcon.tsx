import React from 'react';
import { BaseOperationIcon, OperationIconProps } from './BaseOperationIcon';

export const ResourceOperationIcon: React.FC<OperationIconProps> = (props) => {
  const bgFillColor = props.filled ? (props.fillColor || 'var(--mantine-primary-color-filled)') : 'white';

  return (
    <BaseOperationIcon {...props}>
      {/* File icon */}
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" fill={bgFillColor} />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
    </BaseOperationIcon>
  );
};
