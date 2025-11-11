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
    <div className="max-w-sm mx-auto mt-20 bg-white shadow p-6 rounded border">
      <h1 className="text-xl font-semibold mb-4">登录</h1>
      <label className="block text-sm font-medium mb-1">用户名</label>
      <input value={username} onChange={e => setUsername(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
      <label className="block text-sm font-medium mb-1">密码</label>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
  <label className="block text-sm font-medium mb-1">租户</label>
      <input value={tenantId} onChange={e => setTenantId(e.target.value)} className="w-full border px-3 py-2 rounded mb-4" />
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <button onClick={onSubmit} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">登录</button>
      <p className="text-xs text-gray-500 mt-3">提示：默认种子账号 admin / ChangeMe123!，租户 public。</p>
    </div>
  );
}
