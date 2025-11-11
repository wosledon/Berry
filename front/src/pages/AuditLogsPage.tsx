import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from '../services/auditLogs';
import { useState } from 'react';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audits', page],
    queryFn: () => listAuditLogs(page, 20)
  });
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit Logs</h1>
      {isLoading && <div>Loading...</div>}
      <table className="min-w-full text-sm bg-white shadow border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Time</th>
            <th className="p-2">Method</th>
            <th className="p-2">Path</th>
            <th className="p-2">Status</th>
            <th className="p-2">Elapsed</th>
          </tr>
        </thead>
        <tbody>
          {data?.items.map(a => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{new Date(a.createdAt).toLocaleString()}</td>
              <td className="p-2">{a.method}</td>
              <td className="p-2">{a.path}</td>
              <td className="p-2">{a.statusCode}</td>
              <td className="p-2">{a.elapsedMs} ms</td>
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
