import React from 'react';
import { Link } from 'react-router-dom';
import { UserSwitcher } from './UserSwitcher.js';

export const AppHeader: React.FC = () => {
  return (
    <header className="border-b border-[#49372A] bg-[#171512] sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2 group focus:outline-none focus:ring-2 focus:ring-[#B17A43] rounded">
          <span className="text-2xl font-bold tracking-tight text-[#E8DDC9] font-serif">
            Wayfarer<span className="text-[#B17A43]">.</span>
          </span>
          <span className="hidden sm:inline text-xs text-[#A99B89] font-normal">
            Honest ratings, fair bookings
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-block text-xs px-2.5 py-1 rounded bg-[#30241D] border border-[#49372A] text-[#B17A43] font-medium tracking-wide">
            Lisbon Edition
          </span>
          <UserSwitcher />
        </div>
      </div>
    </header>
  );
};
