
import React from 'react';
import { ConsentStatus, Source } from '../types';
import { DownloadIcon } from './icons';

export type DateFilter = 'all' | 'today' | '7days' | '30days' | 'thisMonth';

interface FilterBarProps {
  onAddContact: () => void;
  onExport: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  activeDateFilter: DateFilter;
  setActiveDateFilter: (val: DateFilter) => void;
  consentFilter: ConsentStatus | 'all';
  setConsentFilter: (val: ConsentStatus | 'all') => void;
  sourceFilter: Source | 'all';
  setSourceFilter: (val: Source | 'all') => void;
  t: (key: string) => string;
  isBulkMode: boolean;
  setIsBulkMode: (val: boolean) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  onAddContact, 
  onExport,
  searchQuery, setSearchQuery,
  activeDateFilter, setActiveDateFilter,
  consentFilter, setConsentFilter,
  sourceFilter, setSourceFilter,
  t,
  isBulkMode,
  setIsBulkMode
}) => {
  const dateFilters: { label: string, value: DateFilter }[] = [
    { label: t('allTime'), value: 'all' },
    { label: t('today'), value: 'today' },
    { label: t('last7Days'), value: '7days' },
    { label: t('last30Days'), value: '30days' },
    { label: t('thisMonth'), value: 'thisMonth' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all shadow-sm"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkMode(!isBulkMode)}
            className={`inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95 border ${
              isBulkMode 
                ? 'bg-primary-600 text-white border-primary-600' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <svg className={`w-4 h-4 mr-2 ${isBulkMode ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isBulkMode ? t('close') : t('bulkMode')}
          </button>
          <button
            onClick={onExport}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-semibold rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-all"
          >
            <DownloadIcon className="w-5 h-5 mr-2 text-gray-400" />
            {t('export')}
          </button>
          <button
            onClick={onAddContact}
            className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900 transition-all"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('addContact')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
        {/* Date Filters */}
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {dateFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveDateFilter(filter.value)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                activeDateFilter === filter.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={consentFilter}
          onChange={(e) => setConsentFilter(e.target.value as any)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 transition-all shadow-sm outline-none"
        >
          <option value="all">{t('allStatus')}</option>
          <option value={ConsentStatus.OptIn}>{t('optIn')}</option>
          <option value={ConsentStatus.OptOut}>{t('optOut')}</option>
          <option value={ConsentStatus.Unknown}>{t('unknown')}</option>
        </select>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2 transition-all shadow-sm outline-none"
        >
          <option value="all">{t('allSources')}</option>
          {Object.values(Source).map(src => (
            <option key={src} value={src}>{t(`source_${src}`)}</option>
          ))}
        </select>

        {/* Clear Filters helper */}
        {(searchQuery || activeDateFilter !== 'all' || consentFilter !== 'all' || sourceFilter !== 'all') && (
          <button 
            onClick={() => {
              setSearchQuery('');
              setActiveDateFilter('all');
              setConsentFilter('all');
              setSourceFilter('all');
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-auto px-2"
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
