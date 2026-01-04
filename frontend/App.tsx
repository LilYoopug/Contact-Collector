
import React, { useState, useMemo, useCallback, useEffect, createContext, useContext } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Sidebar, { NavItem } from './components/Sidebar';
import Overview from './pages/Overview';
import ApiPage from './pages/ApiPage';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import { useLocalStorage } from './hooks/useLocalStorage';
import { translations, Language } from './i18n';
import { MOCK_CONTACTS, MOCK_USERS } from './constants';
import { Contact, User, UserRole, ConsentStatus } from './types';
import { SpinnerIcon } from './components/icons';

type ViewState = 'landing' | 'login' | 'register' | 'app';

// Unified UI Context
interface AppContextType {
  showToast: (message: string, type?: ToastType) => void;
  setGlobalLoading: (loading: boolean) => void;
}
export const AppContext = createContext<AppContextType>({ 
  showToast: () => {}, 
  setGlobalLoading: () => {} 
});
export const useAppUI = () => useContext(AppContext);

function App() {
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('theme', 'light');
  const [lang, setLang] = useLocalStorage<Language>('lang', 'en');
  const [view, setView] = useState<ViewState>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [activeNav, setActiveNav] = useState<NavItem>('dashboard');

  const t = useMemo(() => (key: string) => {
    return (translations[lang] as any)[key] || key;
  }, [lang]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    document.body.className = theme === 'dark' ? 'bg-gray-950' : 'bg-gray-50';
  }, [theme]);

  // Initial app boot simulation
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const setGlobalLoading = useCallback((loading: boolean) => {
    setIsGlobalProcessing(loading);
  }, []);

  const uiContextValue = useMemo(() => ({
    showToast,
    setGlobalLoading
  }), [showToast, setGlobalLoading]);
  
  const handleLogin = (email: string) => {
    setIsGlobalProcessing(true);
    setTimeout(() => {
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      let userToSet: User;
      if (foundUser) {
        userToSet = foundUser;
      } else {
        userToSet = {
          id: `u-${Date.now()}`,
          fullName: email.split('@')[0],
          email: email,
          phone: '',
          role: email.toLowerCase().includes('admin') ? UserRole.ADMIN : UserRole.USER,
          joinedAt: new Date(),
          totalContacts: 0
        };
      }
      
      setCurrentUser(userToSet);
      setActiveNav('dashboard');
      setView('app');
      setIsGlobalProcessing(false);
      showToast(`${t('loginTitle')}! Welcome back, ${userToSet.fullName}`, "success");
    }, 800);
  };

  const handleLogout = () => {
    setIsGlobalProcessing(true);
    setTimeout(() => {
      setCurrentUser(null);
      setView('landing');
      setActiveNav('dashboard'); 
      setIsGlobalProcessing(false);
      showToast("Signed out successfully", "info");
    }, 500);
  };

  const addOcrContacts = useCallback((newContacts: Omit<Contact, 'id' | 'createdAt'>[]) => {
      const contactsToAdd = newContacts.map((contact, index) => ({
        ...contact,
        id: `ocr-${Date.now()}-${index}`,
        createdAt: new Date(),
      }));
      setContacts(prevContacts => [...contactsToAdd, ...prevContacts]);
      showToast(`Successfully added ${newContacts.length} contacts`, "success");
  }, [showToast]);

  const updateContact = useCallback((updatedContact: Contact) => {
    setContacts(prevContacts => 
      prevContacts.map(contact => 
        contact.id === updatedContact.id ? updatedContact : contact
      )
    );
    showToast("Contact updated", "success");
  }, [showToast]);

  const mergeContact = useCallback((existingId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => 
      c.id === existingId ? { ...c, ...updates } : c
    ));
    showToast("Contact merged and updated", "success");
  }, [showToast]);

  const batchUpdateContacts = useCallback((ids: string[], updates: Partial<Contact>) => {
    setContacts(prevContacts => 
      prevContacts.map(contact => 
        ids.includes(contact.id) ? { ...contact, ...updates } : contact
      )
    );
    showToast(`${ids.length} contacts updated`, "success");
  }, [showToast]);

  const batchDeleteContacts = useCallback((ids: string[]) => {
    setContacts(prevContacts => prevContacts.filter(contact => !ids.includes(contact.id)));
    showToast(`${ids.length} contacts deleted`, "success");
  }, [showToast]);

  const handleUpdateUsers = useCallback((updater: (prev: User[]) => User[]) => {
    setUsers(prev => updater(prev));
  }, []);

  const handleUpdateCurrentUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    showToast("Profile settings saved", "success");
  }, [showToast]);

  const renderAuthenticatedContent = () => {
    if (!currentUser) return null;

    const isAdmin = currentUser.role === UserRole.ADMIN;

    switch (activeNav) {
      case 'dashboard':
        return <Overview contacts={contacts} t={t} isAdmin={isAdmin} />;
      
      case 'contacts':
        if (isAdmin) return <Overview contacts={contacts} t={t} isAdmin={true} />;
        return (
          <Dashboard 
            contacts={contacts} 
            addOcrContacts={addOcrContacts} 
            updateContact={updateContact}
            batchUpdateContacts={batchUpdateContacts}
            batchDeleteContacts={batchDeleteContacts}
            t={t} 
            setActiveNav={setActiveNav}
            onMergeContact={mergeContact}
          />
        );
      
      case 'api':
        if (isAdmin) return <Overview contacts={contacts} t={t} isAdmin={true} />;
        return <ApiPage t={t} />;
      
      case 'users':
        if (!isAdmin) return <NotFound t={t} onBack={() => setActiveNav('dashboard')} />;
        return (
          <UserManagement 
            users={users} 
            t={t} 
            onUpdateUsers={handleUpdateUsers}
          />
        );
      
      case 'settings':
        return (
          <Settings 
            user={currentUser}
            theme={theme} 
            setTheme={setTheme} 
            lang={lang} 
            setLang={setLang} 
            t={t} 
            onLogout={handleLogout}
            onUpdateUser={handleUpdateCurrentUser}
          />
        );
      
      default:
        return <NotFound t={t} onBack={() => setActiveNav('dashboard')} />;
    }
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <SpinnerIcon className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] animate-pulse">{t('processing')}</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={uiContextValue}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <Toast toasts={toasts} removeToast={removeToast} />
        
        {isGlobalProcessing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 dark:bg-gray-950/40 backdrop-blur-md transition-all animate-in fade-in duration-300">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-white dark:border-gray-800 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full animate-pulse"></div>
                <SpinnerIcon className="w-12 h-12 text-primary-600 animate-spin relative" />
              </div>
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]">{t('processing')}</p>
            </div>
          </div>
        )}

        {view === 'landing' && <LandingPage onLogin={() => setView('login')} onRegister={() => setView('register')} t={t} />}
        {view === 'login' && <LoginPage onLogin={handleLogin} onRegister={() => setView('register')} onBack={() => setView('landing')} t={t} />}
        {view === 'register' && <RegisterPage onLogin={() => setView('login')} onRegister={handleLogin} onBack={() => setView('landing')} t={t} />}

        {view === 'app' && currentUser && (
          <>
            <Sidebar 
              activeItem={activeNav} 
              setActiveItem={setActiveNav} 
              t={t} 
              role={currentUser.role}
              user={currentUser}
            />
            <div className="lg:pl-64 flex flex-col min-h-screen">
              <Header 
                user={currentUser}
                theme={theme} 
                setTheme={setTheme} 
                lang={lang} 
                setLang={setLang} 
                t={t} 
                activeNav={activeNav}
                setActiveNav={setActiveNav}
                onLogout={handleLogout}
              />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                <div className="container mx-auto">
                  {renderAuthenticatedContent()}
                </div>
              </main>
            </div>
          </>
        )}
      </div>
    </AppContext.Provider>
  );
}

const NotFound = ({ t, onBack }: { t: (k: string) => string; onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
      <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">404 - Page Not Found</h2>
    <p className="text-gray-500 mb-8 max-w-sm text-center">Oops! It looks like you've navigated to a page that doesn't exist or you don't have access to.</p>
    <button 
      onClick={onBack}
      className="px-8 py-3 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-500/20"
    >
      {t('backToHome')}
    </button>
  </div>
);

export default App;
