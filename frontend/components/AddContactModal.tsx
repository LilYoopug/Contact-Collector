
import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { processAttendanceList } from '../services/geminiService';
import { contactService, BatchCreateResult } from '../services/contactService';
import { apiKeyService, type ApiKey } from '../services/apiKeyService';
import { getPublicEndpointDisplay } from '../constants';
import { Contact, OcrResultRow, Source, ConsentStatus } from '../types';
import { useAppUI } from '../App';
import { 
  UploadIcon, SpinnerIcon, ManualIcon, DatabaseIcon, 
  CodeIcon, CopyIcon, DownloadIcon, TrashIcon, KeyIcon, BookOpenIcon, CheckIcon, PlusIcon
} from './icons';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newContacts: Omit<Contact, 'id' | 'createdAt'>[]) => void;
  onContactCreated?: (contact: Contact) => void;
  t: (key: string) => string;
  onGoToApi?: () => void;
  existingContacts: Contact[];
  onMergeContact?: (existingId: string, updates: Partial<Contact>) => void;
}

type AddTab = 'manual' | 'ocr' | 'import' | 'webform';
type WizardStep = 'upload' | 'processing' | 'review' | 'duplicates' | 'results';

interface Conflict {
  newContact: Omit<Contact, 'id' | 'createdAt'>;
  existingContact: Contact;
  index: number;
}

interface ParsedContact {
  fullName: string;
  phone: string;
  email: string;
  company: string;
  jobTitle?: string;
}

// Column mapping for CSV headers
const HEADER_MAPPINGS: Record<string, string[]> = {
  fullName: ['name', 'full_name', 'fullname', 'nama', 'contact', 'contact_name', 'nama lengkap'],
  phone: ['phone', 'phone_number', 'telephone', 'tel', 'mobile', 'hp', 'nomor', 'no_hp', 'no hp', 'handphone', 'telepon'],
  email: ['email', 'e-mail', 'mail', 'email_address'],
  company: ['company', 'organization', 'org', 'perusahaan', 'company_name', 'organisasi'],
  jobTitle: ['job_title', 'jobtitle', 'title', 'position', 'jabatan', 'role'],
};

const findHeaderMapping = (header: string): string | null => {
  const normalized = header.toLowerCase().trim();
  for (const [field, variations] of Object.entries(HEADER_MAPPINGS)) {
    if (variations.includes(normalized)) {
      return field;
    }
  }
  return null;
};

// Simple CSV parser that handles quoted values and different delimiters
const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Auto-detect delimiter (comma, semicolon, or tab)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount >= tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount >= semicolonCount) delimiter = '\t';
  
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
};

const parseCSVFile = (file: File): Promise<ParsedContact[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          reject(new Error('CSV file contains no data rows'));
          return;
        }
        
        // First row is headers
        const headers = rows[0];
        const dataRows = rows.slice(1);
        
        // Map headers to fields
        const fieldMap: Record<number, string> = {};
        headers.forEach((header, idx) => {
          const mapping = findHeaderMapping(header);
          if (mapping) {
            fieldMap[idx] = mapping;
          }
        });
        
        // Validate required columns
        const hasName = Object.values(fieldMap).includes('fullName');
        const hasPhone = Object.values(fieldMap).includes('phone');
        
        if (!hasName) {
          reject(new Error('CSV must have a name column (Name, Full Name, Nama)'));
          return;
        }
        if (!hasPhone) {
          reject(new Error('CSV must have a phone column (Phone, Phone Number, HP)'));
          return;
        }
        
        // Transform data rows
        const contacts: ParsedContact[] = dataRows
          .map(row => {
            const contact: ParsedContact = {
              fullName: '',
              phone: '',
              email: '',
              company: '',
            };
            
            row.forEach((value, idx) => {
              const field = fieldMap[idx];
              if (field && value) {
                (contact as any)[field] = value.trim();
              }
            });
            
            return contact;
          })
          .filter(c => c.fullName && c.phone); // Filter out empty rows
        
        if (contacts.length === 0) {
          reject(new Error('No valid contacts found in CSV'));
          return;
        }
        
        resolve(contacts);
      } catch (err: any) {
        reject(new Error(`Failed to parse CSV: ${err.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};

const downloadCSVTemplate = () => {
  const headers = ['Name', 'Phone', 'Email', 'Company', 'Job Title'];
  const example1 = ['John Doe', '+6281234567890', 'john@example.com', 'PT Example', 'Manager'];
  const example2 = ['Jane Smith', '+6289876543210', 'jane@company.com', 'CV Tech', 'Director'];
  
  const csvContent = [
    headers.join(','),
    example1.join(','),
    example2.join(','),
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'contacts_template.csv';
  link.click();
  
  URL.revokeObjectURL(url);
};

// XLSX parser using xlsx library
const parseXLSXFile = (file: File): Promise<ParsedContact[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('XLSX file has no sheets'));
          return;
        }
        
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Check if sheet has data
        if (!worksheet['!ref']) {
          reject(new Error('XLSX sheet is empty'));
          return;
        }
        
        // Convert to JSON - first row becomes keys automatically
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          raw: false,  // Get formatted values, not raw
          defval: '',  // Default empty string for missing cells
        });
        
        if (jsonData.length === 0) {
          reject(new Error('XLSX file contains no data rows'));
          return;
        }
        
        // Map headers to fields using same logic as CSV
        const contacts: ParsedContact[] = jsonData
          .map(row => {
            const contact: ParsedContact = {
              fullName: '',
              phone: '',
              email: '',
              company: '',
            };
            
            // Iterate through row keys and map them to our fields
            for (const [key, value] of Object.entries(row)) {
              const mapping = findHeaderMapping(key);
              if (mapping && value) {
                (contact as any)[mapping] = String(value).trim();
              }
            }
            
            return contact;
          })
          .filter(c => c.fullName && c.phone); // Filter out empty rows
        
        if (contacts.length === 0) {
          reject(new Error('No valid contacts found in XLSX (requires Name and Phone columns)'));
          return;
        }
        
        resolve(contacts);
      } catch (err: any) {
        // Handle specific xlsx errors
        if (err.message?.includes('password')) {
          reject(new Error('XLSX file is password protected'));
        } else if (err.message?.includes('Unsupported')) {
          reject(new Error('XLSX file format not supported'));
        } else {
          reject(new Error(`Failed to parse XLSX: ${err.message}`));
        }
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Download XLSX template using xlsx library
const downloadXLSXTemplate = () => {
  const headers = ['Name', 'Phone', 'Email', 'Company', 'Job Title'];
  const example1 = ['John Doe', '+6281234567890', 'john@example.com', 'PT Example', 'Manager'];
  const example2 = ['Jane Smith', '+6289876543210', 'jane@company.com', 'CV Tech', 'Director'];
  
  // Create worksheet from array of arrays
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example1, example2]);
  
  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  
  // Write file and trigger download
  XLSX.writeFile(workbook, 'contacts_template.xlsx');
};

const AddContactModal: React.FC<AddContactModalProps> = ({ 
  isOpen, onClose, onSave, onContactCreated, t, onGoToApi, existingContacts, onMergeContact 
}) => {
  const { showToast } = useAppUI();
  const [activeTab, setActiveTab] = useState<AddTab>('manual');
  const [isDragging, setIsDragging] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  
  const [ocrStep, setOcrStep] = useState<WizardStep>('upload');
  const [ocrData, setOcrData] = useState<OcrResultRow[]>([]);
  const [ocrOriginalData, setOcrOriginalData] = useState<OcrResultRow[]>([]); // Track original values for edit detection
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [showImageComparison, setShowImageComparison] = useState(false);
  const [ocrValidationErrors, setOcrValidationErrors] = useState<Record<number, string[]>>({});

  // Duplicate Resolution State
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [safeContacts, setSafeContacts] = useState<Omit<Contact, 'id' | 'createdAt'>[]>([]);
  
  // Import Results State (for FR22 summary display)
  const [batchResult, setBatchResult] = useState<BatchCreateResult | null>(null);
  const [duplicatesResolved, setDuplicatesResolved] = useState<number>(0);

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

  // Webform tab state
  const [webformApiKeys, setWebformApiKeys] = useState<ApiKey[]>([]);
  const [webformKeysLoading, setWebformKeysLoading] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Load API keys when webform tab is active
  useEffect(() => {
    if (activeTab === 'webform' && isOpen) {
      const loadKeys = async () => {
        setWebformKeysLoading(true);
        try {
          const keys = await apiKeyService.getAll();
          setWebformApiKeys(keys);
        } catch (err) {
          // Silently fail - user can still go to full API page
        } finally {
          setWebformKeysLoading(false);
        }
      };
      loadKeys();
    }
  }, [activeTab, isOpen]);

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
    setBatchResult(null);
    setDuplicatesResolved(0);
    setLoadingCreate(false);
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

  const resolveConflict = async (idx: number, action: 'skip' | 'add' | 'merge') => {
    const conflict = conflicts[idx];
    
    if (action === 'add') {
      // Call API to add the contact anyway (force create)
      try {
        const newContact = await contactService.create({
          fullName: conflict.newContact.fullName,
          phone: conflict.newContact.phone,
          email: conflict.newContact.email || undefined,
          company: conflict.newContact.company || undefined,
          jobTitle: conflict.newContact.jobTitle || undefined,
          source: conflict.newContact.source,
          consent: conflict.newContact.consent,
        });
        if (onContactCreated) onContactCreated(newContact);
        setDuplicatesResolved(prev => prev + 1);
      } catch (error: any) {
        showToast(error.message || 'Failed to add contact', 'error');
      }
    } else if (action === 'merge' && onMergeContact) {
      const updates: Partial<Contact> = {};
      if (!conflict.existingContact.company && conflict.newContact.company) updates.company = conflict.newContact.company;
      if (!conflict.existingContact.jobTitle && conflict.newContact.jobTitle) updates.jobTitle = conflict.newContact.jobTitle;
      if (!conflict.existingContact.email && conflict.newContact.email) updates.email = conflict.newContact.email;
      if (Object.keys(updates).length > 0) {
        onMergeContact(conflict.existingContact.id, updates);
      }
      setDuplicatesResolved(prev => prev + 1);
    } else {
      // Skip - just increment resolved count
      setDuplicatesResolved(prev => prev + 1);
    }

    const remaining = conflicts.filter((_, i) => i !== idx);
    setConflicts(remaining);

    if (remaining.length === 0) {
      // All duplicates resolved, show results summary
      setOcrStep('results');
    }
  };

  const resolveAll = async (action: 'skip' | 'add') => {
    if (action === 'add') {
      // Batch create all duplicate contacts anyway
      const contactsToForceCreate = conflicts.map(c => ({
        fullName: c.newContact.fullName,
        phone: c.newContact.phone,
        email: c.newContact.email || undefined,
        company: c.newContact.company || undefined,
        jobTitle: c.newContact.jobTitle || undefined,
        source: c.newContact.source,
        consent: c.newContact.consent,
      }));
      
      try {
        const result = await contactService.createBatch(contactsToForceCreate);
        result.created.forEach(c => {
          if (onContactCreated) onContactCreated(c);
        });
        setDuplicatesResolved(prev => prev + conflicts.length);
      } catch (error: any) {
        showToast(error.message || 'Failed to add contacts', 'error');
      }
    } else {
      // Skip all - mark as resolved
      setDuplicatesResolved(prev => prev + conflicts.length);
    }
    
    setConflicts([]);
    setOcrStep('results');
  };

  const handleManualSave = async () => {
    const errors: Record<string, string> = {};
    if (!manualData.fullName.trim()) errors.fullName = "Name is required";
    if (!manualData.phone.trim()) errors.phone = "Phone is required";
    if (manualData.email && !/\S+@\S+\.\S+/.test(manualData.email)) errors.email = "Invalid email format";
    
    if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        showToast("Please check the form for errors", "error");
        return;
    }

    // Call API to create contact
    setLoadingCreate(true);
    setFormErrors({});

    try {
      const newContact = await contactService.create({
        fullName: manualData.fullName,
        phone: manualData.phone,
        email: manualData.email || undefined,
        company: manualData.company || undefined,
        jobTitle: manualData.jobTitle || undefined,
        source: manualData.source,
        consent: manualData.consent,
      });

      // Notify parent of new contact
      if (onContactCreated) {
        onContactCreated(newContact);
      }
      
      showToast(t('contactCreated') || "Contact created successfully", "success");
      handleClose();
    } catch (error: any) {
      if (error.errors) {
        // Backend validation errors - map snake_case to camelCase for form display
        const mappedErrors: Record<string, string> = {};
        if (error.errors.full_name) mappedErrors.fullName = error.errors.full_name[0];
        if (error.errors.phone) mappedErrors.phone = error.errors.phone[0];
        if (error.errors.email) mappedErrors.email = error.errors.email[0];
        if (error.errors.company) mappedErrors.company = error.errors.company[0];
        if (error.errors.job_title) mappedErrors.jobTitle = error.errors.job_title[0];
        setFormErrors(mappedErrors);
      } else {
        showToast(error.message || t('createFailed') || "Failed to create contact", "error");
      }
    } finally {
      setLoadingCreate(false);
    }
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
      setOcrOriginalData(JSON.parse(JSON.stringify(results))); // Store original for edit tracking
      setOcrValidationErrors({});
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
    // Clear validation error for this field if user is editing it
    if (ocrValidationErrors[index]) {
      const newErrors = { ...ocrValidationErrors };
      newErrors[index] = newErrors[index].filter(f => f !== field);
      if (newErrors[index].length === 0) delete newErrors[index];
      setOcrValidationErrors(newErrors);
    }
  };

  const handleDeleteRow = (index: number) => {
    setOcrData(prev => prev.filter((_, i) => i !== index));
    setOcrOriginalData(prev => prev.filter((_, i) => i !== index));
    // Clear validation errors for deleted row and re-index remaining errors
    const newErrors: Record<number, string[]> = {};
    Object.keys(ocrValidationErrors).forEach((key) => {
      const keyNum = parseInt(key);
      const value = ocrValidationErrors[keyNum];
      if (keyNum < index) {
        newErrors[keyNum] = value;
      } else if (keyNum > index) {
        newErrors[keyNum - 1] = value;
      }
    });
    setOcrValidationErrors(newErrors);
  };

  const isFieldEdited = (index: number, field: keyof OcrResultRow): boolean => {
    if (!ocrOriginalData[index]) return false;
    return ocrData[index][field] !== ocrOriginalData[index][field];
  };

  const isRowEdited = (index: number): boolean => {
    if (!ocrOriginalData[index]) return false;
    return (
      ocrData[index].fullName !== ocrOriginalData[index].fullName ||
      ocrData[index].phone !== ocrOriginalData[index].phone ||
      ocrData[index].email !== ocrOriginalData[index].email ||
      ocrData[index].company !== ocrOriginalData[index].company
    );
  };

  const getEditedCount = (): number => {
    return ocrData.filter((_, idx) => isRowEdited(idx)).length;
  };

  const validateBeforeSave = (): boolean => {
    const errors: Record<number, string[]> = {};
    
    ocrData.forEach((row, idx) => {
      const rowErrors: string[] = [];
      if (!row.fullName.trim()) rowErrors.push('fullName');
      if (!row.phone.trim()) rowErrors.push('phone');
      if (rowErrors.length > 0) errors[idx] = rowErrors;
    });
    
    setOcrValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast(t('fixValidationErrors') || 'Please fix validation errors before saving', 'error');
      return false;
    }
    
    return true;
  };

  const processOcrReview = async () => {
    if (!validateBeforeSave()) return;
    
    setLoadingSave(true);
    
    try {
      // Transform OCR data to API format
      const contactsToCreate = ocrData.map(row => ({
        fullName: row.fullName,
        phone: row.phone,
        email: row.email || '',
        company: row.company || '',
        jobTitle: '',
        source: Source.OcrList,
        consent: ConsentStatus.Unknown,
      }));
      
      // Call batch API
      const result = await contactService.createBatch(contactsToCreate);
      setBatchResult(result);
      
      const { created, duplicates, errors } = result;
      
      // Notify parent about successfully created contacts
      created.forEach(c => {
        if (onContactCreated) onContactCreated(c);
      });
      
      // Case 1: Has duplicates - show resolution UI (FR25)
      if (duplicates.length > 0) {
        // Convert API duplicates to Conflict format for the existing UI
        const apiConflicts: Conflict[] = duplicates
          .filter(d => d.existing) // Only include duplicates with existing contact data
          .map((d, idx) => ({
            newContact: {
              fullName: d.input.fullName,
              phone: d.input.phone,
              email: d.input.email || '',
              company: d.input.company || '',
              jobTitle: d.input.jobTitle || '',
              source: Source.OcrList,
              consent: ConsentStatus.Unknown,
            },
            existingContact: d.existing as Contact,
            index: idx,
          }));
        
        if (apiConflicts.length > 0) {
          setConflicts(apiConflicts);
          setOcrStep('duplicates');
          return;
        }
      }
      
      // Case 2: No duplicates or all duplicates without existing data - show results (FR22)
      setOcrStep('results');
      
    } catch (error: any) {
      showToast(error.message || t('saveFailed') || 'Failed to save contacts', 'error');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleImportFileChange = async (file: File) => {
    setImportError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['csv', 'xlsx'].includes(extension || '')) {
      setImportStatus('error');
      setImportError(t('err_invalid_import_type'));
      return;
    }

    // File size validation (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setImportStatus('error');
      setImportError(t('err_file_too_large') || 'File too large. Maximum 10MB.');
      return;
    }

    setImportStatus('processing');
    
    try {
      let parsedContacts: ParsedContact[];
      
      if (extension === 'csv') {
        parsedContacts = await parseCSVFile(file);
      } else {
        // XLSX parsing using xlsx library
        parsedContacts = await parseXLSXFile(file);
      }
      
      if (parsedContacts.length === 0) {
        throw new Error(t('err_empty_import') || 'File contains no contacts.');
      }
      
      // Transform parsed contacts to OcrResultRow format for reusing review UI
      const ocrFormatData: OcrResultRow[] = parsedContacts.map(c => ({
        fullName: c.fullName,
        phone: c.phone,
        email: c.email || '',
        company: c.company || '',
      }));
      
      // Store original data for edit tracking
      setOcrData(ocrFormatData);
      setOcrOriginalData(JSON.parse(JSON.stringify(ocrFormatData)));
      setOcrValidationErrors({});
      setOcrImagePreview(null); // No image for file imports
      setOcrStep('review');
      setActiveTab('ocr'); // Switch to OCR tab for review UI
      setImportStatus('success');
      showToast(`${parsedContacts.length} ${t('contactsLoaded') || 'contacts loaded from file'}`, 'success');
      
    } catch (error: any) {
      setImportStatus('error');
      setImportError(error.message || t('err_parse_failed') || 'Failed to parse file.');
      showToast(error.message || t('err_parse_failed'), 'error');
    }
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
                {ocrStep === 'results' ? t('importSummary') || 'Import Summary' : 
                 ocrStep === 'duplicates' ? t('duplicatesDetected') : 
                 ocrStep === 'review' ? t('verify_data') : t('ocrWizardTitle')}
              </h3>
              <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-gray-800 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {ocrStep !== 'duplicates' && ocrStep !== 'review' && ocrStep !== 'results' && (
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
            {ocrStep === 'results' ? (
              // Import Results Summary (FR22)
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                    {t('importComplete') || 'Import Complete'}
                  </h2>
                  <p className="text-gray-500 font-medium">
                    {t('importSummaryDesc') || 'Here is a summary of your import operation.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Created */}
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 rounded-3xl p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-4xl font-black text-green-600 mb-1">{batchResult?.created.length || 0}</p>
                    <p className="text-xs font-black text-green-600/70 uppercase tracking-widest">{t('contactsCreated') || 'Created'}</p>
                  </div>

                  {/* Duplicates Handled */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-3xl p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <p className="text-4xl font-black text-amber-600 mb-1">
                      {(batchResult?.duplicates.length || 0) + duplicatesResolved}
                    </p>
                    <p className="text-xs font-black text-amber-600/70 uppercase tracking-widest">{t('duplicatesHandled') || 'Duplicates'}</p>
                  </div>

                  {/* Errors */}
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-3xl p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-4xl font-black text-red-500 mb-1">{batchResult?.errors.length || 0}</p>
                    <p className="text-xs font-black text-red-500/70 uppercase tracking-widest">{t('errors') || 'Errors'}</p>
                  </div>
                </div>

                {/* Error Details (if any) */}
                {batchResult?.errors && batchResult.errors.length > 0 && (
                  <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-6">
                    <h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4">{t('errorDetails') || 'Error Details'}</h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar">
                      {batchResult.errors.map((err, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center text-red-500 text-xs font-bold">{idx + 1}</span>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{err.input.fullName || 'Unknown'}</p>
                            <p className="text-red-500 text-xs">{err.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-6 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={handleClose}
                    className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-black text-sm shadow-2xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all"
                  >
                    {t('done') || 'Done'}
                  </button>
                </div>
              </div>
            ) : ocrStep === 'duplicates' ? (
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
                  <button 
                    onClick={handleManualSave} 
                    disabled={loadingCreate}
                    className="w-full sm:w-auto bg-primary-600 text-white px-10 py-3.5 rounded-2xl font-black text-sm hover:bg-primary-700 active:scale-95 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingCreate ? (
                      <>
                        <SpinnerIcon className="w-4 h-4 animate-spin" />
                        {t('saving') || 'Saving...'}
                      </>
                    ) : (
                      t('submit')
                    )}
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
                            <p className="text-xs font-medium text-gray-500">
                              {ocrData.length} {t('contactsToSave') || 'contacts to save'}
                              {getEditedCount() > 0 && (
                                <span className="ml-2 text-amber-500">
                                  ({getEditedCount()} {t('edited') || 'edited'})
                                </span>
                              )}
                            </p>
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
                                  <th className="px-2 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-12"></th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dark:bg-gray-950 divide-y divide-gray-50 dark:divide-gray-800">
                                {ocrData.map((row, idx) => (
                                  <tr key={idx} className={`group hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors ${isRowEdited(idx) ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                                    {(Object.keys(row) as Array<keyof OcrResultRow>).map(field => (
                                      <td key={field} className="px-4 py-3">
                                        <input 
                                          type="text" 
                                          value={row[field]} 
                                          onChange={(e) => handleOcrDataChange(idx, field, e.target.value)}
                                          className={`w-full text-sm font-bold p-1.5 rounded-xl transition-all dark:text-white ${
                                            ocrValidationErrors[idx]?.includes(field)
                                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-500 ring-2 ring-red-500/20'
                                              : isFieldEdited(idx, field)
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700'
                                                : 'bg-transparent border border-transparent focus:ring-4 focus:ring-primary-500/10 group-hover:bg-white dark:group-hover:bg-gray-800'
                                          }`}
                                        />
                                        {ocrValidationErrors[idx]?.includes(field) && (
                                          <p className="mt-1 text-[9px] text-red-500 font-bold uppercase">
                                            {field === 'fullName' ? (t('nameRequired') || 'Required') : (t('phoneRequired') || 'Required')}
                                          </p>
                                        )}
                                      </td>
                                    ))}
                                    <td className="px-2 py-3 text-center">
                                      <button 
                                        onClick={() => handleDeleteRow(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title={t('removeContact') || 'Remove contact'}
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-gray-800">
                      <button onClick={() => setOcrStep('upload')} disabled={loadingSave} className="px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all disabled:opacity-50">{t('cancel')}</button>
                      <button 
                        onClick={processOcrReview} 
                        disabled={loadingSave || ocrData.length === 0}
                        className="bg-primary-600 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-2xl shadow-primary-500/30 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingSave ? (
                          <>
                            <SpinnerIcon className="w-4 h-4 animate-spin" />
                            {t('saving') || 'Saving...'}
                          </>
                        ) : (
                          t('saveContacts')
                        )}
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
                      <button 
                        onClick={downloadCSVTemplate}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        CSV
                      </button>
                      <button 
                        onClick={downloadXLSXTemplate}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs font-black uppercase tracking-widest shadow-sm"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        XLSX
                      </button>
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
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Header Description */}
                    <div className="p-6 bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100/50 dark:border-primary-900/20 rounded-2xl">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                                <CodeIcon className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t('apiIntegration') || 'API Integration'}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('webFormDesc')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* API Keys Section */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <KeyIcon className="w-5 h-5 text-primary-600" />
                                    <h5 className="text-sm font-bold text-gray-900 dark:text-white">{t('apiKeys') || 'API Keys'}</h5>
                                </div>
                                <span className="text-xs text-gray-400 font-medium">{webformApiKeys.length}/5</span>
                            </div>

                            {webformKeysLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <SpinnerIcon className="w-6 h-6 text-primary-600 animate-spin" />
                                </div>
                            ) : webformApiKeys.length === 0 ? (
                                <div className="text-center py-6">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl mx-auto mb-3 flex items-center justify-center">
                                        <KeyIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-4">{t('noApiKeys') || 'No API keys yet'}</p>
                                    <button
                                        onClick={() => { handleClose(); if (onGoToApi) onGoToApi(); }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        {t('generateFirstKey') || 'Generate Key'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {webformApiKeys.slice(0, 3).map((key) => (
                                        <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0 bg-green-500" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{key.name}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{key.maskedKey}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(key.maskedKey);
                                                        setCopiedKeyId(key.id);
                                                        showToast(t('copied') || 'Copied!', 'success');
                                                        setTimeout(() => setCopiedKeyId(null), 2000);
                                                    } catch {
                                                        showToast(t('copyFailed') || 'Copy failed', 'error');
                                                    }
                                                }}
                                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                            >
                                                {copiedKeyId === key.id ? (
                                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <CopyIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                    {webformApiKeys.length > 3 && (
                                        <p className="text-xs text-gray-400 text-center pt-1">+{webformApiKeys.length - 3} {t('more') || 'more'}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Endpoint Info */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpenIcon className="w-5 h-5 text-primary-600" />
                                <h5 className="text-sm font-bold text-gray-900 dark:text-white">{t('quickStart') || 'Quick Start'}</h5>
                            </div>

                            <div className="space-y-4">
                                {/* Endpoint */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">POST</span>
                                        <span className="text-xs text-gray-500">{t('submitContact') || 'Submit Contact'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <code className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">{getPublicEndpointDisplay()}</code>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await navigator.clipboard.writeText(getPublicEndpointDisplay());
                                                    setCopiedEndpoint(true);
                                                    showToast(t('copied') || 'Copied!', 'success');
                                                    setTimeout(() => setCopiedEndpoint(false), 2000);
                                                } catch {
                                                    showToast(t('copyFailed') || 'Copy failed', 'error');
                                                }
                                            }}
                                            className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all shrink-0"
                                            title={t('copyEndpoint') || 'Copy endpoint'}
                                        >
                                            {copiedEndpoint ? (
                                                <CheckIcon className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <CopyIcon className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Header */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">{t('authentication') || 'Authentication'}</p>
                                    <div className="bg-gray-900 dark:bg-gray-950 p-3 rounded-xl">
                                        <code className="text-xs text-gray-300 font-mono">
                                            <span className="text-gray-500">X-API-Key:</span>{' '}
                                            <span className="text-primary-400">cc_live_your_key</span>
                                        </code>
                                    </div>
                                </div>

                                {/* Required Fields */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">{t('requiredFields') || 'Required Fields'}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-medium rounded">fullName*</span>
                                        <span className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 text-xs font-medium rounded">phone*</span>
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">email</span>
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">company</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer with CTA */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-gray-500">
                            {t('fullDocsHint') || 'View full documentation, manage keys, and see code examples.'}
                        </p>
                        <button
                            onClick={() => { handleClose(); if (onGoToApi) onGoToApi(); }}
                            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold text-sm hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-500/20"
                        >
                            <BookOpenIcon className="w-4 h-4" />
                            {t('goToApiPage') || 'Go to API Settings'}
                        </button>
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
