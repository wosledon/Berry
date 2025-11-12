import { useMemo, useState } from 'react';
import { Input, Tag } from 'antd';
import { listRoles, Role } from '../services/roles';
import { PagedTable } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';

export function RolesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const columns: ColumnsType<Role> = useMemo(() => ([
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Created At', dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
  ]), []);
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">Roles</h1>
      </div>
      <PagedTable<Role>
        columns={columns}
        fetch={({ page, size, filters }) => listRoles({
          page,
          size,
          search: filters?.search,
        })}
        pageSize={20}
        initialFilters={{ search }}
        renderFilters={(f, setF) => (
          <Input.Search allowClear placeholder="搜索角色名/描述" style={{ width: 320 }}
                        onSearch={v => { setPage(1); setSearch(v); setF({ ...f, search: v }); }} />
        )}
      />
    </div>
  );
}
