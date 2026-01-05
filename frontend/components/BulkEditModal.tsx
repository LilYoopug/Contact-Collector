
import React, { useState } from 'react';
import { ConsentStatus, Source, Contact } from '../types';
import { contactService } from '../services/contactService';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onContactsUpdated: (updatedContacts: Contact[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  t: (key: string) => string;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedIds, 
  onContactsUpdated, 
  showToast, 
  t 
}) => {
  const [updates, setUpdates] = useState<Partial<Contact>>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({
    company: false,
    jobTitle: false,
    source: false,
    consent: false,
  });
  const [loadingApply, setLoadingApply] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Build updates object with only enabled fields
    const apiUpdates: Record<string, string> = {};
    
    if (enabledFields.company && updates.company !== undefined) {
      apiUpdates.company = updates.company;
    }
    if (enabledFields.jobTitle && updates.jobTitle !== undefined) {
      apiUpdates.job_title = updates.jobTitle;
    }
    if (enabledFields.consent && updates.consent !== undefined) {
      apiUpdates.consent = updates.consent;
    }

    // Check if any field is enabled
    if (Object.keys(apiUpdates).length === 0) {
      showToast(t('noFieldsToUpdate') || 'Please enable at least one field to update', 'error');
      return;
    }

    setLoadingApply(true);

    try {
      const updatedContacts = await contactService.updateBatch(selectedIds, apiUpdates);
      
      // Notify parent of updates
      onContactsUpdated(updatedContacts);
      
      // Show success message
      const message = (t('contactsUpdated') || '{count} contacts updated')
        .replace('{count}', String(updatedContacts.length));
      showToast(message, 'success');
      
      // Reset form and close
      resetForm();
      onClose();
    } catch (error: any) {
      const message = error.message || t('bulkUpdateFailed') || 'Failed to update contacts';
      showToast(message, 'error');
      // Modal stays open for retry
    } finally {
      setLoadingApply(false);
    }
  };

  const resetForm = () => {
    setUpdates({});
    setEnabledFields({
      company: false,
      jobTitle: false,
      source: false,
      consent: false,
    });
  };

  const handleClose = () => {
    if (loadingApply) return; // Prevent closing while loading
    resetForm();
    onClose();
  };

  const toggleField = (field: string) => {
    if (loadingApply) return;
    setEnabledFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {t('bulkEdit') || 'Bulk Edit'} {selectedIds.length} {t('contacts') || 'Contacts'}
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {t('bulkEditInfo') || 'Only enabled fields will be updated for all selected contacts.'}
          </p>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Company */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.company} 
                onChange={() => toggleField('company')}
                disabled={loadingApply}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">
                {t('company')}
              </span>
            </label>
            <input 
              type="text"
              disabled={!enabledFields.company || loadingApply}
              value={updates.company || ''}
              onChange={e => setUpdates({ ...updates, company: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
              placeholder={t('enterNewCompanyName') || 'Enter new company name...'}
            />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.jobTitle} 
                onChange={() => toggleField('jobTitle')}
                disabled={loadingApply}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">
                {t('jobTitle')}
              </span>
            </label>
            <input 
              type="text"
              disabled={!enabledFields.jobTitle || loadingApply}
              value={updates.jobTitle || ''}
              onChange={e => setUpdates({ ...updates, jobTitle: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
              placeholder={t('enterNewJobTitle') || 'Enter new job title...'}
            />
          </div>

          {/* Consent */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enabledFields.consent} 
                onChange={() => toggleField('consent')}
                disabled={loadingApply}
                className="w-5 h-5 rounded-lg text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-50"
              />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-primary-600 transition-colors">
                {t('consent')}
              </span>
            </label>
            <select
              disabled={!enabledFields.consent || loadingApply}
              value={updates.consent || ConsentStatus.Unknown}
              onChange={e => setUpdates({ ...updates, consent: e.target.value as ConsentStatus })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-primary-500/10 disabled:opacity-30 transition-all dark:text-white"
            >
              <option value={ConsentStatus.OptIn}>{t('optIn') || 'Opt In'}</option>
              <option value={ConsentStatus.OptOut}>{t('optOut') || 'Opt Out'}</option>
              <option value={ConsentStatus.Unknown}>{t('unknown') || 'Unknown'}</option>
            </select>
          </div>
        </div>

        <div className="p-8 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button 
            onClick={handleClose}
            disabled={loadingApply}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!Object.values(enabledFields).some(v => v) || loadingApply}
            className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-2"
          >
            {loadingApply ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('applying') || 'Applying...'}
              </>
            ) : (
              t('updateContacts') || 'Update Contacts'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
