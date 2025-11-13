import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, UserOutlined, MailOutlined, ApartmentOutlined } from '@ant-design/icons';
import { Select, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { listAllTenants, Tenant } from '../services/tenants';
import { register } from '../services/auth';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [tenantId, setTenantId] = useState<string>('public');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const { t } = useTranslation();

  useEffect(() => { (async()=>{ setTenants(await listAllTenants()); })(); }, []);

  const onSubmit = async () => {
    if (loading) return;
    setError('');
    if (!username || !password || !confirm || !tenantId) { setError(t('Required')); return; }
    if (password !== confirm) { setError(t('Passwords do not match')); return; }
    setLoading(true);
    try {
      await register({ username, password, tenantId, displayName, email });
      nav('/login');
    } catch {
      setError(t('Register Failed'));
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('Register')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Create your account')}</p>
      </div>
      <div className="ui-card space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1">{t('Username')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><UserOutlined /></span>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Display Name')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><UserOutlined /></span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Email')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailOutlined /></span>
            <input value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Tenant')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><ApartmentOutlined /></span>
            <div className="pl-9">
              <Select showSearch value={tenantId} onChange={setTenantId} placeholder={t('Select tenant')} options={tenants.map(x=>({ label: x.name || x.tenantId, value: x.tenantId }))} className="w-full" filterOption={(i,opt)=> (opt?.label as string).toLowerCase().includes(i.toLowerCase())} />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Password')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockOutlined /></span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Confirm Password')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockOutlined /></span>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        {error && <div className="text-red-600 text-xs mb-1">{error}</div>}
        <button onClick={onSubmit} disabled={loading} className="w-full btn-primary-dynamic h-10 rounded-lg flex items-center justify-center">
          {loading ? <Spin size="small" /> : t('Register')}
        </button>
        <div className="text-xs text-right mt-1">
          <a href="/login" className="text-blue-600 hover:underline">{t('Login')}</a>
        </div>
      </div>
    </div>
  );
}
