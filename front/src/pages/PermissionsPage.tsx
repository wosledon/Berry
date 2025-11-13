import { useMutation } from '@tanstack/react-query';
import { listPermissions, upsertPermission, syncPermissions, Permission, softDeletePermission } from '../services/permissions';
import { useMemo, useState } from 'react';
import { Input, Tag, Button, Modal, Form, message, Popconfirm } from 'antd';
import { PagedTable, PagedResult } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';

export function PermissionsPage() {
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form] = Form.useForm<{ name: string; description?: string }>();
  const { t } = useTranslation();

  const columns: ColumnsType<Permission> = useMemo(() => ([
    { title: t('Name'), dataIndex: 'name' },
    { title: t('Description'), dataIndex: 'description' },
    { title: t('Created At'), dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('Deleted'), dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
    {
      title: t('Actions'),
      width: 170,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => onEdit(record)}>{t('Edit')}</Button>
          {record.isDeleted ? (
            <Button size="small" onClick={() => onRestore(record)}>{t('Restore')}</Button>
          ) : (
            <Popconfirm title={t('Delete this permission?')} onConfirm={() => onSoftDelete(record)}>
              <Button size="small" danger>{t('Delete')}</Button>
            </Popconfirm>
          )}
        </div>
      )
    }
  ]), [t]);

  const upsertMut = useMutation({
    mutationFn: (vars: { name: string; payload: Permission }) => upsertPermission(vars.name, vars.payload),
    onSuccess: () => { message.success(t('Saved')); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const syncMut = useMutation({
    mutationFn: () => syncPermissions(),
    onSuccess: () => { message.success(t('Synced')); setReloadTick(t => t + 1); }
  });
  const delMut = useMutation({
    mutationFn: (name: string) => softDeletePermission(name),
    onSuccess: () => { message.success(t('Deleted')); setReloadTick(t => t + 1); }
  });

  function onNew() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function onEdit(p: Permission) {
    setEditing(p);
    form.setFieldsValue({ name: p.name ?? '', description: p.description ?? '' });
    setModalOpen(true);
  }
  function onSoftDelete(p: Permission) {
    if (!p.name) return;
    delMut.mutate(p.name);
  }
  function onRestore(p: Permission) {
    if (!p.name) return;
    upsertMut.mutate({ name: p.name, payload: { ...p, isDeleted: false } as Permission });
  }
  async function onDeleteSelected() {
    for (const name of selectedIds) delMut.mutate(name);
    setSelectedIds([]);
  }
  function onSubmit() {
    form.validateFields().then(values => {
      const payload: Permission = { name: values.name, description: values.description } as Permission;
      upsertMut.mutate({ name: values.name, payload });
    });
  }

  return (
    <div>
      <PagedTable<Permission>
        columns={columns}
        fetch={({ page, size, filters }) => listPermissions({ page, size, search: filters.search }) as Promise<PagedResult<Permission>>}
        initialFilters={{ search }}
        dependencies={[reloadTick]}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
        toolbar={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={onNew}>New Permission</Button>
            <Button onClick={() => syncMut.mutate()} loading={syncMut.isPending}>Sync</Button>
            <Input.Search allowClear placeholder={t('Search permission name/description')} style={{ width: 320 }} onSearch={v => setSearch(v)} />
            {selectedIds.length > 0 && (
              <Popconfirm title={`Delete ${selectedIds.length} permissions?`} onConfirm={onDeleteSelected}>
                <Button danger>{t('Delete Selected')}</Button>
              </Popconfirm>
            )}
          </div>
        )}
      />

      <Modal
        title={editing ? 'Edit Permission' : 'New Permission'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        confirmLoading={upsertMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label={t('Name')} name="name" rules={[{ required: true, message: t('Required') }]}>
            <Input placeholder="permission name" disabled={!!editing?.name} />
          </Form.Item>
          <Form.Item label={t('Description')} name="description">
            <Input placeholder="description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
