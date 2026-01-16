import React from 'react';
import { User } from '../../types';

interface RemoteCursorProps {
  user: User;
  x: number;
  y: number;
}

export const RemoteCursor: React.FC<RemoteCursorProps> = ({ user, x, y }) => (
  <g 
    style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.2s linear' }}
    className="pointer-events-none drop-shadow-sm"
  >
    {/* Cursor Arrow */}
    <path 
      d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" 
      fill={user.color} 
      stroke="white" 
      strokeWidth="1"
    />
    
    {/* Name Tag */}
    <g transform="translate(14, 8)">
      <rect 
        x="0" 
        y="0" 
        width={user.name.length * 9 + 16} 
        height="24" 
        rx="6" 
        fill={user.color} 
      />
      <text 
        x="8" 
        y="16" 
        fill="white" 
        className="text-[12px] font-bold font-sans select-none"
      >
        {user.name}
      </text>
    </g>
  </g>
);