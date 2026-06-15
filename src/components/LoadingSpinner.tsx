import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'accent';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary', 
  message 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-primary border-t-transparent',
    white: 'border-white border-t-transparent',
    accent: 'border-accent border-t-transparent',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`} />
      {message && (
        <p className="mt-2 text-xs font-medium text-text-muted animate-pulse">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
