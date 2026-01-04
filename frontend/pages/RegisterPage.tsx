
import React, { useState } from 'react';
import { LayoutIcon } from '../components/icons';

interface RegisterPageProps {
  onLogin: () => void;
  // Fix: onRegister should accept an email string to match the signature of handleLogin in App.tsx
  onRegister: (email: string) => void;
  onBack: () => void;
  t: (key: string) => string;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin, onRegister, onBack, t }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // Fix: Call onRegister with the email provided in the form to ensure type compatibility
      onRegister(formData.email);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button 
          onClick={onBack}
          className="mx-auto flex items-center gap-3 mb-8 group"
        >
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-600/20 group-hover:scale-110 transition-transform">
            <LayoutIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{t('appName')}</h1>
        </button>
        <div className="bg-white dark:bg-gray-900 py-10 px-8 sm:px-12 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('registerTitle')}</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">{t('registerSub')}</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded-xl text-xs font-bold text-red-600 text-center animate-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('fullName')}</label>
              <input 
                name="fullName"
                type="text" 
                required 
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('emailLabel')}</label>
                <input 
                  name="email"
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('phoneNumberLabel')}</label>
                <input 
                  name="phone"
                  type="tel" 
                  required 
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="+62..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passwordLabel')}</label>
                <input 
                  name="password"
                  type="password" 
                  required 
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('confirmPasswordLabel')}</label>
                <input 
                  name="confirmPassword"
                  type="password" 
                  required 
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-4 px-4 bg-primary-600 text-white text-base font-black rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? t('processing') : t('register')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 font-medium">
              {t('alreadyHaveAccount')}{' '}
              <button onClick={onLogin} className="text-primary-600 font-black hover:underline underline-offset-4">
                {t('login')}
              </button>
            </p>
          </div>
        </div>
        <button 
          onClick={onBack}
          className="mt-8 mx-auto flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToHome')}
        </button>
      </div>
    </div>
  );
};

export default RegisterPage;
