import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPermissions, upsertPermission, syncPermissions, Permission } from '../services/permissions';
import { useMemo, useState } from 'react';
import { Input, Tag } from 'antd';
import { PagedTable } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';

export function PermissionsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', page, search],
    queryFn: () => listPermissions(page, 20, search)
  });

  const upsert = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => upsertPermission(payload.name, payload.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] })
  });

  const sync = useMutation({
    mutationFn: () => syncPermissions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] })
  });

  const columns: ColumnsType<Permission> = useMemo(() => ([
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Created At', dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
  ]), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl font-semibold">Permissions</h1>
        <button onClick={() => sync.mutate()} className="px-3 py-1 rounded border">Sync</button>
      </div>
      <PagedTable<Permission>
        columns={columns}
        fetch={({ page, size, filters }) => listPermissions(page, size, filters.search as string)}
        initialFilters={{ search }}
        renderFilters={(f, setF) => (
          <Input.Search allowClear placeholder="搜索权限名/描述" style={{ width: 320 }}
                        onSearch={v => { setPage(1); setSearch(v); setF({ ...f, search: v }); }} />
        )}
      />
      <div className="mt-6 p-4 border rounded bg-white">
        <h2 className="font-medium mb-2">Upsert Permission</h2>
        <UpsertForm onSubmit={(name, desc) => upsert.mutate({ name, description: desc })} />
      </div>
    </div>
  );
}

function UpsertForm({ onSubmit }: { onSubmit: (name: string, desc?: string) => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <div className="flex gap-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="permission name" className="border px-3 py-2 rounded w-64" />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="description" className="border px-3 py-2 rounded w-96" />
      <button onClick={() => onSubmit(name, desc)} className="px-3 py-2 rounded bg-blue-600 text-white">Save</button>
    </div>
  );
}
