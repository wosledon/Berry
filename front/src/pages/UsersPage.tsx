import { useQuery } from '@tanstack/react-query';
import { listUsers, User } from '../services/users';
import { useEffect, useMemo, useState } from 'react';
import { Table, Input, Select, Switch, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { listRoles, Role } from '../services/roles';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState<string | undefined>();
  const [hasPermission, setHasPermission] = useState<string | undefined>();
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', page, search, roleId, hasPermission, includeDeleted],
    queryFn: () => listUsers({
      page,
      size: 20,
      search,
    })
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', 'for-filter'],
    queryFn: async () => {
      const r = await listRoles({ page: 1, size: 100 });
      return r.items as Role[];
    }
  });

  useEffect(() => { setPage(1); refetch(); }, [search, roleId, hasPermission, includeDeleted]);

  const columns: ColumnsType<User> = useMemo(() => ([
    { title: 'Username', dataIndex: 'username' },
    { title: 'Display Name', dataIndex: 'displayName' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Created At', dataIndex: 'createdAt', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag> No</Tag> },
  ]), []);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h1 className="text-xl font-semibold">Users</h1>
        <div className="flex items-center gap-2">
          <Input.Search allowClear placeholder="搜索用户名/姓名/邮箱" onSearch={v => setSearch(v)} style={{ width: 280 }} />
          <Select
            allowClear
            placeholder="角色筛选"
            style={{ width: 200 }}
            loading={rolesQuery.isLoading}
            options={(rolesQuery.data ?? []).map(r => ({ value: r.id, label: r.name }))}
            value={roleId}
            onChange={v => setRoleId(v)}
          />
          <Input allowClear placeholder="拥有权限" value={hasPermission} onChange={e => setHasPermission(e.target.value)} style={{ width: 220 }} />
          <div className="flex items-center gap-1">
            <span>含已删除</span>
            <Switch checked={includeDeleted} onChange={setIncludeDeleted} />
          </div>
        </div>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.items ?? []}
        columns={columns}
        pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: p => setPage(p) }}
      />
    </div>
  );
}
