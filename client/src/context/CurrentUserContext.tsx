import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/index.js';
import { getUsers, setApiUserId } from '../services/api.js';

const STORAGE_KEY = 'wayfarer_acting_user_id';

interface CurrentUserContextValue {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User) => void;
  isLoadingUsers: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export const CurrentUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      try {
        const res = await getUsers();
        if (!isMounted) return;

        const loadedUsers = res.users;
        setUsers(loadedUsers);

        if (loadedUsers.length > 0) {
          const storedIdStr = localStorage.getItem(STORAGE_KEY);
          const storedId = storedIdStr ? parseInt(storedIdStr, 10) : null;
          const matching = loadedUsers.find(u => u.id === storedId);

          const activeUser = matching || loadedUsers[0];
          setCurrentUserState(activeUser);
          setApiUserId(activeUser.id);
        }
      } catch (err) {
        console.error('Failed to load users for acting-as identity:', err);
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrentUser = (user: User) => {
    setCurrentUserState(user);
    setApiUserId(user.id);
    localStorage.setItem(STORAGE_KEY, String(user.id));
  };

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen bg-[#101012] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#A5A5B0]">
          <div className="w-5 h-5 border-2 border-[#7770FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Initializing Wayfarer session…</span>
        </div>
      </div>
    );
  }

  return (
    <CurrentUserContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser,
        isLoadingUsers
      }}
    >
      {/* Keying on currentUser?.id ensures views immediately reload when the acting user changes */}
      <div key={currentUser?.id || 'anonymous'} className="contents">
        {children}
      </div>
    </CurrentUserContext.Provider>
  );
};

export function useCurrentUser(): CurrentUserContextValue {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  return context;
}
