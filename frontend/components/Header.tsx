
import React, { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, LayoutIcon, UsersIcon, CodeIcon, SettingsIcon } from './icons';
import { Language } from '../i18n';
import { NavItem } from './Sidebar';
import { User, UserRole } from '../types';

interface HeaderProps {
  user: User | null;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, theme, setTheme, lang, setLang, t, activeNav, setActiveNav, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleProfileEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsProfileMenuOpen(true);
  };

  const handleProfileLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsProfileMenuOpen(false);
    }, 300);
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const toggleLanguage = () => setLang(lang === 'en' ? 'id' : 'en');

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const menuItems: { id: NavItem; label: string; icon: React.ReactNode; roles?: UserRole[] }[] = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: <LayoutIcon className="w-5 h-5" /> },
    { id: 'contacts', label: t('nav_contacts'), icon: <UsersIcon className="w-5 h-5" />, roles: [UserRole.USER] },
    { id: 'api', label: t('nav_api'), icon: <CodeIcon className="w-5 h-5" />, roles: [UserRole.USER] },
    { id: 'users', label: t('nav_users'), icon: <UsersIcon className="w-5 h-5 text-primary-500" />, roles: [UserRole.ADMIN] },
    { id: 'settings', label: t('nav_settings'), icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <>
      <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {t(`nav_${activeNav}`)}
              </h2>
              {user?.role === UserRole.ADMIN && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400 uppercase tracking-widest border border-primary-200 dark:border-primary-800/50">
                  {t('role_admin')}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                {lang.toUpperCase()}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
              </button>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>
              
              <div 
                className="relative h-16 flex items-center" 
                onMouseEnter={handleProfileEnter}
                onMouseLeave={handleProfileLeave}
                ref={profileMenuRef}
              >
                <button 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white sm:w-10 sm:h-10 sm:text-xs shadow-sm hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-black bg-primary-600 overflow-hidden"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user ? getInitials(user.name) : '??'
                  )}
                </button>

                {isProfileMenuOpen && user && (
                  <div className="absolute right-0 top-14 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                        {user.role === UserRole.ADMIN && <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setActiveNav('settings'); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4" />
                        {t('profile')}
                      </button>
                      <button
                        onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div 
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm h-full w-full" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
        <div 
          className={`fixed left-0 top-0 bottom-0 w-72 h-[100dvh] bg-white dark:bg-gray-900 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl border-r border-gray-100 dark:border-gray-800 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg bg-primary-600 shadow-primary-600/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
                </svg>
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{t('appName')}</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto bg-white dark:bg-gray-900">
            {filteredMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveNav(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  activeNav === item.id 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/50 bg-primary-50/50 dark:bg-primary-900/10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase shadow-inner bg-primary-100 text-primary-600 dark:bg-primary-900 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user ? getInitials(user.name) : '??'
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary-600 dark:text-primary-400">
                  {user ? t(`role_${user.role}`) : 'Role'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
