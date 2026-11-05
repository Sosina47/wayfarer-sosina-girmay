import React from 'react';
import { useCurrentUser } from '../context/CurrentUserContext.js';

export const UserSwitcher: React.FC = () => {
  const { currentUser, users, setCurrentUser } = useCurrentUser();

  if (users.length === 0) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value, 10);
    const selectedUser = users.find(u => u.id === selectedId);
    if (selectedUser) {
      setCurrentUser(selectedUser);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="acting-user-select" className="text-xs text-[#A5A5B0] font-medium hidden sm:inline">
        Acting as:
      </label>
      <div className="relative">
        <select
          id="acting-user-select"
          aria-label="Select acting user identity"
          value={currentUser?.id ?? ''}
          onChange={handleChange}
          className="appearance-none bg-[#191A1D] text-[#E8E8ED] text-xs font-medium pl-3 pr-8 py-1.5 rounded border border-[#303136] hover:border-[#6558E8] focus:outline-none focus:ring-1 focus:ring-[#7770FF] cursor-pointer"
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.name} (ID: {user.id})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#A5A5B0]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
