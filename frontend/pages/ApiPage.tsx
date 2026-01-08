// frontend/pages/ApiPage.tsx
// Story 7.3: API Key List and View
// Story 7.4: Copy API Key to Clipboard
// Story 7.5: Regenerate API Key
// Story 7.6: Revoke API Key
// Story 7.8: API Documentation Page

import React, { useState, useEffect } from 'react';
import { CodeIcon, CopyIcon, ActivityIcon, SettingsIcon, KeyIcon, PlusIcon, BookOpenIcon, CheckIcon } from '../components/icons';
import { useAppUI } from '../App';
import ApiKeyCard from '../components/ApiKeyCard';
import { apiKeyService, type ApiKey, type ApiKeyWithPlaintext } from '../services/apiKeyService';
import { getPublicEndpointDisplay } from '../constants';

interface ApiPageProps {
  t: (key: string) => string;
}

// Store newly generated key with plaintext for one-time display
interface ApiKeyWithTemp extends ApiKey {
  plaintextKey?: string;
}

const ApiPage: React.FC<ApiPageProps> = ({ t }) => {
  const { showToast } = useAppUI();
  const [activeTab, setActiveTab] = useState<'keys' | 'docs'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKeyWithTemp[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await apiKeyService.getAll();
      setApiKeys(keys);
    } catch (err: any) {
      showToast(err.message || t('loadFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      setCreating(true);
      const newKey = await apiKeyService.create(newKeyName || 'Default');
      
      // Add new key with plaintext to list (plaintext shown once)
      setApiKeys(prev => [{
        ...newKey,
        plaintextKey: newKey.key,
      }, ...prev]);
      
      setShowCreateModal(false);
      setNewKeyName('');
      showToast(t('apiKeyCreated'), 'success');
    } catch (err: any) {
      if (err.errors?.limit) {
        showToast(err.errors.limit[0], 'error');
      } else {
        showToast(err.message || t('createFailed'), 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const newKey = await apiKeyService.regenerate(id);
      
      // Regenerate returns a NEW key with a DIFFERENT ID
      // Remove old key (by old id) and add new key at same position
      setApiKeys(prev => {
        const index = prev.findIndex(k => k.id === id);
        if (index === -1) return prev;
        
        const updated = [...prev];
        // Remove old key and insert new key at same position
        updated.splice(index, 1, { ...newKey, plaintextKey: newKey.key });
        return updated;
      });
      
      showToast(t('apiKeyRegenerated'), 'success');
    } catch (err: any) {
      showToast(err.message || t('regenerateFailed'), 'error');
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiKeyService.revoke(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showToast(t('apiKeyRevoked'), 'success');
    } catch (err: any) {
      showToast(err.message || t('revokeFailed'), 'error');
    }
  };

  const handleCopyCode = async (code: string, label: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`${label} ${t('copied')}`, 'success');
    } catch (err) {
      showToast(t('copyFailed'), 'error');
    }
  };

  // Code examples
  const jsExample = `const API_URL = 'https://your-domain.com/api/public/contacts';
const API_KEY = 'cc_live_your_api_key_here';

async function submitContact(contactData) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      fullName: contactData.name,
      phone: contactData.phone,
      email: contactData.email,
      company: contactData.company,
    }),
  });

  if (response.status === 201) {
    const result = await response.json();
    console.log('Contact created:', result.data);
    return result.data;
  } else if (response.status === 409) {
    console.log('Duplicate contact detected');
  } else {
    throw new Error('Failed to submit contact');
  }
}`;

  const htmlExample = `<form id="contact-form">
  <input name="name" placeholder="Full Name" required />
  <input name="phone" placeholder="Phone" required />
  <input name="email" placeholder="Email" type="email" />
  <input name="company" placeholder="Company" />
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById('contact-form').onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  
  await fetch('https://your-domain.com/api/public/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'cc_live_your_api_key_here',
    },
    body: JSON.stringify({
      fullName: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      company: form.company.value,
    }),
  });
  
  alert('Contact submitted!');
  form.reset();
};
</script>`;

  const curlExample = `curl -X POST https://your-domain.com/api/public/contacts \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: cc_live_your_api_key_here" \\
  -d '{
    "fullName": "John Doe",
    "phone": "+6281234567890",
    "email": "john@example.com",
    "company": "PT Example"
  }'`;

  const CodeBlock = ({ code, language, label }: { code: string; language: string; label: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      await handleCopyCode(code, label);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="relative">
        <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-950 px-4 py-2 rounded-t-lg">
          <span className="text-xs font-medium text-gray-400">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
        <pre className="bg-gray-900 dark:bg-gray-950 p-4 rounded-b-lg overflow-x-auto">
          <code className="text-sm text-gray-300 font-mono whitespace-pre">{code}</code>
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl animate-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('apiIntegration')}</h2>
        <p className="text-sm text-gray-500">{t('webFormDesc')}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'keys'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <KeyIcon className="w-4 h-4" />
          {t('apiKeys')}
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'docs'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BookOpenIcon className="w-4 h-4" />
          {t('apiDocumentation')}
        </button>
      </div>

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-6">
          {/* Generate Key Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('apiKeysDesc')} ({apiKeys.length}/5)
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={apiKeys.length >= 5}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              {t('generateNewKey')}
            </button>
          </div>

          {/* API Keys List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
              <KeyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('noApiKeys')}</h3>
              <p className="text-sm text-gray-500 mb-4">{t('noApiKeysDesc')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                {t('generateFirstKey')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {apiKeys.map((key) => (
                <ApiKeyCard
                  key={key.id}
                  apiKey={key}
                  plaintextKey={key.plaintextKey}
                  onRegenerate={handleRegenerate}
                  onRevoke={handleRevoke}
                  t={t}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documentation Tab */}
      {activeTab === 'docs' && (
        <div className="space-y-8">
          {/* Authentication */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('authentication')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('authenticationDesc')}
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg font-mono text-sm">
              <span className="text-gray-500">X-API-Key:</span>{' '}
              <span className="text-primary-600 dark:text-primary-400">cc_live_your_api_key_here</span>
            </div>
          </div>

          {/* Endpoint */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('submitContact')}</h3>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded">POST</span>
                <span className="text-sm text-gray-500">{t('webFormEndpoint')}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                <code className="text-sm text-primary-600 dark:text-primary-400 font-mono flex-1 break-all">{getPublicEndpointDisplay()}</code>
                <button
                  onClick={() => handleCopyCode(getPublicEndpointDisplay(), 'Endpoint')}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-white dark:hover:bg-gray-700 rounded transition-all shrink-0"
                >
                  <CopyIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-3">{t('requestBody')}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">{t('field')}</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">{t('type')}</th>
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">{t('required')}</th>
                    <th className="text-left py-2 font-medium text-gray-500">{t('description')}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-mono text-primary-600">fullName</td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4"><span className="text-red-500">*</span></td>
                    <td className="py-2">{t('fieldFullName')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-mono text-primary-600">phone</td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4"><span className="text-red-500">*</span></td>
                    <td className="py-2">{t('fieldPhone')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-mono text-primary-600">email</td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">-</td>
                    <td className="py-2">{t('fieldEmail')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-mono text-primary-600">company</td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">-</td>
                    <td className="py-2">{t('fieldCompany')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-primary-600">jobTitle</td>
                    <td className="py-2 pr-4">string</td>
                    <td className="py-2 pr-4">-</td>
                    <td className="py-2">{t('fieldJobTitle')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Response Codes */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('responseCodes')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 pr-4 font-medium text-gray-500">{t('code')}</th>
                    <th className="text-left py-2 font-medium text-gray-500">{t('meaning')}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800 dark:text-gray-200">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">201</span></td>
                    <td className="py-2">{t('code201')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-bold">401</span></td>
                    <td className="py-2">{t('code401')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-bold">409</span></td>
                    <td className="py-2">{t('code409')}</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-bold">422</span></td>
                    <td className="py-2">{t('code422')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-bold">429</span></td>
                    <td className="py-2">{t('code429')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Code Examples */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('codeExamples')}</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">JavaScript (fetch)</h4>
                <CodeBlock code={jsExample} language="javascript" label="JavaScript" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">HTML Form</h4>
                <CodeBlock code={htmlExample} language="html" label="HTML" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">cURL</h4>
                <CodeBlock code={curlExample} language="bash" label="cURL" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t('generateNewKey')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('keyName')}
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t('keyNamePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewKeyName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCreateKey}
                disabled={creating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {creating ? t('generating') : t('generate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiPage;
