
import React from 'react';
import { LayoutIcon, UploadIcon, CodeIcon, UsersIcon, ActivityIcon, DatabaseIcon, SpinnerIcon } from '../components/icons';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  t: (key: string) => string;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister, t }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden selection:bg-primary-100 selection:text-primary-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary-600/20">
                <LayoutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('appName')}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={onLogin} 
                className="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors px-3 py-2"
              >
                {t('login')}
              </button>
              <button 
                onClick={onRegister} 
                className="bg-primary-600 text-white text-sm font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-500/20"
              >
                {t('getStarted')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-48 pb-20 sm:pb-32 px-4 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-primary-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <span className="text-[10px] sm:text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Powering 500+ Sales Teams</span>
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {t('heroTitle')}
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            {t('heroSub')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <button 
              onClick={onRegister} 
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white text-lg font-black rounded-2xl hover:bg-primary-700 active:scale-95 transition-all shadow-2xl shadow-primary-500/40"
            >
              {t('getStarted')}
            </button>
            <button 
              onClick={onLogin} 
              className="w-full sm:w-auto px-8 py-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-lg font-black rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-800"
            >
              {t('login')}
            </button>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-gray-50 dark:border-gray-950 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-4 overflow-hidden">
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">Trusted by industry leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {['Acme', 'GlobalCorp', 'StarkInd', 'WayneEnt', 'Cyberdyne'].map(name => (
              <span key={name} className="text-xl sm:text-2xl font-black text-gray-400 dark:text-gray-600 tracking-tighter italic">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <FeatureCard 
              icon={<UploadIcon className="w-8 h-8" />} 
              title={t('feature_ocr')} 
              description={t('feature_ocr_desc')} 
            />
            <FeatureCard 
              icon={<CodeIcon className="w-8 h-8" />} 
              title={t('feature_api')} 
              description={t('feature_api_desc')} 
            />
            <FeatureCard 
              icon={<UsersIcon className="w-8 h-8" />} 
              title={t('feature_manage')} 
              description={t('feature_manage_desc')} 
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 sm:py-32 bg-gray-50 dark:bg-gray-950/50 border-y border-gray-100 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-24">
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">{t('howItWorks')}</h2>
            <div className="w-20 h-1.5 bg-primary-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-gray-200 dark:border-gray-800 -z-10"></div>
            <HowStep 
              num="01" 
              icon={<DatabaseIcon className="w-6 h-6" />}
              title={t('howStep1')} 
              desc={t('howStep1Desc')} 
            />
            <HowStep 
              num="02" 
              icon={<SpinnerIcon className="w-6 h-6" />}
              title={t('howStep2')} 
              desc={t('howStep2Desc')} 
            />
            <HowStep 
              num="03" 
              icon={<UsersIcon className="w-6 h-6" />}
              title={t('howStep3')} 
              desc={t('howStep3Desc')} 
            />
          </div>
        </div>
      </section>

      {/* Success/Benefits Section - Balanced 3-Grid Layout */}
      <section className="py-20 sm:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 sm:mb-20">
            <h2 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">{t('benefitsTitle')}</h2>
            <div className="w-20 h-1.5 bg-primary-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <BenefitCard 
                icon={<ActivityIcon className="w-10 h-10" />}
                title={t('benefit1')}
                description={t('benefit1Desc')}
            />
            <BenefitCard 
                icon={<CodeIcon className="w-10 h-10" />}
                title={t('benefit2')}
                description={t('benefit2Desc')}
                highlight
            />
            <BenefitCard 
                icon={<DatabaseIcon className="w-10 h-10" />}
                title={t('benefit3')}
                description={t('benefit3Desc')}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-gray-100 dark:border-gray-800 bg-gray-50/20 dark:bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
              <LayoutIcon className="w-5 h-5" />
            </div>
            <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('appName')}</span>
          </div>
          <p className="text-sm text-gray-500 font-medium mb-4">© 2024 {t('appName')}. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
             <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
             <a href="#" className="hover:text-primary-600 transition-colors">Terms</a>
             <a href="#" className="hover:text-primary-600 transition-colors">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-8 sm:p-10 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 group">
    <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base leading-relaxed">{description}</p>
  </div>
);

const HowStep = ({ num, icon, title, desc }: { num: string, icon: React.ReactNode, title: string, desc: string }) => (
  <div className="text-center group">
    <div className="relative inline-block mb-6">
      <div className="w-20 h-20 bg-white dark:bg-gray-900 border-2 border-primary-600 rounded-[2rem] flex items-center justify-center text-primary-600 shadow-xl shadow-primary-600/10 transition-all group-hover:bg-primary-600 group-hover:text-white group-hover:scale-110">
        {icon}
      </div>
      <div className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900 dark:bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg">
        {num}
      </div>
    </div>
    <h4 className="text-xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{title}</h4>
    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[240px] mx-auto font-medium">{desc}</p>
  </div>
);

const BenefitCard = ({ icon, title, description, highlight = false }: { icon: React.ReactNode, title: string, description: string, highlight?: boolean }) => (
    <div className={`p-10 rounded-[3rem] border transition-all relative group ${highlight ? 'bg-primary-600 border-primary-500 text-white shadow-2xl shadow-primary-600/30' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white hover:shadow-xl'}`}>
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${highlight ? 'bg-white/10 text-white' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'}`}>
            {icon}
        </div>
        <h3 className="text-2xl font-black mb-4 tracking-tight">{title}</h3>
        <p className={`text-sm leading-relaxed ${highlight ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {description}
        </p>
    </div>
);

export default LandingPage;
