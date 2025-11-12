import { useMemo, useState } from 'react';
import { Input, Select, Tag, DatePicker, Button, Popconfirm } from 'antd';
import { useNotify } from '../hooks/useNotify';
import { listAuditLogs, AuditLog, retentionDelete, bulkDeleteAuditLogs, purgeAuditLogs, purgeByIdsAuditLogs } from '../services/auditLogs';
import { PagedTable } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

export function AuditLogsPage() {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<string | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker.RangePicker
            allowEmpty={[true,true]}
            onChange={(vals) => {
              setFrom(vals?.[0] ? vals[0].toISOString() : undefined);
              setTo(vals?.[1] ? vals[1].toISOString() : undefined);
            }}
            showTime
          />
          <Select allowClear placeholder="Method" style={{ width: 120 }} value={method} onChange={setMethod}
                  options={['GET','POST','PUT','PATCH','DELETE'].map(m => ({ value: m, label: m }))} />
          <Input allowClear placeholder="Status" style={{ width: 100 }} value={status?.toString()}
                 onChange={e => setStatus(e.target.value ? parseInt(e.target.value) : undefined)} />
          <Popconfirm title="Delete logs before keepDays?" description="根据保留天数清理更早的日志" onConfirm={async () => { await retentionDelete(30); notify.success('Retention applied'); setReloadTick(t=>t+1); }}>
            <Button>Retention 30d</Button>
          </Popconfirm>
          <Popconfirm title="Purge logs before date?" onConfirm={async () => { if (!from) { notify.warning('请选择起始时间作为 before'); return; } await purgeAuditLogs(from); notify.success('Purged'); setReloadTick(t=>t+1); }}>
            <Button danger>Purge Before From</Button>
          </Popconfirm>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Popconfirm title={`Bulk delete ${selectedIds.length} logs?`} onConfirm={async () => { await bulkDeleteAuditLogs(selectedIds); notify.success('Bulk deleted'); setReloadTick(t=>t+1); setSelectedIds([]); }}>
                <Button danger>Bulk Delete Selected</Button>
              </Popconfirm>
              <Popconfirm title={`Purge ${selectedIds.length} logs?`} onConfirm={async () => { await purgeByIdsAuditLogs(selectedIds); notify.success('Purged by ids'); setReloadTick(t=>t+1); setSelectedIds([]); }}>
                <Button danger type="primary">Purge Selected</Button>
              </Popconfirm>
            </div>
          )}
        </div>
      </div>
      <PagedTable<AuditLog>
        columns={columns}
        fetch={({ page, size, filters }) => listAuditLogs({
          page,
          size,
          method: filters?.method,
          status: filters?.status,
          from: filters?.from,
          to: filters?.to,
        })}
        dependencies={[method, status, from, to, reloadTick]}
        initialFilters={{ method, status, from, to }}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
      />
    </div>
  );
}
