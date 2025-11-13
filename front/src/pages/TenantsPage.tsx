import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Tag, Switch } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PagedTable, PagedResult } from '../components/PagedTable';
import { useMutation } from '@tanstack/react-query';
import { createTenant, deleteTenant, listTenants, Tenant, updateTenant } from '../services/tenants';
import { useNotify } from '../hooks/useNotify';
import { useTranslation } from 'react-i18next';

export function TenantsPage() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form] = Form.useForm<Tenant>();

  const columns: ColumnsType<Tenant> = useMemo(() => ([
    { title: t('Tenant Id'), dataIndex: 'tenantId' },
    { title: t('Name'), dataIndex: 'name' },
    { title: t('Description'), dataIndex: 'description' },
    { title: t('Created At'), dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('Disabled'), dataIndex: 'isDisabled', render: (v?: boolean) => v ? <Tag color="red">{t('Yes')}</Tag> : <Tag>{t('No')}</Tag> },
    { title: t('Deleted'), dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">{t('Yes')}</Tag> : <Tag>{t('No')}</Tag> },
    { title: t('Actions'), width: 160, render: (_, r) => (
      <div className="flex items-center gap-2">
        <Button size="small" onClick={() => onEdit(r)}>{t('Edit')}</Button>
        <Popconfirm title={t('Delete this tenant?')} onConfirm={() => onDelete(r.tenantId!)}>
          <Button size="small" danger>{t('Delete')}</Button>
        </Popconfirm>
      </div>
    )}
  ]), [t]);

  const createMut = useMutation({
    mutationFn: (payload: Tenant) => createTenant(payload),
    onSuccess: () => { notify.success(t('Created')); setReloadTick(x => x + 1); setModalOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: Tenant }) => updateTenant(vars.id, vars.payload),
    onSuccess: () => { notify.success(t('Updated')); setReloadTick(x => x + 1); setModalOpen(false); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => { notify.success(t('Deleted')); setReloadTick(x => x + 1); }
  });

  function onNew() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function onEdit(m: Tenant) {
    setEditing(m);
    form.setFieldsValue({ ...m });
    setModalOpen(true);
  }
  async function onDelete(id: string) { await deleteMut.mutateAsync(id); }
  function onSubmit() {
    form.validateFields().then(values => {
      const payload: Tenant = { ...editing, ...values } as Tenant;
      if (editing?.tenantId) updateMut.mutate({ id: editing.tenantId, payload }); else createMut.mutate(payload);
    });
  }

  return (
    <div>
      <PagedTable<Tenant>
        columns={columns}
        fetch={({ page, size, filters }) => listTenants({ page, size, search: filters.search }) as Promise<PagedResult<Tenant>>}
        initialFilters={{ search }}
        dependencies={[reloadTick]}
        rowKeyFn={(r)=> r.tenantId!}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
        toolbar={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={onNew}>{t('New Tenant')}</Button>
            <Input.Search allowClear placeholder={t('Search tenant id/name')} style={{ width: 320 }} onSearch={v => setSearch(v)} />
            {selectedIds.length > 0 && (
              <Popconfirm title={t('Delete selected items?', { count: selectedIds.length })} onConfirm={async ()=> { for(const id of selectedIds) await deleteMut.mutateAsync(id); setSelectedIds([]); }}>
                <Button danger>{t('Delete Selected')}</Button>
              </Popconfirm>
            )}
          </div>
        )}
      />

      <Modal title={editing ? t('Edit Tenant') : t('New Tenant')} open={modalOpen} onCancel={()=>setModalOpen(false)} onOk={onSubmit} confirmLoading={createMut.isPending || updateMut.isPending} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item label={t('Tenant Id')} name="tenantId" rules={[{ required: true, message: t('Required') }]}> 
            <Input placeholder={t('tenant id')} disabled={!!editing?.tenantId} />
          </Form.Item>
          <Form.Item label={t('Name')} name="name" rules={[{ required: true, message: t('Required') }]}>
            <Input placeholder={t('tenant name')} />
          </Form.Item>
          <Form.Item label={t('Description')} name="description">
            <Input placeholder={t('description')} />
          </Form.Item>
          <Form.Item label={t('Disabled')} name="isDisabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
