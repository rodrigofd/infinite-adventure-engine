
import React from 'react';

const LoadingSpinner: React.FC<{ size?: 'small' | 'large' }> = ({ size = 'large' }) => {
  const sizeClasses = size === 'large' ? 'h-16 w-16' : 'h-5 w-5';
  return (
    <div className={`relative ${sizeClasses} flex justify-center items-center`}>
      <div 
        className="absolute w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 opacity-70 animate-pulse-ring" 
        style={{ animationDelay: '0s' }}
      ></div>
      <div 
        className="absolute w-full h-full rounded-full bg-gradient-to-tr from-teal-500 to-cyan-400 opacity-70 animate-pulse-ring" 
        style={{ animationDelay: '-0.75s' }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;