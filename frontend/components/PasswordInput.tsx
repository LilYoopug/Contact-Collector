import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

/**
 * Story 8.6: Create Reusable PasswordInput Component
 * 
 * A reusable password input component with visibility toggle.
 * Provides consistent behavior across all forms (Login, Register, UserManagement).
 */
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = '••••••••',
  error = false,
  disabled = false,
  required = false,
  name,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const baseClassName = `w-full bg-gray-50 dark:bg-gray-800 border rounded-2xl px-4 py-3.5 pr-12 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 outline-none transition-all`;
  const errorClassName = error
    ? 'border-red-500 focus:ring-red-500/20'
    : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        name={name}
        className={`${baseClassName} ${errorClassName} ${className}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg p-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={0}
      >
        {showPassword ? (
          <EyeOffIcon className="w-5 h-5" />
        ) : (
          <EyeIcon className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
