// frontend/components/ApiKeyCard.tsx
// Story 7.4: Copy API Key to Clipboard
// Story 7.5: Regenerate API Key
// Story 7.6: Revoke API Key

import React, { useState } from 'react';
import { CopyIcon, KeyIcon, RefreshCwIcon, TrashIcon, CheckIcon } from './icons';
import type { ApiKey } from '../services/apiKeyService';

interface ApiKeyCardProps {
  apiKey: ApiKey;
  plaintextKey?: string;
  onRegenerate: (id: string) => void;
  onRevoke: (id: string) => void;
  t: (key: string) => string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ApiKeyCard: React.FC<ApiKeyCardProps> = ({
  apiKey,
  plaintextKey,
  onRegenerate,
  onRevoke,
  t,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const handleCopy = async () => {
    const keyToCopy = plaintextKey || apiKey.maskedKey;
    
    if (!plaintextKey) {
      showToast(t('cannotCopyMaskedKey'), 'error');
      return;
    }
    
    try {
      // Modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(keyToCopy);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = keyToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      showToast(t('apiKeyCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast(t('copyFailed'), 'error');
    }
  };

  const handleRegenerate = () => {
    setShowRegenerateConfirm(false);
    onRegenerate(apiKey.id);
  };

  const handleRevoke = () => {
    setShowRevokeConfirm(false);
    onRevoke(apiKey.id);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('never');
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
      {/* Key Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyIcon className="w-4 h-4 text-primary-600" />
          <span className="font-semibold text-gray-900 dark:text-white">{apiKey.name}</span>
        </div>
        <span className="text-xs text-gray-500">{t('created')}: {formatDate(apiKey.createdAt)}</span>
      </div>

      {/* Key Value */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={plaintextKey || apiKey.maskedKey}
          readOnly
          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 font-mono text-sm text-gray-800 dark:text-gray-200"
        />
        {plaintextKey && (
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
            title={t('copy')}
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Warning for new key */}
      {plaintextKey && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
            ⚠️ {t('apiKeyWarning')}
          </span>
        </div>
      )}

      {/* Last Used */}
      <div className="text-xs text-gray-500">
        {t('lastUsed')}: {formatDate(apiKey.lastUsedAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setShowRegenerateConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCwIcon className="w-3.5 h-3.5" />
          {t('regenerate')}
        </button>
        <button
          onClick={() => setShowRevokeConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          <TrashIcon className="w-3.5 h-3.5" />
          {t('revoke')}
        </button>
      </div>

      {/* Regenerate Confirmation Dialog */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t('regenerateConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('regenerateConfirmMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
              >
                {t('regenerate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {t('revokeConfirmTitle')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('revokeConfirmMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRevoke}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                {t('revoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyCard;
