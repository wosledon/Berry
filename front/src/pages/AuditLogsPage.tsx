import { useMemo, useState } from 'react';
import { Input, Select, Tag, DatePicker, Button, Popconfirm } from 'antd';
import { useNotify } from '../hooks/useNotify';
import { listAuditLogs, AuditLog, retentionDelete, bulkDeleteAuditLogs, purgeAuditLogs, purgeByIdsAuditLogs } from '../services/auditLogs';
import { PagedTable } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

export function AuditLogsPage() {
  const notify = useNotify();
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState<string | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { t } = useTranslation();
  const columns: ColumnsType<AuditLog> = useMemo(() => ([
    { title: t('Time'), dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    { title: t('Method'), dataIndex: 'method' },
    { title: t('Path'), dataIndex: 'path', ellipsis: true },
    { title: t('Status'), dataIndex: 'statusCode' },
    { title: t('Elapsed'), dataIndex: 'elapsedMs', render: (v: number) => `${v} ms` },
    { title: t('Deleted'), dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
  ]), [t]);
  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <h1 className="text-xl font-semibold">{t('Audit Logs')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker.RangePicker
            allowEmpty={[true,true]}
            onChange={(vals) => {
              setFrom(vals?.[0] ? vals[0].toISOString() : undefined);
              setTo(vals?.[1] ? vals[1].toISOString() : undefined);
            }}
            showTime
          />
          <Select allowClear placeholder={t('Method')} style={{ width: 120 }} value={method} onChange={setMethod}
                  options={['GET','POST','PUT','PATCH','DELETE'].map(m => ({ value: m, label: m }))} />
          <Input allowClear placeholder={t('Status')} style={{ width: 100 }} value={status?.toString()}
                 onChange={e => setStatus(e.target.value ? parseInt(e.target.value) : undefined)} />
          <Popconfirm title={t('Delete logs before keepDays?')} description={t('Please select start time as before')} onConfirm={async () => { await retentionDelete(30); notify.success(t('Retention applied')); setReloadTick(t=>t+1); }}>
            <Button>{t('Retention 30d')}</Button>
          </Popconfirm>
          <Popconfirm title={t('Purge logs before date?')} onConfirm={async () => { if (!from) { notify.warning(t('Please select start time as before')); return; } await purgeAuditLogs(from); notify.success(t('Purged')); setReloadTick(t=>t+1); }}>
            <Button danger>{t('Purge Before From')}</Button>
          </Popconfirm>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Popconfirm title={t('Bulk delete {count} logs?', { count: selectedIds.length })} onConfirm={async () => { await bulkDeleteAuditLogs(selectedIds); notify.success(t('Bulk deleted')); setReloadTick(t=>t+1); setSelectedIds([]); }}>
                <Button danger>{t('Bulk Delete Selected')}</Button>
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
