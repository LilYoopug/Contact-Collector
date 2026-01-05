
import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { DownloadIcon, SpinnerIcon } from './icons';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredContacts: Contact[];
  allContacts: Contact[];
  selectedContacts?: Contact[];  // Story 5.7: Export selected contacts
  t: (key: string) => string;
}

type ExportFormat = 'csv' | 'json';
type ExportRange = 'all' | 'filtered' | 'selected';  // Added 'selected' for Story 5.7

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  filteredContacts, 
  allContacts, 
  selectedContacts = [],  // Default to empty array
  t 
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [range, setRange] = useState<ExportRange>('filtered');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'fullName', 'phone', 'email', 'company', 'jobTitle', 'source', 'consent', 'createdAt'
  ]);

  const hasSelection = selectedContacts.length > 0;

  // Default to 'selected' if contacts are selected, otherwise 'filtered' (Story 5.7 AC#1)
  useEffect(() => {
    if (isOpen) {
      if (hasSelection) {
        setRange('selected');
      } else {
        setRange('filtered');
      }
    }
  }, [hasSelection, isOpen]);

  const columns = [
    { id: 'fullName', label: t('fullName') },
    { id: 'phone', label: t('phone') },
    { id: 'email', label: t('email') },
    { id: 'company', label: t('company') },
    { id: 'jobTitle', label: t('jobTitle') },
    { id: 'source', label: t('source') },
    { id: 'consent', label: t('consent') },
    { id: 'createdAt', label: t('addedOn') },
  ];

  // Determine data to export based on range (Story 5.7)
  const dataToExport = useMemo(() => {
    switch (range) {
      case 'selected':
        return selectedContacts;
      case 'filtered':
        return filteredContacts;
      case 'all':
      default:
        return allContacts;
    }
  }, [range, selectedContacts, filteredContacts, allContacts]);

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  /**
   * Escape value for CSV format (Story 5.5 AC#4)
   * - Handles null/undefined as empty string
   * - Handles commas, quotes, and newlines
   */
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '""';
    
    let str = String(value);
    
    // Convert Date to ISO string
    if (value instanceof Date) {
      str = value.toISOString();
    }
    
    // Escape internal quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExport = () => {
    setIsExporting(true);
    
    // Simulate slight delay for UX
    setTimeout(() => {
      try {
        if (format === 'csv') {
          // Story 5.5: CSV Export
          const header = selectedColumns.map(col => columns.find(c => c.id === col)?.label).join(',');
          const rows = dataToExport.map(contact => {
            return selectedColumns.map(col => {
              const val = (contact as any)[col];
              return escapeCSV(val);
            }).join(',');
          });
          const csvContent = [header, ...rows].join('\n');
          downloadFile(csvContent, `contacts-export-${Date.now()}.csv`, 'text/csv');
        } else {
          // Story 5.6: JSON Export
          const cleanData = dataToExport.map(contact => {
            const obj: any = {};
            selectedColumns.forEach(col => {
              let value = (contact as any)[col];
              
              // Convert Date to ISO string for JSON (Story 5.6 AC#5)
              if (value instanceof Date) {
                value = value.toISOString();
              }
              
              obj[col] = value;
            });
            return obj;
          });
          const jsonContent = JSON.stringify(cleanData, null, 2);
          downloadFile(jsonContent, `contacts-export-${Date.now()}.json`, 'application/json');
        }
        
        setIsExporting(false);
        onClose();
      } catch (error) {
        // Story 5.5/5.6: Error handling
        console.error('Export failed:', error);
        setIsExporting(false);
        // Show error to user (modal stays open)
        alert(t('exportFailed') || 'Export failed. Please try again.');
      }
    }, 500);
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg shadow-2xl rounded-3xl bg-white dark:bg-gray-950 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('exportContacts')}</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Export Range - Story 5.7 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('exportRange')}</label>
              <div className="flex flex-col gap-2">
                {/* Export Selected - only shown if contacts selected (Story 5.7 AC#1) */}
                {hasSelection && (
                  <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    range === 'selected' 
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="range" 
                        className="w-4 h-4 text-primary-600"
                        checked={range === 'selected'} 
                        onChange={() => setRange('selected')} 
                      />
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {t('selectedContacts') || 'Selected contacts'}
                        </span>
                        <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
                          ({t('recommended') || 'recommended'})
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {selectedContacts.length} {t('contacts') || 'contacts'}
                    </span>
                  </label>
                )}

                {/* Export Filtered */}
                <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  range === 'filtered' 
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="range" 
                      className="w-4 h-4 text-primary-600"
                      checked={range === 'filtered'} 
                      onChange={() => setRange('filtered')} 
                    />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {t('filteredContacts')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {filteredContacts.length} {t('results')}
                  </span>
                </label>

                {/* Export All */}
                <label className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                  range === 'all' 
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="range" 
                      className="w-4 h-4 text-primary-600"
                      checked={range === 'all'} 
                      onChange={() => setRange('all')} 
                    />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {t('allContacts')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {allContacts.length} {t('results')}
                  </span>
                </label>
              </div>
            </div>

            {/* File Format */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('fileFormat')}</label>
              <div className="flex gap-4">
                <button onClick={() => setFormat('csv')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${format === 'csv' ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'}`}>CSV</button>
                <button onClick={() => setFormat('json')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${format === 'json' ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'}`}>JSON</button>
              </div>
            </div>

            {/* Column Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('includeColumns')}</label>
              <div className="grid grid-cols-2 gap-2">
                {columns.map(col => (
                  <label key={col.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedColumns.includes(col.id)} 
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 rounded-md text-primary-600 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Preview Count */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{dataToExport.length}</span> {t('contacts') || 'contacts'} {t('willBeExported') || 'will be exported'}
              </p>
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold">
              {t('cancel')}
            </button>
            <button 
              disabled={isExporting || selectedColumns.length === 0 || dataToExport.length === 0}
              onClick={handleExport} 
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isExporting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <DownloadIcon className="w-5 h-5" />}
              {isExporting ? t('downloading') : t('startExport')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
