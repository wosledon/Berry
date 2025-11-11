import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listPermissions, upsertPermission, syncPermissions } from '../services/permissions';
import { useState } from 'react';

export function PermissionsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['permissions', page],
    queryFn: () => listPermissions(page, 20)
  });

  const upsert = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => upsertPermission(payload.name, payload.description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] })
  });

  const sync = useMutation({
    mutationFn: () => syncPermissions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] })
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Permissions</h1>
        <button onClick={() => sync.mutate()} className="px-3 py-1 rounded border">Sync</button>
      </div>
      {isLoading && <div>Loading...</div>}
      <table className="min-w-full text-sm bg-white shadow border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
        <span>Page {page}</span>
        <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
      </div>
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
