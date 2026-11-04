import React from 'react';
import { Link } from 'react-router-dom';
import { UserSwitcher } from './UserSwitcher.js';

export const AppHeader: React.FC = () => {
  return (
    <header className="border-b border-[#3A332C] bg-[#1D1916] sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2 group focus:outline-none focus:ring-2 focus:ring-[#D9694A] rounded">
          <span className="text-2xl font-bold tracking-tight text-[#F3EBDD]">
            Wayfarer<span className="text-[#D9694A]">.</span>
          </span>
          <span className="hidden sm:inline text-xs text-[#8F8374] font-normal">
            Honest ratings, fair bookings
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline-block text-xs px-2.5 py-1 rounded bg-[#25201C] border border-[#3A332C] text-[#9BAE7F] font-medium tracking-wide">
            Lisbon Edition
          </span>
          <UserSwitcher />
        </div>
      </div>
    </header>
  );
};
