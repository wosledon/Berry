import { useQuery } from '@tanstack/react-query';
import { listRoles } from '../services/roles';
import { useState } from 'react';

export function RolesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => listRoles(page, 20)
  });
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Roles</h1>
      {isLoading && <div>Loading...</div>}
      <table className="min-w-full text-sm bg-white shadow border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Description</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map(r => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
        <span>Page {page}</span>
        <button disabled={(data?.items.length ?? 0) < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
