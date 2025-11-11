import { useQuery } from '@tanstack/react-query';
import { listUsers } from '../services/users';
import { useState } from 'react';
import { Table, Input } from 'antd';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => listUsers(page, 20, search)
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Users</h1>
        <Input.Search allowClear placeholder="搜索用户名/姓名/邮箱" onSearch={v => { setPage(1); setSearch(v); }} style={{ width: 320 }} />
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.items ?? []}
        columns={[
          { title: 'Username', dataIndex: 'username' },
          { title: 'Display Name', dataIndex: 'displayName' },
          { title: 'Email', dataIndex: 'email' },
        ]}
        pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: p => setPage(p) }}
      />
    </div>
  );
}
