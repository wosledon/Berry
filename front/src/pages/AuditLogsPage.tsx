import { useMemo, useState } from 'react';
import { Input, Select, Tag } from 'antd';
import { listAuditLogs, AuditLog } from '../services/auditLogs';
import { PagedTable } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<string | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const columns: ColumnsType<AuditLog> = useMemo(() => ([
    { title: 'Time', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: 'Method', dataIndex: 'method' },
    { title: 'Path', dataIndex: 'path', ellipsis: true },
    { title: 'Status', dataIndex: 'statusCode' },
    { title: 'Elapsed', dataIndex: 'elapsedMs', render: (v: number) => `${v} ms` },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
  ]), []);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        <div className="flex items-center gap-2">
          <Select allowClear placeholder="Method" style={{ width: 120 }} value={method} onChange={setMethod}
                  options={['GET','POST','PUT','PATCH','DELETE'].map(m => ({ value: m, label: m }))} />
          <Input allowClear placeholder="Status" style={{ width: 100 }} value={status?.toString()}
                 onChange={e => setStatus(e.target.value ? parseInt(e.target.value) : undefined)} />
        </div>
      </div>
      <PagedTable<AuditLog>
        columns={columns}
        fetch={({ page, size, filters }) => listAuditLogs({
          page,
          size,
          method: filters?.method,
          status: filters?.status,
        })}
        dependencies={[method, status]}
        initialFilters={{ method, status }}
      />
    </div>
  );
}
