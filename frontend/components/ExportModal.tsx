
import React, { useState } from 'react';
import { Contact } from '../types';
import { DownloadIcon, SpinnerIcon } from './icons';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredContacts: Contact[];
  allContacts: Contact[];
  t: (key: string) => string;
}

type ExportFormat = 'csv' | 'json';
type ExportRange = 'all' | 'filtered';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, filteredContacts, allContacts, t }) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [range, setRange] = useState<ExportRange>('filtered');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'fullName', 'phone', 'email', 'company', 'jobTitle', 'source', 'consent', 'createdAt'
  ]);

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

  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    setIsExporting(true);
    const dataToExport = range === 'all' ? allContacts : filteredContacts;
    
    // Simulate slight delay for UX
    setTimeout(() => {
      if (format === 'csv') {
        const header = selectedColumns.map(col => columns.find(c => c.id === col)?.label).join(',');
        const rows = dataToExport.map(contact => {
          return selectedColumns.map(col => {
            let val = (contact as any)[col];
            if (val instanceof Date) val = val.toISOString();
            // Simple CSV escape
            return `"${String(val).replace(/"/g, '""')}"`;
          }).join(',');
        });
        const csvContent = [header, ...rows].join('\n');
        downloadFile(csvContent, `contacts-export-${Date.now()}.csv`, 'text/csv');
      } else {
        const cleanData = dataToExport.map(contact => {
          const obj: any = {};
          selectedColumns.forEach(col => {
            obj[col] = (contact as any)[col];
          });
          return obj;
        });
        const jsonContent = JSON.stringify(cleanData, null, 2);
        downloadFile(jsonContent, `contacts-export-${Date.now()}.json`, 'application/json');
      }
      setIsExporting(false);
      onClose();
    }, 1000);
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
            {/* Export Range */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('exportRange')}</label>
              <div className="flex gap-4">
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${range === 'filtered' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'}`}>
                  <input type="radio" name="range" className="sr-only" checked={range === 'filtered'} onChange={() => setRange('filtered')} />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{t('filteredContacts')}</span>
                  <span className="text-xs text-gray-500 mt-1">{filteredContacts.length} {t('results')}</span>
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${range === 'all' ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800'}`}>
                  <input type="radio" name="range" className="sr-only" checked={range === 'all'} onChange={() => setRange('all')} />
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{t('allContacts')}</span>
                  <span className="text-xs text-gray-500 mt-1">{allContacts.length} {t('results')}</span>
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
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-bold">
              {t('cancel')}
            </button>
            <button 
              disabled={isExporting || selectedColumns.length === 0}
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
