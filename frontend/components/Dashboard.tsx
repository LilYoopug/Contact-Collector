
import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import FilterBar, { DateFilter } from './FilterBar';
import ContactsTable from './ContactsTable';
import { Contact, ConsentStatus, Source } from '../types';
import AddContactModal from './AddContactModal';
import ContactDetailModal from './ContactDetailModal';
import ExportModal from './ExportModal';
import BulkEditModal from './BulkEditModal';
import { NavItem } from './Sidebar';
import { useAppUI } from '../App';
import { CopyIcon, EditIcon } from './icons';
import { contactService } from '../services/contactService';

interface DashboardProps {
  contacts: Contact[];
  loadingContacts?: boolean;
  contactsError?: string | null;
  onRetryContacts?: () => void;
  onFetchContacts?: (params?: { search?: string; source?: string; dateFrom?: string; dateTo?: string }) => void;
  addOcrContacts: (newContacts: Omit<Contact, 'id' | 'createdAt'>[]) => void;
  onContactCreated?: (contact: Contact) => void;
  onContactUpdated?: (contact: Contact) => void;
  onContactDeleted?: (contactId: string) => void;
  updateContact: (updatedContact: Contact) => void;
  batchUpdateContacts: (ids: string[], updates: Partial<Contact>) => void;
  batchDeleteContacts: (ids: string[]) => void;
  t: (key: string) => string;
  setActiveNav?: (nav: NavItem) => void;
  onMergeContact?: (existingId: string, updates: Partial<Contact>) => void;
}

export type ContactSortKey = keyof Contact;

// Pending delete state structure
interface PendingDelete {
  id: number;
  contacts: Contact[];
  timeoutId: ReturnType<typeof setTimeout>;
}

// Counter for unique pending delete IDs
let pendingDeleteIdCounter = 0;

const Dashboard: React.FC<DashboardProps> = ({ 
  contacts, 
  loadingContacts = false,
  contactsError = null,
  onRetryContacts,
  onFetchContacts,
  addOcrContacts,
  onContactCreated,
  onContactUpdated,
  onContactDeleted,
  updateContact, 
  batchUpdateContacts, 
  batchDeleteContacts, 
  t, 
  setActiveNav,
  onMergeContact
}) => {
  const { showToast, showUndoToast, setGlobalLoading } = useAppUI();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  
  // Selection State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Bulk Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  
  // Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all');
  const [consentFilter, setConsentFilter] = useState<ConsentStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: ContactSortKey; direction: 'asc' | 'desc' | null }>({
    key: 'createdAt',
    direction: 'desc'
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pending Deletes State (for undo functionality)
  const [pendingDeletes, setPendingDeletes] = useState<Map<number, PendingDelete>>(new Map());
  const pendingDeletesRef = useRef(pendingDeletes);
  pendingDeletesRef.current = pendingDeletes;

  // Cleanup pending deletes on unmount
  useEffect(() => {
    return () => {
      pendingDeletesRef.current.forEach(pending => {
        clearTimeout(pending.timeoutId);
      });
    };
  }, []);

  // Handle page unload with pending deletes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingDeletesRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = t('pendingDeletesWarning');
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [t]);

  // Performance: Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200); // 200ms debounce per FR32
    return () => clearTimeout(handler);
  }, [searchQuery]);

  /**
   * Convert UI preset date filter to API date_from/date_to parameters (Story 5.4)
   */
  const convertDateFilter = (filter: DateFilter): { dateFrom?: string; dateTo?: string } => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // "2026-01-05"
    
    switch (filter) {
      case 'today':
        return { dateFrom: todayStr, dateTo: todayStr };
        
      case '7days': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7); // 7 days back (consistent)
        return { 
          dateFrom: sevenDaysAgo.toISOString().split('T')[0], 
          dateTo: todayStr 
        };
      }
      
      case '30days': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30); // 30 days back (consistent)
        return { 
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0], 
          dateTo: todayStr 
        };
      }
      
      case 'thisMonth': {
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { 
          dateFrom: firstOfMonth.toISOString().split('T')[0], 
          dateTo: todayStr 
        };
      }
      
      case 'all':
      default:
        return {}; // No date filter
    }
  };

  // Fetch contacts from API when search, source, or date filter changes (Story 5.3, 5.4, 7.9)
  useEffect(() => {
    if (onFetchContacts) {
      const dateParams = convertDateFilter(activeDateFilter);
      onFetchContacts({ 
        search: debouncedSearchQuery || undefined,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        dateFrom: dateParams.dateFrom,
        dateTo: dateParams.dateTo,
      });
    }
  }, [debouncedSearchQuery, sourceFilter, activeDateFilter, onFetchContacts]);

  const handleSort = (key: ContactSortKey) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const filteredContacts = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = debouncedSearchQuery.toLowerCase();

    let result = contacts.filter(contact => {
      const matchesSearch = !q || 
        contact.fullName.toLowerCase().includes(q) || 
        contact.company.toLowerCase().includes(q) || 
        contact.email.toLowerCase().includes(q) ||
        contact.phone.includes(q);

      if (!matchesSearch) return false;
      if (consentFilter !== 'all' && contact.consent !== consentFilter) return false;
      if (sourceFilter !== 'all' && contact.source !== sourceFilter) return false;

      if (activeDateFilter !== 'all') {
        const contactDate = new Date(contact.createdAt);
        switch (activeDateFilter) {
            case 'today':
              if (contactDate < today) return false;
              break;
            case '7days':
              const sevenDaysAgo = new Date(today);
              sevenDaysAgo.setDate(today.getDate() - 7);
              if (contactDate < sevenDaysAgo) return false;
              break;
            case '30days':
              const thirtyDaysAgo = new Date(today);
              thirtyDaysAgo.setDate(today.getDate() - 30);
              if (contactDate < thirtyDaysAgo) return false;
              break;
            case 'thisMonth':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                if (contactDate < startOfMonth) return false;
                break;
        }
      }

      return true;
    });

    if (sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc' 
            ? aValue.getTime() - bValue.getTime() 
            : bValue.getTime() - aValue.getTime();
        }

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }

    return result;
  }, [contacts, debouncedSearchQuery, activeDateFilter, consentFilter, sourceFilter, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]); // Clear selection when filters change
  }, [debouncedSearchQuery, activeDateFilter, consentFilter, sourceFilter, sortConfig]);

  // Handle bulk mode toggle
  useEffect(() => {
    if (!isBulkMode) {
      setSelectedIds([]);
    }
  }, [isBulkMode]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage]);

  // Handle contact updated via API
  const handleContactUpdated = useCallback((updatedContact: Contact) => {
    onContactUpdated?.(updatedContact);
    setSelectedContact(updatedContact); // Update the modal's view with fresh data
  }, [onContactUpdated]);

  // Handle contact deleted via API (immediate delete - for ContactDetailModal)
  const handleContactDeleted = useCallback((contactId: string) => {
    onContactDeleted?.(contactId);
    setSelectedContact(null); // Close the modal
  }, [onContactDeleted]);

  /**
   * Delete contacts with undo capability.
   * Removes from UI immediately (optimistic), delays API call by 5 seconds.
   * If user clicks Undo within 5 seconds, contacts are restored without API call.
   */
  const handleDeleteWithUndo = useCallback((contactsToDelete: Contact[]) => {
    const ids = contactsToDelete.map(c => c.id);
    const pendingId = ++pendingDeleteIdCounter;

    // 1. Remove from UI immediately (optimistic update)
    ids.forEach(id => onContactDeleted?.(id));

    // 2. Start 5-second timer for actual deletion
    const timeoutId = setTimeout(async () => {
      try {
        // Execute actual API delete
        if (contactsToDelete.length === 1) {
          await contactService.delete(contactsToDelete[0].id);
        } else {
          await contactService.deleteBatch(ids);
        }
        
        // Remove from pending (delete was successful)
        setPendingDeletes(prev => {
          const next = new Map(prev);
          next.delete(pendingId);
          return next;
        });
        
      } catch (error: any) {
        // On error: restore contacts to UI
        contactsToDelete.forEach(contact => {
          onContactCreated?.(contact);
        });
        showToast(error.message || t('deleteFailed'), 'error');
        
        // Remove from pending
        setPendingDeletes(prev => {
          const next = new Map(prev);
          next.delete(pendingId);
          return next;
        });
      }
    }, 5000);

    // 3. Store pending delete
    setPendingDeletes(prev => {
      const next = new Map(prev);
      next.set(pendingId, {
        id: pendingId,
        contacts: contactsToDelete,
        timeoutId,
      });
      return next;
    });

    // 4. Show toast with undo action
    const message = contactsToDelete.length === 1
      ? t('contactDeleted')
      : (t('contactsDeleted') || '{count} contacts deleted').replace('{count}', String(contactsToDelete.length));
    
    showUndoToast(message, () => handleUndo(pendingId));
  }, [onContactDeleted, onContactCreated, t, showToast, showUndoToast]);

  /**
   * Undo a pending delete.
   * Cancels the timer and restores contacts to UI.
   */
  const handleUndo = useCallback((pendingId: number) => {
    const pending = pendingDeletesRef.current.get(pendingId);
    if (!pending) return;

    // 1. Cancel the timer
    clearTimeout(pending.timeoutId);

    // 2. Restore contacts to UI
    pending.contacts.forEach(contact => {
      onContactCreated?.(contact);
    });

    // 3. Remove from pending
    setPendingDeletes(prev => {
      const next = new Map(prev);
      next.delete(pendingId);
      return next;
    });

    // 4. Show confirmation
    showToast(t('deletionCancelled'), 'success');
  }, [onContactCreated, t, showToast]);

  // Selection Handlers
  const handleToggleSelect = useCallback((id: string) => {
    if (!isBulkMode) return;
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, [isBulkMode]);

  const handleToggleSelectAll = useCallback(() => {
    if (!isBulkMode) return;
    const currentBatchIds = paginatedContacts.map(c => c.id);
    const allCurrentBatchSelected = currentBatchIds.every(id => selectedIds.includes(id));
    
    if (allCurrentBatchSelected) {
      setSelectedIds(prev => prev.filter(id => !currentBatchIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentBatchIds])));
    }
  }, [paginatedContacts, selectedIds, isBulkMode]);

  // Bulk Action Handlers - Now uses API for persistence
  const handleBulkStatusChange = async (status: ConsentStatus) => {
    setGlobalLoading(true);
    try {
      const updatedContacts = await contactService.updateBatch(selectedIds, { consent: status });
      // Update each contact in local state
      updatedContacts.forEach(contact => {
        onContactUpdated?.(contact);
      });
      setSelectedIds([]);
      const message = (t('contactsUpdated') || '{count} contacts updated')
        .replace('{count}', String(updatedContacts.length));
      showToast(message, 'success');
    } catch (error: any) {
      showToast(error.message || t('bulkUpdateFailed') || 'Failed to update contacts', 'error');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleBulkDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = () => {
    // Get the contacts to delete from the current contacts list
    const contactsToDelete = contacts.filter(c => selectedIds.includes(c.id));
    
    // Use delayed delete with undo capability
    handleDeleteWithUndo(contactsToDelete);
    
    // Clear selection and close dialog immediately
    setSelectedIds([]);
    setShowDeleteConfirm(false);
  };

  const handleBulkDeleteCancel = () => {
    setShowDeleteConfirm(false);
    // Keep selection preserved
  };

  const handleCopyEmails = () => {
    setGlobalLoading(true);
    setTimeout(() => {
      const selectedEmails = contacts
        .filter(c => selectedIds.includes(c.id) && c.email)
        .map(c => c.email)
        .join(', ');
      
      if (selectedEmails) {
        navigator.clipboard.writeText(selectedEmails);
        showToast(`Copied ${selectedIds.length} email addresses`, "success");
      } else {
        showToast("No email addresses found in selection", "warning");
      }
      setGlobalLoading(false);
    }, 400);
  };

  const startRange = filteredContacts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, filteredContacts.length);

  const getPageNumbers = (isMobile: boolean = false) => {
    const pages: (number | string)[] = [];
    const maxVisible = isMobile ? 3 : 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const buffer = isMobile ? 0 : 1;
      const start = Math.max(2, currentPage - buffer);
      const end = Math.min(totalPages - 1, currentPage + buffer);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (end < totalPages - 1) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <FilterBar 
        onAddContact={() => setIsAddModalOpen(true)} 
        onExport={() => setIsExportModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
        consentFilter={consentFilter}
        setConsentFilter={setConsentFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        t={t}
        isBulkMode={isBulkMode}
        setIsBulkMode={setIsBulkMode}
      />
      
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative">
        {loadingContacts || loadingLocal ? (
          <div className="p-8 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-6 py-4 animate-pulse border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4"></div>
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/6 ml-auto"></div>
              </div>
            ))}
          </div>
        ) : contactsError ? (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-red-500 font-medium mb-4 text-center">{contactsError}</p>
            {onRetryContacts && (
              <button 
                onClick={onRetryContacts}
                className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-500/20"
              >
                {t('retry') || 'Retry'}
              </button>
            )}
          </div>
        ) : (
          <ContactsTable 
            contacts={paginatedContacts} 
            t={t} 
            onRowClick={setSelectedContact}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            isBulkMode={isBulkMode}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        )}
      </div>

      {!loadingLocal && filteredContacts.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between py-8 px-4 sm:px-0 gap-6">
          <div className="order-2 md:order-1">
            <p className="text-sm font-medium text-gray-500">
              {t('showing')} <span className="font-black text-gray-900 dark:text-white">{startRange}</span> {t('to')} <span className="font-black text-gray-900 dark:text-white">{endRange}</span> {t('of')}{' '}
              <span className="font-black text-gray-900 dark:text-white">{filteredContacts.length}</span> {t('results')}
            </p>
          </div>

          <div className="order-1 md:order-2 w-full md:w-auto">
            <nav className="flex items-center justify-center space-x-2" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all active:scale-90"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              <div className="flex space-x-1.5">
                {getPageNumbers(false).map((page, index) => (
                  <button
                    key={`desk-${index}`}
                    disabled={typeof page === 'string'}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    className={`inline-flex items-center justify-center min-w-[44px] h-11 rounded-xl border text-sm font-black transition-all active:scale-95 ${
                      currentPage === page
                        ? 'bg-primary-600 border-primary-600 text-white shadow-xl shadow-primary-500/20'
                        : typeof page === 'string'
                        ? 'bg-transparent border-transparent text-gray-400'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-all active:scale-90"
              >
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {isBulkMode && selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white/95 dark:bg-primary-950 border border-gray-200 dark:border-primary-800/50 p-3 sm:p-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-gray-900 dark:text-white overflow-hidden backdrop-blur-md">
            
            <div className="flex items-center gap-4 px-2 relative">
              <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center font-black text-xl text-white shadow-lg ring-4 ring-primary-500/20">
                {selectedIds.length}
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-black uppercase tracking-[0.1em]">{t('contacts')} Selected</p>
                <button onClick={() => setSelectedIds([])} className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors uppercase tracking-widest text-left">
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 relative w-full sm:w-auto justify-center">
              <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden lg:block"></div>
              
              <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/5">
                <button 
                  onClick={() => handleBulkStatusChange(ConsentStatus.OptIn)}
                  className="p-2.5 rounded-xl hover:bg-green-500/10 dark:hover:bg-green-500/20 transition-all text-green-600 dark:text-green-400"
                  title="Mark Opt-In"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  onClick={() => handleBulkStatusChange(ConsentStatus.OptOut)}
                  className="p-2.5 rounded-xl hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all text-red-600 dark:text-red-400"
                  title="Mark Opt-Out"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={handleCopyEmails}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200"
                >
                  <CopyIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Emails</span>
                </button>
                
                <button 
                  onClick={() => setIsBulkEditModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl transition-all text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-200"
                >
                  <EditIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Bulk Edit</span>
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden lg:block"></div>

              <button 
                onClick={handleBulkDeleteClick}
                className="bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <AddContactModal 
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSave={addOcrContacts}
            onContactCreated={onContactCreated}
            t={t}
            onGoToApi={() => {
              setIsAddModalOpen(false);
              setActiveNav?.('api');
            }}
            existingContacts={contacts}
            onMergeContact={onMergeContact}
        />
      )}
      {isExportModalOpen && (
        <ExportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filteredContacts={filteredContacts}
          allContacts={contacts}
          selectedContacts={contacts.filter(c => selectedIds.includes(c.id))}
          t={t}
        />
      )}
      {isBulkEditModalOpen && (
        <BulkEditModal 
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          selectedIds={selectedIds}
          onContactsUpdated={(updatedContacts) => {
            // Merge updated contacts into state
            updatedContacts.forEach(contact => {
              onContactUpdated?.(contact);
            });
            setSelectedIds([]); // Clear selection on success
          }}
          showToast={showToast}
          t={t}
        />
      )}
      <ContactDetailModal
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
        onDeleteWithUndo={handleDeleteWithUndo}
        contact={selectedContact}
        t={t}
      />

      {/* Bulk Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={loadingDelete ? undefined : handleBulkDeleteCancel}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-center text-gray-900 dark:text-white mb-2">
                {t('confirmBulkDelete') || 'Delete Contacts?'}
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                {(t('bulkDeleteConfirmation') || 'Are you sure you want to delete {count} contacts? This action cannot be undone.')
                  .replace('{count}', String(selectedIds.length))}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={handleBulkDeleteCancel}
                  disabled={loadingDelete}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleBulkDeleteConfirm}
                  disabled={loadingDelete}
                  className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-all shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {loadingDelete ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('deleting') || 'Deleting...'}
                    </>
                  ) : (
                    t('delete') || 'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(Dashboard);
