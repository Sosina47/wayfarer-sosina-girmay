import React from 'react';
import { Link } from 'react-router-dom';
import { UserSwitcher } from './UserSwitcher.js';

export const AppHeader: React.FC = () => {
  return (
    <header className="border-b border-[#303136] bg-[#101012] sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2 group focus:outline-none focus:ring-2 focus:ring-[#7770FF] rounded">
          <span className="text-2xl font-bold tracking-tight text-[#E8E8ED] font-serif">
            Wayfarer<span className="text-[#6558E8]">.</span>
          </span>
          <span className="hidden sm:inline text-xs text-[#A5A5B0] font-normal">
            Honest ratings, fair bookings
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-block text-xs px-2.5 py-1 rounded bg-[#191A1D] border border-[#303136] text-[#7770FF] font-medium tracking-wide">
            Lisbon Edition
          </span>
          <UserSwitcher />
        </div>
      </div>
    </header>
  );
};
