import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
  variant?: 'white' | 'dark';
  alt?: string;
}

export function BrandLogo({ className = 'w-6 h-6', variant = 'white', alt = 'Victor Badminton Logo' }: BrandLogoProps) {
  const src = variant === 'white' ? '/victorlogo-white.png' : '/victorlogo.png';
  return (
    <Image
      src={src}
      alt={alt}
      width={128}
      height={128}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
