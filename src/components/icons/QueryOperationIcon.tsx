import React from 'react';
import { BaseOperationIcon, OperationIconProps } from './BaseOperationIcon';

export const QueryOperationIcon: React.FC<OperationIconProps> = (props) => {
  const bgFillColor = props.filled ? (props.fillColor || 'var(--mantine-primary-color-filled)') : 'white';

  return (
    <BaseOperationIcon {...props}>
      {/* Magnifying glass - flipped on y-axis */}
      <path d="M21 10a7 7 0 1 0 -14 0a7 7 0 1 0 14 0" fill={bgFillColor} />
      <path d="M3 21l6 -6" />
    </BaseOperationIcon>
  );
};
