import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/10 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
