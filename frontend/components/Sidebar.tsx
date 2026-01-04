
import React, { memo } from 'react';
import { LayoutIcon, UsersIcon, CodeIcon, SettingsIcon } from './icons';
import { UserRole, User } from '../types';

export type NavItem = 'dashboard' | 'contacts' | 'api' | 'users' | 'settings';

interface SidebarProps {
  activeItem: NavItem;
  setActiveItem: (item: NavItem) => void;
  t: (key: string) => string;
  role: UserRole;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, setActiveItem, t, role, user }) => {
  const menuItems: { id: NavItem; label: string; icon: React.ReactNode; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: <LayoutIcon className="w-5 h-5" /> },
    { id: 'contacts', label: t('nav_contacts'), icon: <UsersIcon className="w-5 h-5" />, roles: [UserRole.USER] },
    { id: 'api', label: t('nav_api'), icon: <CodeIcon className="w-5 h-5" />, roles: [UserRole.USER] },
    { id: 'users', label: t('nav_users'), icon: <UsersIcon className="w-5 h-5 text-primary-500" />, roles: [UserRole.ADMIN] },
    { id: 'settings', label: t('nav_settings'), icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const filteredItems = menuItems.filter(item => !item.roles || item.roles.includes(role));

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 hidden lg:flex flex-col shadow-sm">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all bg-primary-600 shadow-primary-600/20 hover:scale-110">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
          </svg>
        </div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('appName')}</h1>
      </div>

      <nav className="flex-1 px-4 mt-4 space-y-1.5 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveItem(item.id)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
              activeItem === item.id
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-4 p-4 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-primary-50/30 dark:bg-primary-900/10">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-black uppercase shadow-inner bg-white dark:bg-primary-900 text-primary-600 dark:text-primary-400 overflow-hidden border border-primary-100 dark:border-primary-800">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              getInitials(user.fullName)
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user.fullName}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-600/80 dark:text-primary-400/80">
              {t(`role_${role}`)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default memo(Sidebar);
