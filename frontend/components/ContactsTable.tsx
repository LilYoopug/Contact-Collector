
import React, { memo } from 'react';
import { Contact, ConsentStatus, Source } from '../types';
import { WhatsAppIcon, SortAscIcon, SortDescIcon, SortDefaultIcon } from './icons';
import { ContactSortKey } from './Dashboard';

interface ContactsTableProps {
  contacts: Contact[];
  t: (key: string) => string;
  onRowClick: (contact: Contact) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isBulkMode: boolean;
  sortConfig: { key: ContactSortKey; direction: 'asc' | 'desc' | null };
  onSort: (key: ContactSortKey) => void;
}

export const ConsentBadge: React.FC<{ status: ConsentStatus; t: (key: string) => string }> = memo(({ status, t }) => {
  const styles = {
    [ConsentStatus.OptIn]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [ConsentStatus.OptOut]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [ConsentStatus.Unknown]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  };
  const text = {
    [ConsentStatus.OptIn]: t('optIn'),
    [ConsentStatus.OptOut]: t('optOut'),
    [ConsentStatus.Unknown]: t('unknown'),
  };
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${styles[status]}`}>
      {text[status]}
    </span>
  );
});

export const SourceBadge: React.FC<{ source: Source; t: (key: string) => string }> = memo(({ source, t }) => {
    const sourceText = t(`source_${source}`) || source;
    return <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">{sourceText}</span>
});

const ContactRow: React.FC<{ 
  contact: Contact; 
  t: (key: string) => string; 
  onClick: (c: Contact) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isBulkMode: boolean;
}> = memo(({ contact, t, onClick, isSelected, onToggleSelect, isBulkMode }) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect(contact.id);
  };

  return (
    <tr 
      onClick={() => onClick(contact)} 
      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-150 ${isSelected ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}
    >
      {isBulkMode && (
        <td className="px-6 py-4 whitespace-nowrap w-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}} 
              onClick={handleCheckboxClick}
              className="w-5 h-5 rounded-md text-primary-400 border-gray-300 dark:border-gray-700 focus:ring-primary-500/20 bg-white dark:bg-gray-800 transition-all cursor-pointer shadow-sm"
            />
          </div>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-bold text-gray-900 dark:text-white">{contact.fullName}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-gray-300 font-medium">{contact.phone}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{contact.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-gray-300 font-medium">{contact.company}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{contact.jobTitle}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm"><SourceBadge source={contact.source} t={t} /></td>
      <td className="px-6 py-4 whitespace-nowrap text-sm"><ConsentBadge status={contact.consent} t={t} /></td>
      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">{contact.createdAt.toLocaleDateString()}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <a 
          href={`https://wa.me/${contact.phone}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={(e) => e.stopPropagation()} 
          className="inline-flex items-center p-2 rounded-xl text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50 transition-all active:scale-90"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
      </td>
    </tr>
  );
});

const ContactsTable: React.FC<ContactsTableProps> = ({ 
  contacts, 
  t, 
  onRowClick, 
  selectedIds, 
  onToggleSelect, 
  onToggleSelectAll,
  isBulkMode,
  sortConfig,
  onSort
}) => {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-20 animate-in fade-in">
        <p className="text-gray-500 dark:text-gray-400 font-medium">{t('noContactsFound')}</p>
      </div>
    );
  }

  const isAllSelected = contacts.length > 0 && contacts.every(c => selectedIds.includes(c.id));
  const isSomeSelected = contacts.some(c => selectedIds.includes(c.id)) && !isAllSelected;

  const renderSortIcon = (key: ContactSortKey) => {
    if (sortConfig.key !== key || sortConfig.direction === null) {
      return <SortDefaultIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <SortAscIcon className="w-3.5 h-3.5 text-primary-500" />
      : <SortDescIcon className="w-3.5 h-3.5 text-primary-500" />;
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <div className="align-middle inline-block min-w-full">
          <div className="border-b border-gray-100 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                <tr>
                  {isBulkMode && (
                    <th scope="col" className="px-6 py-4 text-left w-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={onToggleSelectAll}
                          className="w-5 h-5 rounded-md text-primary-400 border-gray-300 dark:border-gray-700 focus:ring-primary-500/20 bg-white dark:bg-gray-800 transition-all cursor-pointer shadow-sm"
                        />
                      </div>
                    </th>
                  )}
                  <th 
                    scope="col" 
                    onClick={() => onSort('fullName')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('fullName')}
                        {renderSortIcon('fullName')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => onSort('email')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('contactInfo')}
                        {renderSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => onSort('company')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('companyInfo')}
                        {renderSortIcon('company')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => onSort('source')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('source')}
                        {renderSortIcon('source')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => onSort('consent')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('consent')}
                        {renderSortIcon('consent')}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    onClick={() => onSort('createdAt')}
                    className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('addedOn')}
                        {renderSortIcon('createdAt')}
                    </div>
                  </th>
                  <th scope="col" className="relative px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-50 dark:divide-gray-800">
                {contacts.map((contact) => (
                  <ContactRow 
                    key={contact.id} 
                    contact={contact} 
                    t={t} 
                    onClick={onRowClick}
                    isSelected={selectedIds.includes(contact.id)}
                    onToggleSelect={onToggleSelect}
                    isBulkMode={isBulkMode}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ContactsTable);
