import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('public');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const onSubmit = async () => {
    setError('');
    const ok = await login(username, password, tenantId || undefined);
    if (ok) nav('/'); else setError('登录失败');
  };

  return (
    <div className="max-w-sm mx-auto mt-20 ui-card">
      <h1 className="text-xl font-semibold mb-4">登录</h1>
      <label className="block text-sm font-medium mb-1">用户名</label>
      <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border px-3 py-2 rounded mb-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
      <label className="block text-sm font-medium mb-1">密码</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border px-3 py-2 rounded mb-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
  <label className="block text-sm font-medium mb-1">租户</label>
      <input value={tenantId} onChange={e => setTenantId(e.target.value)} className="w-full border px-3 py-2 rounded mb-4 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <button onClick={onSubmit} className="w-full ui-btn-primary">登录</button>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">提示：默认种子账号 admin / ChangeMe123!，租户 public。</p>
    </div>
  );
}
