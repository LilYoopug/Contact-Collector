
import React, { useState, useEffect } from 'react';
import { Contact, ConsentStatus } from '../types';
import { EditIcon } from './icons';
import { ConsentBadge, SourceBadge } from './ContactsTable';

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
  contact: Contact | null;
  t: (key: string) => string;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ isOpen, onClose, onSave, contact, t }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(contact);

  useEffect(() => {
    setEditedContact(contact);
    // When a new contact is selected, reset to view mode
    if (contact) {
      setIsEditing(false);
    }
  }, [contact]);

  if (!isOpen || !contact || !editedContact) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedContact(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSave = () => {
    if (editedContact) {
      onSave(editedContact);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContact(contact);
    setIsEditing(false);
  };

  const renderFieldValue = (label: string, value: React.ReactNode) => (
    <div className="sm:col-span-1 py-2 sm:py-3">
      <dt className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</dd>
    </div>
  );
  
  const renderInputField = (label: string, name: keyof Contact, value: string) => (
      <div className="sm:col-span-1">
        <label htmlFor={name} className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          {label}
        </label>
        <div className="mt-1">
          <input
            type="text"
            name={name}
            id={name}
            value={value}
            onChange={handleInputChange}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg shadow-2xl rounded-3xl bg-white dark:bg-gray-950 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditing ? t('edit') + ' ' + t('contacts') : t('contactInfo')}
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  aria-label="Edit contact"
                >
                  <EditIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {renderInputField(t('fullName'), 'fullName', editedContact.fullName)}
                {renderInputField(t('phone'), 'phone', editedContact.phone)}
                {renderInputField(t('email'), 'email', editedContact.email)}
                {renderInputField(t('company'), 'company', editedContact.company)}
                {renderInputField(t('jobTitle'), 'jobTitle', editedContact.jobTitle)}
                <div>
                  <label htmlFor="consent" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    {t('consent')}
                  </label>
                  <select
                    id="consent"
                    name="consent"
                    value={editedContact.consent}
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
                {renderFieldValue(t('company'), contact.company)}
                {renderFieldValue(t('source'), <SourceBadge source={contact.source} t={t} />)}
                {renderFieldValue(t('consent'), <ConsentBadge status={contact.consent} t={t} />)}
                {renderFieldValue(t('addedOn'), contact.createdAt.toLocaleDateString())}
              </dl>
            )}

            <div className="flex flex-col sm:flex-row-reverse gap-3 mt-8">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="flex-1 bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all">
                    {t('saveContacts')}
                  </button>
                  <button onClick={handleCancelEdit} className="flex-1 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
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
