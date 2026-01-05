
import React, { useState, useRef } from 'react';
import { SettingsIcon, UsersIcon, MoonIcon, SunIcon, UploadIcon, SpinnerIcon } from '../components/icons';
import { Language } from '../i18n';
import { User, UserRole } from '../types';
import { useAppUI } from '../App';

interface SettingsProps {
  user: User;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, theme, setTheme, lang, setLang, t, onLogout, onUpdateUser }) => {
  const { showToast, setGlobalLoading } = useAppUI();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    setGlobalLoading(true);
    setTimeout(() => {
      setIsSaving(false);
      setGlobalLoading(false);
      showToast(t('saveChanges') + " successful", "success");
    }, 800);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('nav_settings')}</h2>
        <p className="text-sm font-medium text-gray-500 mt-1">{t('accountPreferences')}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Profile Section */}
        <div className="p-8 border-b border-gray-50 dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center text-3xl font-black shrink-0 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 overflow-hidden shadow-inner border border-primary-100/50 dark:border-primary-800/50">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user.name}</h4>
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${user.role === UserRole.ADMIN ? 'bg-primary-100 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:border-primary-800' : 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'}`}>
                  {t(`role_${user.role}`)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <span className="font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">{t('emailLabel')}:</span>
                  {user.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <span className="font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">{t('phoneNumberLabel')}:</span>
                  {user.phone || '-'}
                </div>
              </div>
              <button 
                onClick={() => setIsAvatarModalOpen(true)}
                className="mt-4 px-6 py-2 text-xs font-black text-white rounded-xl transition-all bg-primary-600 hover:bg-primary-700 active:scale-95 shadow-lg shadow-primary-500/20 uppercase tracking-widest"
              >
                Change Avatar
              </button>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="p-8 space-y-12">
          {/* Appearance */}
          <section className="space-y-6">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <SunIcon className="w-4 h-4" /> {t('appearance')}
            </h5>
            <div className="flex p-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl w-full sm:w-fit border border-gray-100 dark:border-gray-800">
              <button 
                onClick={() => {
                  setGlobalLoading(true);
                  setTimeout(() => {
                    setTheme('light');
                    setGlobalLoading(false);
                  }, 400);
                }}
                className={`flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-sm font-black transition-all flex-1 sm:flex-none ${theme === 'light' ? 'bg-white shadow-xl text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <SunIcon className="w-4 h-4" /> {t('theme_light')}
              </button>
              <button 
                onClick={() => {
                  setGlobalLoading(true);
                  setTimeout(() => {
                    setTheme('dark');
                    setGlobalLoading(false);
                  }, 400);
                }}
                className={`flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-sm font-black transition-all flex-1 sm:flex-none ${theme === 'dark' ? 'bg-gray-900 shadow-xl text-primary-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <MoonIcon className="w-4 h-4" /> {t('theme_dark')}
              </button>
            </div>
          </section>

          {/* Language */}
          <section className="space-y-6">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3">
              <UsersIcon className="w-4 h-4" /> {t('language')}
            </h5>
            <select 
              value={lang}
              onChange={(e) => {
                const newLang = e.target.value as Language;
                setGlobalLoading(true);
                setTimeout(() => {
                  setLang(newLang);
                  setGlobalLoading(false);
                }, 400);
              }}
              className="w-full max-w-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 dark:text-white transition-all appearance-none"
            >
              <option value="en">English (US)</option>
              <option value="id">Bahasa Indonesia (ID)</option>
            </select>
          </section>

          <div className="pt-8 border-t border-gray-50 dark:border-gray-800 flex justify-end">
            <button 
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="w-full sm:w-auto px-12 py-4 text-white font-black rounded-2xl active:scale-95 transition-all shadow-2xl bg-primary-600 hover:bg-primary-700 shadow-primary-600/30 flex items-center justify-center gap-3"
            >
              {isSaving && <SpinnerIcon className="w-5 h-5 animate-spin" />}
              {isSaving ? t('processing') : t('saveChanges')}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-8 bg-red-50/20 dark:bg-red-900/10 border-t border-red-50 dark:border-red-900/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h5 className="text-xs font-black text-red-600 uppercase tracking-widest">{t('logout')}</h5>
                    <p className="text-xs font-medium text-gray-500 mt-1">{t('sign_out_desc')}</p>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-xl shadow-red-500/30"
                >
                    {t('logout')}
                </button>
            </div>
        </div>
      </div>

      {isAvatarModalOpen && (
        <AvatarModal 
          currentAvatar={user.avatarUrl}
          onClose={() => setIsAvatarModalOpen(false)}
          onSave={(avatarUrl) => {
            setGlobalLoading(true);
            setTimeout(() => {
              onUpdateUser({ ...user, avatarUrl });
              setIsAvatarModalOpen(false);
              setGlobalLoading(false);
            }, 1000);
          }}
          t={t}
        />
      )}
    </div>
  );
};

interface AvatarModalProps {
  currentAvatar?: string;
  onClose: () => void;
  onSave: (avatarUrl: string) => void;
  t: (key: string) => string;
}

const AvatarModal: React.FC<AvatarModalProps> = ({ currentAvatar, onClose, onSave, t }) => {
  const [preview, setPreview] = useState<string | undefined>(currentAvatar);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-10 text-center space-y-8">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Change Avatar</h3>
          
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-[2.5rem] bg-gray-50 dark:bg-gray-800 border-4 border-white dark:border-gray-700 shadow-2xl overflow-hidden relative group">
              {isUploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-800/50">
                  <SpinnerIcon className="w-10 h-10 text-primary-600 animate-spin" />
                </div>
              ) : preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                   <UploadIcon className="w-12 h-12" />
                </div>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl">
                    <UploadIcon className="w-8 h-8 text-white" />
                </div>
              </button>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />

          <p className="text-xs font-medium text-gray-500 max-w-[240px] mx-auto leading-relaxed">Choose a square high-resolution image to represent your professional profile.</p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <button 
              onClick={onClose}
              className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-100 dark:border-gray-800"
            >
              Cancel
            </button>
            <button 
              onClick={() => preview && onSave(preview)}
              disabled={!preview || isUploading}
              className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all shadow-xl shadow-primary-500/20"
            >
              Save Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
