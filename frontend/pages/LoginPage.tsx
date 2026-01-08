
import React, { useState } from 'react';
import { LayoutIcon, SpinnerIcon } from '../components/icons';
import PasswordInput from '../components/PasswordInput';
import authService from '../services/authService';

interface LoginPageProps {
  onLogin: (user: { id: string; name: string; email: string; phone?: string | null; role: string; createdAt: string }) => void;
  onRegister: () => void;
  onBack: () => void;
  t: (key: string) => string;
  sessionMessage?: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister, onBack, t, sessionMessage }) => {
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
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    
    try {
      const { user } = await authService.login(email, password);
      // Map snake_case API response to camelCase for App.tsx
      onLogin({
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at,
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 422) {
        setErrors({ 
          email: 'Invalid email or password',
          password: ' ' // Show error state on password too
        });
      } else {
        setErrors({ email: err.message || 'Login failed' });
      }
    } finally {
      setLoading(false);
    }
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
          {/* Session expired message */}
          {sessionMessage && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in slide-in-from-top-2">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {sessionMessage}
              </p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('loginTitle')}</h2>
            <p className="mt-2 text-sm text-gray-500 font-medium">{t('loginSub')}</p>
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
              {/* Story 8.4 & 8.6: Password visibility toggle using PasswordInput component */}
              <PasswordInput
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                error={!!errors.password}
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
