import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUserDetail } from '../services/users';
import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

export function Dashboard() {
  const { userId, tenantId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['me', userId],
    queryFn: async () => userId ? getUserDetail(userId) : null
  });
  const { t } = useTranslation();

  const user = data?.user;
  const roles = data?.roles ?? [];
  const perms = data?.effectivePermissions ?? [];

  return (
    <div className="space-y-4">
      <div className="ui-card">
        <div className="ui-card-header">
          <h1 className="text-xl font-semibold">{t('My Information')}</h1>
        </div>
        {isLoading && <div className="text-sm text-gray-500">{t('Loading...')}</div>}
        {!isLoading && (
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-500 mr-2">{t('Username')}</span>{user?.username ?? '-'}</div>
            <div><span className="text-gray-500 mr-2">{t('Display Name')}</span>{user?.displayName ?? '-'}</div>
            <div><span className="text-gray-500 mr-2">{t('Tenant')}</span>{tenantId ?? '-'}</div>
            <div className="flex items-center gap-2 flex-wrap"><span className="text-gray-500">{t('Roles')}</span>{roles.length ? roles.map((r: any) => <Tag key={r.id}>{r.name}</Tag>) : <span>-</span>}</div>
            <div><span className="text-gray-500 mr-2">{t('Permissions Count')}</span>{perms.length}</div>
          </div>
        )}
      </div>

      <div className="ui-card">
        <h2 className="text-lg font-semibold mb-2">{t('Dashboard')}</h2>
        <p className="text-gray-600 dark:text-gray-300">{t('Welcome to Berry Admin Console.')}</p>
      </div>
    </div>
  );
}
