import React from 'react';

export interface OperationIconProps {
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  filled?: boolean;
  fillColor?: string;
}

interface BaseOperationIconProps extends OperationIconProps {
  children: React.ReactNode;
}

const CogOverlay: React.FC<{
  bgFillColor: string;
  innerFillColor: string;
  color: string;
}> = ({ bgFillColor, innerFillColor, color }) => (
  <g transform="translate(9, 9) scale(0.667)" stroke={color} strokeWidth="2.5">
    <path
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z"
      fill={bgFillColor}
    />
    <path
      d="M9.5 7.75 a0.5 0.5 0 0 0 -0.5 0.5 v7.5 a0.5 0.5 0 0 0 0.762 .426 l7 -3.75 a0.5 0.5 0 0 0 0 -.852 l-7 -3.75 a0.5 0.5 0 0 0 -.262 -.074 z"
      fill={innerFillColor}
      stroke="none"
    />
  </g>
);

export const BaseOperationIcon: React.FC<BaseOperationIconProps> = ({
  size = 24,
  stroke = 2,
  color = 'currentColor',
  className = '',
  filled = false,
  fillColor = 'var(--mantine-primary-color-filled)',
  children,
}) => {
  const bgFillColor = filled ? fillColor : 'white';
  const innerFillColor = filled ? 'white' : color;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
      <CogOverlay
        bgFillColor={bgFillColor}
        innerFillColor={innerFillColor}
        color={color}
      />
    </svg>
  );
};
