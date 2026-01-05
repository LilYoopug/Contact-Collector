
import React, { useState, useEffect } from 'react';
import { Contact, ConsentStatus } from '../types';
import { EditIcon, SpinnerIcon } from './icons';
import { ConsentBadge, SourceBadge } from './ContactsTable';
import { contactService } from '../services/contactService';
import { useAppUI } from '../App';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactUpdated: (updatedContact: Contact) => void;
  onContactDeleted: (contactId: string) => void;
  onDeleteWithUndo?: (contactsToDelete: Contact[]) => void;
  contact: Contact | null;
  t: (key: string) => string;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  onContactUpdated,
  onContactDeleted,
  onDeleteWithUndo,
  contact, 
  t 
}) => {
  const { showToast } = useAppUI();
  const [isEditing, setIsEditing] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  
  // Form state
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    consent: ConsentStatus.Unknown as ConsentStatus,
  });

  // Reset form when contact changes or modal opens
  useEffect(() => {
    if (contact) {
      setForm({
        fullName: contact.fullName,
        phone: contact.phone,
        email: contact.email || '',
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        consent: contact.consent,
      });
      setErrors({});
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [contact]);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (isEditing) {
          handleCancelEdit();
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, isEditing, showDeleteConfirm, onClose]);

  if (!isOpen || !contact) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSave = async () => {
    // Frontend validation
    const newErrors: Record<string, string[]> = {};
    if (!form.fullName.trim()) {
      newErrors.full_name = [t('nameRequired') || 'Name is required'];
    }
    if (!form.phone.trim()) {
      newErrors.phone = [t('phoneRequired') || 'Phone is required'];
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoadingUpdate(true);
    setErrors({});

    try {
      const updatedContact = await contactService.update(contact.id, {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || null,
        company: form.company || null,
        jobTitle: form.jobTitle || null,
        consent: form.consent,
      });

      onContactUpdated(updatedContact);
      showToast(t('contactUpdated') || 'Contact updated successfully', 'success');
      setIsEditing(false);
    } catch (error: any) {
      if (error.errors && typeof error.errors === 'object') {
        try {
          // Map snake_case errors to match form field names
          const mappedErrors: Record<string, string[]> = {};
          Object.keys(error.errors).forEach(key => {
            const errorValue = error.errors[key];
            mappedErrors[key] = Array.isArray(errorValue) ? errorValue : [String(errorValue)];
          });
          setErrors(mappedErrors);
        } catch {
          // Fallback if error.errors structure is unexpected
          showToast(error.message || t('updateFailed') || 'Failed to update contact', 'error');
        }
      } else {
        showToast(error.message || t('updateFailed') || 'Failed to update contact', 'error');
      }
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    // Use delayed delete with undo if available
    if (onDeleteWithUndo) {
      onDeleteWithUndo([contact]);
      setShowDeleteConfirm(false);
      onClose();
      return;
    }

    // Fallback to immediate delete (legacy behavior)
    setLoadingDelete(true);
    
    try {
      await contactService.delete(contact.id);
      onContactDeleted(contact.id);
      showToast(t('contactDeleted') || 'Contact deleted', 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message || t('deleteFailed') || 'Failed to delete contact', 'error');
    } finally {
      setLoadingDelete(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrors({});
    // Reset form to original contact values
    setForm({
      fullName: contact.fullName,
      phone: contact.phone,
      email: contact.email || '',
      company: contact.company || '',
      jobTitle: contact.jobTitle || '',
      consent: contact.consent,
    });
  };

  const renderFieldValue = (label: string, value: React.ReactNode) => (
    <div className="sm:col-span-1 py-2 sm:py-3">
      <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
  
  const renderInputField = (label: string, name: string, value: string, required: boolean = false) => {
    const errorKey = name === 'fullName' ? 'full_name' : name === 'jobTitle' ? 'job_title' : name;
    const hasError = errors[errorKey];
    
    return (
      <div className="sm:col-span-1">
        <label htmlFor={name} className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="mt-1">
          <input
            type="text"
            name={name}
            id={name}
            value={value}
            onChange={handleInputChange}
            className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-xl shadow-sm p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all ${
              hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {hasError && (
            <p className="text-red-500 text-xs mt-1">{hasError[0]}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
              {t('confirmDelete') || 'Delete Contact?'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
              {t('deleteContactConfirmation') || 'This action cannot be undone.'}
            </p>
            <p className="font-semibold text-center text-gray-900 dark:text-white mb-6">{contact.fullName}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loadingDelete}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={loadingDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingDelete ? (
                  <>
                    <SpinnerIcon className="w-4 h-4 animate-spin" />
                    <span>{t('deleting') || 'Deleting...'}</span>
                  </>
                ) : (
                  t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg shadow-2xl rounded-3xl bg-white dark:bg-gray-950 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? (t('edit') + ' ' + t('contacts')) : t('contactInfo')}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      aria-label="Delete contact"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      aria-label="Edit contact"
                    >
                      <EditIcon className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {renderInputField(t('fullName'), 'fullName', form.fullName, true)}
                {renderInputField(t('phone'), 'phone', form.phone, true)}
                {renderInputField(t('email'), 'email', form.email)}
                {renderInputField(t('company'), 'company', form.company)}
                {renderInputField(t('jobTitle'), 'jobTitle', form.jobTitle)}
                <div>
                  <label htmlFor="consent" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {t('consent')}
                  </label>
                  <select
                    id="consent"
                    name="consent"
                    value={form.consent}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  >
                    <option value={ConsentStatus.OptIn}>{t('optIn')}</option>
                    <option value={ConsentStatus.OptOut}>{t('optOut')}</option>
                    <option value={ConsentStatus.Unknown}>{t('unknown')}</option>
                  </select>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {renderFieldValue(t('fullName'), contact.fullName)}
                {renderFieldValue(t('jobTitle'), contact.jobTitle || '-')}
                {renderFieldValue(t('phone'), contact.phone)}
                {renderFieldValue(t('email'), contact.email || '-')}
                {renderFieldValue(t('company'), contact.company || '-')}
                {renderFieldValue(t('source'), <SourceBadge source={contact.source} t={t} />)}
                {renderFieldValue(t('consent'), <ConsentBadge status={contact.consent} t={t} />)}
                {renderFieldValue(t('addedOn'), contact.createdAt.toLocaleDateString())}
                {contact.updatedAt && renderFieldValue(t('updatedOn'), contact.updatedAt.toLocaleDateString())}
              </dl>
            )}

            <div className="flex flex-col sm:flex-row-reverse gap-3 mt-8">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSave} 
                    disabled={loadingUpdate}
                    className="flex-1 bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingUpdate ? (
                      <>
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        <span>{t('saving') || 'Saving...'}</span>
                      </>
                    ) : (
                      t('saveContacts')
                    )}
                  </button>
                  <button 
                    onClick={handleCancelEdit} 
                    disabled={loadingUpdate}
                    className="flex-1 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all disabled:opacity-50"
                  >
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <button onClick={onClose} className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
                  {t('close')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailModal;
