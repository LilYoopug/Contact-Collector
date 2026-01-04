
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types';
import { DownloadIcon, SpinnerIcon, SortAscIcon, SortDescIcon, SortDefaultIcon } from '../components/icons';
import { useAppUI } from '../App';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface UserManagementProps {
  users: User[];
  t: (key: string) => string;
  onUpdateUsers: (updater: (prev: User[]) => User[]) => void;
}

type SortKey = keyof User | 'totalContacts';

const UserManagement: React.FC<UserManagementProps> = ({ users, t, onUpdateUsers }) => {
  const { showToast, setGlobalLoading } = useAppUI();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' | null }>({
    key: 'joinedAt',
    direction: 'desc'
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(u => 
      u.fullName.toLowerCase().includes(search.toLowerCase()) || 
      u.email.toLowerCase().includes(search.toLowerCase())
    );

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

        if (typeof aValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return result;
  }, [users, search, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortConfig]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      setGlobalLoading(true);
      setTimeout(() => {
        onUpdateUsers(prev => prev.filter(u => u.id !== id));
        showToast("User deleted successfully", "success");
        setGlobalLoading(false);
      }, 800);
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleExportXLSX = () => {
    setIsExporting('xlsx');
    setGlobalLoading(true);
    setIsExportMenuOpen(false);
    
    setTimeout(() => {
      const data = filteredUsers.map(u => ({
        [t('fullName')]: u.fullName,
        [t('emailLabel')]: u.email,
        [t('role')]: t(`role_${u.role}`),
        'Total Contacts': u.totalContacts || 0,
        [t('joinedAt')]: new Date(u.joinedAt).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `users_report_${Date.now()}.xlsx`);
      setIsExporting(null);
      setGlobalLoading(false);
      showToast("Excel export complete", "success");
    }, 1200);
  };

  const handleExportPDF = () => {
    setIsExporting('pdf');
    setGlobalLoading(true);
    setIsExportMenuOpen(false);

    setTimeout(() => {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('User Management Report', 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      const tableData = filteredUsers.map(u => [
        u.fullName,
        u.email,
        t(`role_${u.role}`),
        u.totalContacts || 0,
        new Date(u.joinedAt).toLocaleDateString()
      ]);

      (doc as any).autoTable({
        startY: 40,
        head: [[t('fullName'), t('emailLabel'), t('role'), 'Contacts', t('joinedAt')]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
        styles: { fontSize: 9 },
      });

      doc.save(`users_report_${Date.now()}.pdf`);
      setIsExporting(null);
      setGlobalLoading(false);
      showToast("PDF export complete", "success");
    }, 1200);
  };

  const startRange = filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, filteredUsers.length);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (end < totalPages - 1) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key || sortConfig.direction === null) {
      return <SortDefaultIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <SortAscIcon className="w-3.5 h-3.5 text-primary-500" />
      : <SortDescIcon className="w-3.5 h-3.5 text-primary-500" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{t('userManagement')}</h2>
        <p className="text-sm text-gray-500 font-medium">{t('admin_dashboard')}</p>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all dark:text-white shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none" ref={exportMenuRef}>
            <button 
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3 px-4 sm:px-6 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm shadow-sm active:scale-95"
            >
              {isExporting ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <DownloadIcon className="w-4 h-4" />}
              {t('export')}
            </button>
            
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50 animate-in zoom-in-95 duration-150">
                <button 
                  onClick={handleExportXLSX}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                    </svg>
                  </div>
                  Export as XLSX
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v3z" />
                    </svg>
                  </div>
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none whitespace-nowrap bg-primary-600 hover:bg-primary-700 text-white font-black py-3 px-6 sm:px-8 rounded-2xl shadow-xl shadow-primary-600/20 active:scale-95 transition-all text-sm"
          >
            Add New User
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filteredUsers.length === 0 ? (
            <div className="py-20 text-center">
                <p className="text-gray-500 font-medium">No users found.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead className="bg-gray-50/50 dark:bg-gray-800/50">
                <tr>
                  <th 
                    onClick={() => handleSort('fullName')}
                    className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('fullName')}
                        {renderSortIcon('fullName')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('email')}
                    className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('emailLabel')}
                        {renderSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('role')}
                    className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('role')}
                        {renderSortIcon('role')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('totalContacts')}
                    className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        Contacts
                        {renderSortIcon('totalContacts')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('joinedAt')}
                    className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                        {t('joinedAt')}
                        {renderSortIcon('joinedAt')}
                    </div>
                  </th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {paginatedUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center font-black text-gray-500 text-base shadow-inner overflow-hidden border border-gray-100 dark:border-gray-700">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            user.fullName.charAt(0)
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{user.email}</td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${user.role === UserRole.ADMIN ? 'bg-primary-100 text-primary-600 border-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:border-primary-800/50' : 'bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'}`}>
                        {t(`role_${user.role}`)}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-gray-900 dark:text-white">{user.totalContacts || 0}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest">collected</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">{new Date(user.joinedAt).toLocaleDateString()}</td>
                    <td className="px-8 py-5 whitespace-nowrap text-right space-x-4">
                      <button 
                        onClick={() => handleOpenEdit(user)}
                        className="text-primary-600 font-black text-xs hover:text-primary-700 transition-colors"
                      >
                        {t('edit')}
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 font-black text-xs hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between py-6 px-4 sm:px-0 gap-6">
          <div className="order-2 md:order-1">
            <p className="text-sm font-medium text-gray-500">
              {t('showing')} <span className="font-black text-gray-900 dark:text-white">{startRange}</span> {t('to')} <span className="font-black text-gray-900 dark:text-white">{endRange}</span> {t('of')}{' '}
              <span className="font-black text-gray-900 dark:text-white">{filteredUsers.length}</span> {t('results')}
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
                {getPageNumbers().map((page, index) => (
                  <button
                    key={`page-${index}`}
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

      {isModalOpen && (
        <UserFormModal 
          user={editingUser} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(data) => {
            setGlobalLoading(true);
            setTimeout(() => {
              if (editingUser) {
                onUpdateUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...data } : u));
                showToast("User updated successfully", "success");
              } else {
                const newUser: User = {
                  id: `u-${Date.now()}`,
                  fullName: data.fullName,
                  email: data.email,
                  phone: data.phone,
                  role: data.role,
                  password: data.password,
                  joinedAt: new Date(),
                  totalContacts: 0
                };
                onUpdateUsers(prev => [...prev, newUser]);
                showToast("New user created successfully", "success");
              }
              setIsModalOpen(false);
              setGlobalLoading(false);
            }, 800);
          }}
        />
      )}
    </div>
  );
};

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSave }) => {
  const { showToast } = useAppUI();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || UserRole.USER,
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = "Name required";
    if (!formData.email.trim()) e.email = "Email required";
    if (!user && !formData.password) e.password = "Password required";
    if (!user && formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords mismatch";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
        showToast("Please fix the validation errors", "error");
        return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{user ? 'Edit User' : 'Add New User'}</h3>
            <p className="text-sm font-medium text-gray-500 mt-1">Configure account access and profile details.</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={e => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (errors.fullName) setErrors({...errors, fullName: ''});
                  }}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${errors.fullName ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${errors.email ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                  placeholder="+62..."
                />
              </div>

              {!user && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={e => {
                        setFormData({ ...formData, password: e.target.value });
                        if (errors.password) setErrors({...errors, password: ''});
                      }}
                      className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${errors.password ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confirm Password</label>
                    <input 
                      type="password" 
                      value={formData.confirmPassword}
                      onChange={e => {
                        setFormData({ ...formData, confirmPassword: e.target.value });
                        if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''});
                      }}
                      className={`w-full bg-gray-50 dark:bg-gray-900 border rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition-all dark:text-white ${errors.confirmPassword ? 'border-red-500 ring-4 ring-red-500/10' : 'border-gray-100 dark:border-gray-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'}`}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Assign Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 dark:text-white"
                >
                  <option value={UserRole.USER}>Standard User (Contacts & API Access)</option>
                  <option value={UserRole.ADMIN}>Administrator (Full Management Access)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-8 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-4 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-4 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-500/20 active:scale-95 transition-all"
            >
              {user ? 'Update Profile' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
