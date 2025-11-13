import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LockOutlined, UserOutlined, ApartmentOutlined } from '@ant-design/icons';
import { Select, Spin } from 'antd';
import { useEffect } from 'react';
import { listAllTenants, Tenant } from '../services/tenants';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('public');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { t } = useTranslation();
  useEffect(() => {
    (async () => { const list = await listAllTenants(); setTenants(list); })();
  }, []);

  const onSubmit = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    const ok = await login(username.trim(), password, tenantId.trim() || undefined);
    setLoading(false);
    if (ok) nav('/'); else setError(t('Login Failed') + ': ' + t('Please check username/password/tenant'));
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-700 text-white shadow-lg mb-3">
          <LockOutlined style={{ fontSize: 28 }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('Berry Admin Login')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Please enter account information to enter the system')}</p>
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
          <label className="block text-xs font-medium mb-1">{t('Password')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockOutlined /></span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-9 border px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">{t('Tenant')}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><ApartmentOutlined /></span>
            <div className="pl-9">
              <Select
                showSearch
                value={tenantId}
                onChange={setTenantId}
                placeholder={t('Select tenant')}
                options={tenants.map(x=>({ label: x.name || x.tenantId, value: x.tenantId }))}
                className="w-full"
                filterOption={(input, opt)=> (opt?.label as string).toLowerCase().includes(input.toLowerCase())}
              />
            </div>
          </div>
        </div>
        {error && <div className="text-red-600 text-xs mb-1">{error}</div>}
        <button onClick={onSubmit} disabled={loading} className="w-full btn-primary-dynamic h-10 rounded-lg flex items-center justify-center">
          {loading ? <Spin size="small" /> : t('Login')}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('Default seed account admin / ChangeMe123!, tenant public.')}</p>
        <div className="text-xs text-right mt-1">
          <a href="/register" className="text-blue-600 hover:underline">{t('Register')}</a>
        </div>
      </div>
    </div>
  );
}
