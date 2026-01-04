
import React, { useState } from 'react';
import { ConsentStatus, Source, Contact } from '../types';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Contact>) => void;
  selectedCount: number;
  t: (key: string) => string;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ isOpen, onClose, onSave, selectedCount, t }) => {
  const [updates, setUpdates] = useState<Partial<Contact>>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
    company: false,
    jobTitle: false,
    source: false,
    consent: false,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    const finalUpdates: Partial<Contact> = {};
    if (enabledFields.company) finalUpdates.company = updates.company;
    if (enabledFields.jobTitle) finalUpdates.jobTitle = updates.jobTitle;
    if (enabledFields.source) finalUpdates.source = updates.source;
    if (enabledFields.consent) finalUpdates.consent = updates.consent;
    
    onSave(finalUpdates);
    onClose();
  };

  const toggleField = (field: string) => {
    setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Bulk Edit {selectedCount} Contacts</h3>
          <p className="text-sm font-medium text-gray-500 mt-1">Only enabled fields will be updated for all selected contacts.</p>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Company */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.company} 
                onChange={() => toggleField('company')}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">{t('company')}</span>
            </label>
            <input 
              type="text"
              disabled={!enabledFields.company}
              value={updates.company || ''}
              onChange={e => setUpdates({ ...updates, company: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
              placeholder="Enter new company name..."
            />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.jobTitle} 
                onChange={() => toggleField('jobTitle')}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">{t('jobTitle')}</span>
            </label>
            <input 
              type="text"
              disabled={!enabledFields.jobTitle}
              value={updates.jobTitle || ''}
              onChange={e => setUpdates({ ...updates, jobTitle: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
              placeholder="Enter new job title..."
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.source} 
                onChange={() => toggleField('source')}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">{t('source')}</span>
            </label>
            <select
              disabled={!enabledFields.source}
              value={updates.source || Source.Manual}
              onChange={e => setUpdates({ ...updates, source: e.target.value as Source })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
            >
              {Object.values(Source).map(s => (
                <option key={s} value={s}>{t(`source_${s}`)}</option>
              ))}
            </select>
          </div>

          {/* Consent */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.consent} 
                onChange={() => toggleField('consent')}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">{t('consent')}</span>
            </label>
            <select
              disabled={!enabledFields.consent}
              value={updates.consent || ConsentStatus.Unknown}
              onChange={e => setUpdates({ ...updates, consent: e.target.value as ConsentStatus })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
            >
              <option value={ConsentStatus.OptIn}>{t('optIn')}</option>
              <option value={ConsentStatus.OptOut}>{t('optOut')}</option>
              <option value={ConsentStatus.Unknown}>{t('unknown')}</option>
            </select>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!Object.values(enabledFields).some(v => v)}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all shadow-xl shadow-primary-500/20"
          >
            Update Contacts
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
