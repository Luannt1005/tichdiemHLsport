import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'white' | 'dark';
  alt?: string;
}

export function BrandLogo({ className = 'w-6 h-6', variant = 'white', alt = 'Victor Badminton Logo' }: BrandLogoProps) {
  const src = variant === 'white' ? '/victorlogo-white.png' : '/victorlogo.png';
  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
