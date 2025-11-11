import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserDetail } from '../services/users';
import { Tag } from 'antd';

export function Dashboard() {
  const { userId, tenantId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['me', userId],
    queryFn: async () => userId ? getUserDetail(userId) : null
  });

  const user = data?.user;
  const roles = data?.roles ?? [];
  const perms = data?.effectivePermissions ?? [];

  return (
    <div className="space-y-4">
      <div className="ui-card">
        <div className="ui-card-header">
          <h1 className="text-xl font-semibold">我的信息</h1>
        </div>
        {isLoading && <div className="text-sm text-gray-500">加载中...</div>}
        {!isLoading && (
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500 mr-2">用户名</span>{user?.username ?? '-'}</div>
            <div><span className="text-gray-500 mr-2">姓名</span>{user?.displayName ?? '-'}</div>
            <div><span className="text-gray-500 mr-2">租户</span>{tenantId ?? '-'}</div>
            <div className="flex items-center gap-2 flex-wrap"><span className="text-gray-500">角色</span>{roles.length ? roles.map((r: any) => <Tag key={r.id}>{r.name}</Tag>) : <span>-</span>}</div>
            <div><span className="text-gray-500 mr-2">权限数</span>{perms.length}</div>
          </div>
        )}
      </div>

      <div className="ui-card">
        <h2 className="text-lg font-semibold mb-2">Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-300">欢迎使用 Berry 管理控制台。</p>
      </div>
    </div>
  );
}
