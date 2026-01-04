
import React, { useState } from 'react';
import { LayoutIcon, SpinnerIcon } from '../components/icons';

interface LoginPageProps {
  onLogin: (email: string) => void;
  onRegister: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister, onBack, t }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin(email);
      setLoading(false);
    }, 1200);
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
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('loginTitle')}</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">{t('loginSub')}</p>
            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800/50">
               <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest leading-relaxed">
                  Tip: use "admin@collector.com" for admin view
               </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('emailLabel')}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 outline-none transition-all ${
                  errors.email ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
                }`}
                placeholder="name@company.com"
              />
              {errors.email && <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('passwordLabel')}</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-2xl px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 outline-none transition-all ${
                  errors.password ? 'border-red-500 focus:ring-red-500/20' : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-[10px] text-red-500 font-bold uppercase">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 bg-primary-600 text-white text-base font-black rounded-2xl shadow-xl shadow-primary-600/20 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <SpinnerIcon className="w-5 h-5 animate-spin" />}
              {loading ? t('processing') : t('login')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 font-medium">
              {t('dontHaveAccount')}{' '}
              <button onClick={onRegister} className="text-primary-600 font-black hover:underline underline-offset-4">
                {t('register')}
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

export default LoginPage;
