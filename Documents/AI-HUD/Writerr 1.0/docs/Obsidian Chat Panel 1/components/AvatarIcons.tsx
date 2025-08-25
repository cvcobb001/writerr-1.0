import { Smile } from 'lucide-react';

interface IconProps {
  className?: string;
}

// Custom AI icon - wider chat bubble with larger, more prominent eyes
export function AIIcon({ className = "size-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 28 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Wider chat bubble shape */}
      <path d="m7 21 3-3h11a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2z" />
      
      {/* Larger, more prominent eyes */}
      <circle cx="11" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Use the lucide-react Smile icon for users
export function UserIcon({ className = "size-4" }: IconProps) {
  return <Smile className={className} />;
}