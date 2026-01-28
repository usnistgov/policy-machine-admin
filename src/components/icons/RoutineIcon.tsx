import React from 'react';
import { BaseOperationIcon, OperationIconProps } from './BaseOperationIcon';

export const RoutineIcon: React.FC<OperationIconProps> = (props) => {
  return (
    <BaseOperationIcon {...props}>
      {/* Four parallel lines */}
      <g strokeWidth="1.75">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="10" x2="20" y2="10" />
        <line x1="4" y1="14" x2="20" y2="14" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </g>
    </BaseOperationIcon>
  );
};
