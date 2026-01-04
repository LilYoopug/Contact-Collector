
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { processAttendanceList } from '../services/geminiService';
import { Contact, OcrResultRow, Source, ConsentStatus } from '../types';
import { useAppUI } from '../App';
import { 
  UploadIcon, SpinnerIcon, ManualIcon, DatabaseIcon, 
  CodeIcon, CopyIcon, DownloadIcon 
} from './icons';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newContacts: Omit<Contact, 'id' | 'createdAt'>[]) => void;
  t: (key: string) => string;
  onGoToApi?: () => void;
  existingContacts: Contact[];
  onMergeContact?: (existingId: string, updates: Partial<Contact>) => void;
}

type AddTab = 'manual' | 'ocr' | 'import' | 'webform';
type WizardStep = 'upload' | 'processing' | 'review' | 'duplicates';

interface Conflict {
  newContact: Omit<Contact, 'id' | 'createdAt'>;
  existingContact: Contact;
  index: number;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ 
  isOpen, onClose, onSave, t, onGoToApi, existingContacts, onMergeContact 
}) => {
  const { showToast } = useAppUI();
  const [activeTab, setActiveTab] = useState<AddTab>('manual');
  const [isDragging, setIsDragging] = useState(false);
  
  const [ocrStep, setOcrStep] = useState<WizardStep>('upload');
  const [ocrData, setOcrData] = useState<OcrResultRow[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [showImageComparison, setShowImageComparison] = useState(false);

  // Duplicate Resolution State
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [safeContacts, setSafeContacts] = useState<Omit<Contact, 'id' | 'createdAt'>[]>([]);

  const [manualData, setManualData] = useState<Omit<Contact, 'id' | 'createdAt'>>({
    fullName: '',
    phone: '',
    email: '',
    company: '',
    jobTitle: '',
    source: Source.Manual,
    consent: ConsentStatus.Unknown,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClose = () => {
    setOcrStep('upload');
    setOcrData([]);
    setOcrError(null);
    setOcrImagePreview(null);
    setShowImageComparison(false);
    setImportStatus('idle');
    setImportError(null);
    setFormErrors({});
    setConflicts([]);
    setSafeContacts([]);
    setManualData({
      fullName: '',
      phone: '',
      email: '',
      company: '',
      jobTitle: '',
      source: Source.Manual,
      consent: ConsentStatus.Unknown,
    });
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (activeTab === 'ocr') handleOcrFileChange(file);
      else if (activeTab === 'import') handleImportFileChange(file);
    }
  };

  const checkForDuplicates = (contacts: Omit<Contact, 'id' | 'createdAt'>[]) => {
    const foundConflicts: Conflict[] = [];
    const foundSafe: Omit<Contact, 'id' | 'createdAt'>[] = [];

    contacts.forEach((nc, idx) => {
      const existing = existingContacts.find(ec => 
        (nc.email && ec.email.toLowerCase() === nc.email.toLowerCase()) || 
        (nc.phone && ec.phone.replace(/\D/g,'') === nc.phone.replace(/\D/g,''))
      );

      if (existing) {
        foundConflicts.push({ newContact: nc, existingContact: existing, index: idx });
      } else {
        foundSafe.push(nc);
      }
    });

    if (foundConflicts.length > 0) {
      setConflicts(foundConflicts);
      setSafeContacts(foundSafe);
      setOcrStep('duplicates');
    } else {
      onSave(contacts);
      handleClose();
    }
  };

  const resolveConflict = (idx: number, action: 'skip' | 'add' | 'merge') => {
    const conflict = conflicts[idx];
    
    if (action === 'add') {
      setSafeContacts(prev => [...prev, conflict.newContact]);
    } else if (action === 'merge' && onMergeContact) {
      const updates: Partial<Contact> = {};
      if (!conflict.existingContact.company && conflict.newContact.company) updates.company = conflict.newContact.company;
      if (!conflict.existingContact.jobTitle && conflict.newContact.jobTitle) updates.jobTitle = conflict.newContact.jobTitle;
      if (!conflict.existingContact.email && conflict.newContact.email) updates.email = conflict.newContact.email;
      onMergeContact(conflict.existingContact.id, updates);
    }

    const remaining = conflicts.filter((_, i) => i !== idx);
    setConflicts(remaining);

    if (remaining.length === 0) {
      const finalToSave = action === 'add' ? [...safeContacts, conflict.newContact] : safeContacts;
      if (finalToSave.length > 0) onSave(finalToSave);
      handleClose();
    }
  };

  const resolveAll = (action: 'skip' | 'add') => {
    if (action === 'add') {
      const allToSave = [...safeContacts, ...conflicts.map(c => c.newContact)];
      onSave(allToSave);
    } else if (safeContacts.length > 0) {
      onSave(safeContacts);
    }
    handleClose();
  };

  const handleManualSave = () => {
    const errors: Record<string, string> = {};
    if (!manualData.fullName.trim()) errors.fullName = "Name is required";
    if (!manualData.phone.trim()) errors.phone = "Phone is required";
    if (manualData.email && !/\S+@\S+\.\S+/.test(manualData.email)) errors.email = "Invalid email format";
    
    if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        showToast("Please check the form for errors", "error");
        return;
    }

    checkForDuplicates([manualData]);
  };

  const handleOcrFileChange = useCallback(async (file: File | null) => {
    if (!file) return;

    // Type Validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setOcrError(t('err_invalid_img_type'));
      return;
    }

    // Size Validation
    if (file.size > 10 * 1024 * 1024) {
      setOcrError(t('err_img_too_large'));
      return;
    }

    setOcrError(null);
    setOcrStep('processing');
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setOcrImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const results = await processAttendanceList(file);
      if (!results || results.length === 0) throw new Error("empty");
      setOcrData(results);
      setOcrStep('review');
      showToast("Scan complete! Please review and verify.", "success");
    } catch (err) {
      setOcrError(t('err_ocr_failed'));
      setOcrStep('upload');
      showToast(t('err_ocr_failed'), "error");
    }
  }, [showToast, t]);

  const handleOcrDataChange = (index: number, field: keyof OcrResultRow, value: string) => {
    const newData = [...ocrData];
    newData[index][field] = value;
    setOcrData(newData);
  };

  const processOcrReview = () => {
    const newContacts: Omit<Contact, 'id' | 'createdAt'>[] = ocrData.map(row => ({
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      company: row.company,
      jobTitle: '',
      source: Source.OcrList,
      consent: ConsentStatus.Unknown,
    }));
    checkForDuplicates(newContacts);
  };

  const handleImportFileChange = (file: File) => {
    setImportError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx'].includes(extension || '')) {
      setImportStatus('error');
      setImportError(t('err_invalid_import_type'));
      return;
    }

    setImportStatus('processing');
    setTimeout(() => {
      // Logic for real parsing would go here (e.g., using xlsx library)
      // For now we simulate success or potential empty file error
      const isSimulatedEmpty = file.size < 10; 
      if (isSimulatedEmpty) {
        setImportStatus('error');
        setImportError(t('err_empty_import'));
        return;
      }

      setImportStatus('success');
      const imported: Omit<Contact, 'id' | 'createdAt'>[] = [
        { fullName: 'New Person 1', phone: '123456', email: 'new1@test.com', company: 'NewCo', jobTitle: 'Rep', source: Source.Import, consent: ConsentStatus.Unknown },
        { fullName: 'Budi Santoso', phone: '6281234567890', email: 'budi.santoso@example.com', company: 'PT Maju Mundur', jobTitle: 'Updated Job', source: Source.Import, consent: ConsentStatus.Unknown },
        { fullName: 'New Person 2', phone: '789012', email: 'new2@test.com', company: 'NewCo', jobTitle: 'Rep', source: Source.Import, consent: ConsentStatus.Unknown },
      ];
      checkForDuplicates(imported);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full max-w-6xl shadow-2xl rounded-[2.5rem] bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 ${isDragging ? 'ring-4 ring-primary-500/50 scale-[1.01]' : ''}`}
        >
          {isDragging && ( activeTab === 'ocr' || activeTab === 'import' ) && (
            <div className="absolute inset-0 z-50 bg-primary-600/10 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none border-4 border-dashed border-primary-500 rounded-[2.5rem]">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
                    <UploadIcon className="w-16 h-16 text-primary-600 animate-bounce" />
                    <p className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">{t('dropFiles')}</p>
                </div>
            </div>
          )}

          <div className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 px-8 pt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {ocrStep === 'duplicates' ? t('duplicatesDetected') : (ocrStep === 'review' ? t('verify_data') : t('ocrWizardTitle'))}
              </h3>
              <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {ocrStep !== 'duplicates' && ocrStep !== 'review' && (
                <nav className="flex space-x-8">
                {(['manual', 'ocr', 'import', 'webform'] as AddTab[]).map(tab => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 px-1 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                        activeTab === tab 
                        ? 'border-primary-600 text-primary-600' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                    >
                    <div className="flex items-center space-x-2">
                        {tab === 'manual' && <ManualIcon className="h-4 w-4" />}
                        {tab === 'ocr' && <UploadIcon className="h-4 w-4" />}
                        {tab === 'import' && <DatabaseIcon className="h-4 w-4" />}
                        {tab === 'webform' && <CodeIcon className="h-4 w-4" />}
                        <span>{t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}</span>
                    </div>
                    </button>
                ))}
                </nav>
            )}
          </div>

          <div className="p-8">
            {ocrStep === 'duplicates' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-[2rem] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800 flex items-center justify-center rounded-2xl text-amber-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <p className="text-lg font-black text-amber-900 dark:text-amber-400 leading-tight">{conflicts.length} {t('conflictsRemaining')}</p>
                                <p className="text-sm text-amber-700/70 dark:text-amber-500/70 font-medium">{t('duplicateDesc')}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => resolveAll('skip')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 hover:bg-amber-50 transition-all">{t('resolveAllSkip')}</button>
                             <button onClick={() => resolveAll('add')} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all">{t('resolveAllAdd')}</button>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar">
                        {conflicts.map((conflict, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] p-6 shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-lg font-black">{conflict.newContact.fullName.charAt(0)}</div>
                                        <div>
                                          <h4 className="text-xl font-black text-gray-900 dark:text-white">{conflict.newContact.fullName}</h4>
                                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('duplicateFound')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => resolveConflict(idx, 'skip')} className="px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-all">{t('skipDuplicate')}</button>
                                        <button onClick={() => resolveConflict(idx, 'merge')} className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-all">{t('mergeDuplicate')}</button>
                                        <button onClick={() => resolveConflict(idx, 'add')} className="px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">{t('addAnyway')}</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-inner">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t('existingRecord')}</p>
                                        <div className="space-y-3">
                                            <div>
                                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Email</p>
                                              <p className="text-sm font-bold text-gray-900 dark:text-white">{conflict.existingContact.email || '-'}</p>
                                            </div>
                                            <div>
                                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Phone</p>
                                              <p className="text-sm font-bold text-gray-900 dark:text-white">{conflict.existingContact.phone || '-'}</p>
                                            </div>
                                            <div>
                                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Company</p>
                                              <p className="text-sm font-bold text-gray-900 dark:text-white">{conflict.existingContact.company || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-primary-50/20 dark:bg-primary-900/10 rounded-3xl border border-primary-100/50 dark:border-primary-800/50 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2">
                                          <div className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest border border-amber-500/20">{t('diff_detected')}</div>
                                        </div>
                                        <p className="text-[9px] font-black text-primary-400 uppercase tracking-[0.2em] mb-4">{t('newRecord')}</p>
                                        <div className="space-y-3">
                                            <div>
                                              <p className="text-[8px] font-black text-primary-400 uppercase tracking-tighter">Email</p>
                                              <p className={`text-sm font-bold ${conflict.newContact.email.toLowerCase() === conflict.existingContact.email.toLowerCase() ? 'text-gray-900 dark:text-white' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 rounded'}`}>
                                                {conflict.newContact.email || '-'}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-[8px] font-black text-primary-400 uppercase tracking-tighter">Phone</p>
                                              <p className={`text-sm font-bold ${conflict.newContact.phone.replace(/\D/g,'') === conflict.existingContact.phone.replace(/\D/g,'') ? 'text-gray-900 dark:text-white' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 rounded'}`}>
                                                {conflict.newContact.phone || '-'}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-[8px] font-black text-primary-400 uppercase tracking-tighter">Company</p>
                                              <p className={`text-sm font-bold ${conflict.newContact.company === conflict.existingContact.company ? 'text-gray-900 dark:text-white' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1 rounded'}`}>
                                                {conflict.newContact.company || '-'}
                                              </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'manual' ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('fullName')} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={manualData.fullName}
                      onChange={(e) => {
                        setManualData({...manualData, fullName: e.target.value});
                        if (formErrors.fullName) setFormErrors({...formErrors, fullName: ''});
                      }}
                      className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl p-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${formErrors.fullName ? 'border-red-500 ring-red-500/10 ring-4' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                      placeholder="e.g. John Doe"
                    />
                    {formErrors.fullName && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase">{formErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('phone')} <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={manualData.phone}
                      onChange={(e) => {
                        setManualData({...manualData, phone: e.target.value});
                        if (formErrors.phone) setFormErrors({...formErrors, phone: ''});
                      }}
                      className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl p-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${formErrors.phone ? 'border-red-500 ring-red-500/10 ring-4' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                      placeholder="+62..."
                    />
                    {formErrors.phone && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('email')}</label>
                    <input 
                      type="email" 
                      value={manualData.email}
                      onChange={(e) => {
                        setManualData({...manualData, email: e.target.value});
                        if (formErrors.email) setFormErrors({...formErrors, email: ''});
                      }}
                      className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-2xl p-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${formErrors.email ? 'border-red-500 ring-red-500/10 ring-4' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                      placeholder="john@example.com"
                    />
                    {formErrors.email && <p className="mt-1.5 text-[10px] text-red-500 font-bold uppercase">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('company')}</label>
                    <input 
                      type="text" 
                      value={manualData.company}
                      onChange={(e) => setManualData({...manualData, company: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all dark:text-white"
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('jobTitle')}</label>
                    <input 
                      type="text" 
                      value={manualData.jobTitle}
                      onChange={(e) => setManualData({...manualData, jobTitle: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 text-sm font-semibold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all dark:text-white"
                      placeholder="e.g. Sales Manager"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{t('consent')}</label>
                    <select 
                      value={manualData.consent}
                      onChange={(e) => setManualData({...manualData, consent: e.target.value as ConsentStatus})}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5 text-sm font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all dark:text-white"
                    >
                      <option value={ConsentStatus.OptIn}>{t('optIn')}</option>
                      <option value={ConsentStatus.OptOut}>{t('optOut')}</option>
                      <option value={ConsentStatus.Unknown}>{t('unknown')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-8 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={handleManualSave} className="w-full sm:w-auto bg-primary-600 text-white px-10 py-3.5 rounded-2xl font-black text-sm hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-500/20">
                    {t('submit')}
                  </button>
                </div>
              </div>
            ) : activeTab === 'ocr' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                {ocrStep === 'upload' && (
                  <div className="mt-2">
                    <label className="relative cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center p-20 text-center hover:border-primary-400 dark:hover:border-primary-600 hover:bg-white dark:hover:bg-gray-900 transition-all group">
                      <div className="w-24 h-24 bg-primary-50 dark:bg-primary-900/20 rounded-[2rem] flex items-center justify-center text-primary-600 dark:text-primary-400 mb-6 group-hover:scale-110 transition-transform shadow-sm">
                        <UploadIcon className="h-12 w-12" />
                      </div>
                      <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{t('uploadPrompt')}</span>
                      <span className="text-sm text-gray-500 mt-2 font-medium">{t('uploadHint')}</span>
                      <input type="file" className="sr-only" onChange={(e) => handleOcrFileChange(e.target.files?.[0] || null)} accept="image/*" />
                    </label>
                    {ocrError && <div className="mt-6 p-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-sm font-bold text-red-600 text-center animate-in slide-in-from-top-2">{ocrError}</div>}
                  </div>
                )}
                {ocrStep === 'processing' && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="relative mb-10">
                      <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full animate-pulse"></div>
                      <SpinnerIcon className="h-20 w-20 text-primary-600 animate-spin relative" />
                    </div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('processing')}</p>
                    <p className="mt-3 text-base text-gray-500 max-w-sm font-medium">{t('processingDesc')}</p>
                  </div>
                )}
                {ocrStep === 'review' && (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row gap-8 min-h-[50vh]">
                      {/* Comparison View Sidebar */}
                      <div className={`transition-all duration-500 overflow-hidden ${showImageComparison ? 'w-full lg:w-[40%]' : 'w-0'}`}>
                        <div className="h-full bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 overflow-hidden shadow-inner flex flex-col">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-800/50 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Original Reference</span>
                            <button onClick={() => setShowImageComparison(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3} strokeLinecap="round" /></svg></button>
                          </div>
                          <div className="flex-1 overflow-auto custom-scrollbar p-4 flex items-center justify-center bg-gray-200 dark:bg-gray-900">
                             {ocrImagePreview && <img src={ocrImagePreview} alt="OCR Preview" className="max-w-full rounded-xl shadow-2xl" />}
                          </div>
                        </div>
                      </div>

                      {/* Extracted Data Table */}
                      <div className="flex-1 flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-500">{ocrData.length} records detected by AI</p>
                            {!showImageComparison && (
                              <button 
                                onClick={() => setShowImageComparison(true)}
                                className="flex items-center gap-2 text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth={2}/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth={2}/></svg>
                                {t('compare_with_original')}
                              </button>
                            )}
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                          <div className="overflow-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                              <thead className="bg-gray-50/50 dark:bg-gray-800/50 sticky top-0 z-10 backdrop-blur-sm">
                                <tr>
                                  {['fullName', 'phone', 'email', 'company'].map(h => (
                                    <th key={h} className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{t(h)}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-50 dark:divide-gray-800">
                                {ocrData.map((row, idx) => (
                                  <tr key={idx} className="group hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors">
                                    {(Object.keys(row) as Array<keyof OcrResultRow>).map(field => (
                                      <td key={field} className="px-4 py-3">
                                        <input 
                                          type="text" 
                                          value={row[field]} 
                                          onChange={(e) => handleOcrDataChange(idx, field, e.target.value)}
                                          className="w-full bg-transparent border-none text-sm font-bold p-1 focus:ring-4 focus:ring-primary-500/10 rounded-xl transition-all dark:text-white group-hover:bg-white dark:group-hover:bg-gray-800"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => setOcrStep('upload')} className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all">{t('cancel')}</button>
                      <button onClick={processOcrReview} className="bg-primary-600 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-2xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all">
                        {t('saveContacts')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'import' ? (
              <div className="space-y-12 py-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <DownloadIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('downloadTemplate')}</h4>
                      <p className="text-sm text-gray-500 leading-relaxed font-medium">{t('importDesc')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm">CSV</button>
                      <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm">XLSX</button>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${importStatus === 'error' ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20'}`}>
                      <UploadIcon className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('importFilePrompt')}</h4>
                      {(importStatus === 'idle' || importStatus === 'error') && (
                        <div className="space-y-4">
                          <label className={`relative cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center p-10 text-center transition-all group ${importStatus === 'error' ? 'border-red-300 dark:border-red-900/50 bg-red-50/30' : 'border-gray-200 dark:border-gray-800 hover:border-primary-400'}`}>
                            <span className={`text-sm font-bold ${importStatus === 'error' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 group-hover:text-primary-600'}`}>
                              {importStatus === 'error' ? 'Upload failed' : t('uploadHint')}
                            </span>
                            <input type="file" className="sr-only" onChange={(e) => e.target.files?.[0] && handleImportFileChange(e.target.files[0])} accept=".csv, .xlsx" />
                          </label>
                          {importError && (
                             <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs font-bold text-red-600 text-center animate-in slide-in-from-top-2">
                               {importError}
                             </div>
                          )}
                        </div>
                      )}
                      {importStatus === 'processing' && (
                        <div className="flex flex-col items-center py-10 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                          <SpinnerIcon className="h-10 w-10 text-primary-600 animate-spin" />
                          <p className="mt-4 text-sm font-black uppercase tracking-widest text-gray-500">{t('processing')}</p>
                        </div>
                      )}
                      {importStatus === 'success' && (
                        <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 p-8 rounded-[2rem] text-center animate-in zoom-in-95">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <p className="text-green-700 dark:text-green-400 font-black text-lg">Import Ready!</p>
                          <p className="text-xs text-gray-500 mt-2 font-medium">Parsed file contents. Reviewing for safe upload...</p>
                          <button onClick={() => setImportStatus('idle')} className="mt-6 text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">Import more</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto">
                    <div className="p-8 bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-900/20 rounded-[2.5rem]">
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{t('webFormDesc')}</p>
                    </div>
                    <div className="space-y-6">
                        <div className="p-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm">
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 tracking-[0.2em]">{t('webFormEndpoint')}</label>
                            <div className="flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <code className="text-sm text-primary-600 dark:text-primary-400 truncate font-mono font-bold">https://api.cc.io/v1/webhook/user_99</code>
                                <button onClick={() => { navigator.clipboard.writeText('https://api.cc.io/v1/webhook/user_99'); showToast('Endpoint copied', 'success'); }} className="p-2.5 hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all text-gray-400 hover:text-primary-600 shadow-sm"><CopyIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddContactModal;
