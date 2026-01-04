
import React from 'react';
import { CodeIcon, CopyIcon, ActivityIcon, SettingsIcon } from '../components/icons';
// Fixed: Changed useToast to useAppUI as exported from App.tsx
import { useAppUI } from '../App';

interface ApiPageProps {
  t: (key: string) => string;
}

const ApiPage: React.FC<ApiPageProps> = ({ t }) => {
  // Fixed: Use useAppUI hook to get showToast
  const { showToast } = useAppUI();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} ${t('copied')}`, 'success');
  };

  const logs = [
    { id: 1, method: 'POST', endpoint: '/webhook', status: 200, time: '2s ago', latency: '45ms' },
    { id: 2, method: 'POST', endpoint: '/webhook', status: 200, time: '15m ago', latency: '68ms' },
    { id: 3, method: 'POST', endpoint: '/webhook', status: 401, time: '1h ago', latency: '12ms' },
    { id: 4, method: 'POST', endpoint: '/webhook', status: 200, time: '3h ago', latency: '42ms' },
    { id: 5, method: 'POST', endpoint: '/webhook', status: 200, time: '5h ago', latency: '51ms' },
  ];

  const fieldSpec = [
    { name: 'fullName', type: 'String', req: 'Required', desc: 'The legal full name of the lead.' },
    { name: 'email', type: 'String', req: 'Optional', desc: 'Valid email address for marketing automation.' },
    { name: 'phone', type: 'String', req: 'Required', desc: 'Phone in E.164 format (e.g., +6281...).' },
    { name: 'company', type: 'String', req: 'Optional', desc: 'Name of the organization/company.' },
    { name: 'jobTitle', type: 'String', req: 'Optional', desc: 'Professional designation/role.' },
  ];

  const StatCard = ({ label, value, colorClass }: { label: string, value: string, colorClass: string }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('apiMonitoring')}</h2>
        <p className="text-sm text-gray-500">{t('webFormDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label={t('requestsLast24h')} 
          value="1,284" 
          colorClass="text-gray-900 dark:text-white" 
        />
        <StatCard 
          label={t('successRate')} 
          value="98.2%" 
          colorClass="text-green-600 dark:text-green-400" 
        />
        <StatCard 
          label={t('latency')} 
          value="42ms" 
          colorClass="text-blue-600 dark:text-blue-400" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary-600" />
            {t('activeKeys')}
          </h4>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('webFormEndpoint')}</label>
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm text-primary-600 dark:text-primary-400 font-mono truncate">https://api.cc.io/v1/webhook/user_99</code>
                <button onClick={() => handleCopy('https://api.cc.io/v1/webhook/user_99', t('webFormEndpoint'))} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <CopyIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('webFormKey')}</label>
              <div className="flex items-center justify-between gap-4">
                <code className="text-sm text-gray-800 dark:text-gray-200 font-mono truncate">cc_pk_live_********876</code>
                <button onClick={() => handleCopy('cc_pk_live_j9s2k3l1m0n9p8q7', t('webFormKey'))} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <CopyIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-primary-600" />
            {t('requestLogs')}
          </h4>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[280px]">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between text-xs py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded font-bold text-[10px] ${log.status === 200 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                    {log.status}
                  </span>
                  <span className="font-mono text-gray-500">{log.method}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{log.endpoint}</span>
                </div>
                <div className="text-right">
                  <p className="text-gray-900 dark:text-white font-medium">{log.latency}</p>
                  <p className="text-gray-500 text-[10px]">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiPage;
