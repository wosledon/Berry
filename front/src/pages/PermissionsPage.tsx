import { useMutation } from '@tanstack/react-query';
import { listPermissions, upsertPermission, syncPermissions, Permission, softDeletePermission } from '../services/permissions';
import { useMemo, useState } from 'react';
import { Input, Tag, Button, Modal, Form, message, Popconfirm } from 'antd';
import { PagedTable, PagedResult } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';

export function PermissionsPage() {
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form] = Form.useForm<{ name: string; description?: string }>();

  const columns: ColumnsType<Permission> = useMemo(() => ([
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Created At', dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
    {
      title: 'Actions',
      width: 170,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
          {record.isDeleted ? (
            <Button size="small" onClick={() => onRestore(record)}>Restore</Button>
          ) : (
            <Popconfirm title="Delete this permission?" onConfirm={() => onSoftDelete(record)}>
              <Button size="small" danger>Delete</Button>
            </Popconfirm>
          )}
        </div>
      )
    }
  ]), []);

  const upsertMut = useMutation({
    mutationFn: (vars: { name: string; payload: Permission }) => upsertPermission(vars.name, vars.payload),
    onSuccess: () => { message.success('Saved'); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const syncMut = useMutation({
    mutationFn: () => syncPermissions(),
    onSuccess: () => { message.success('Synced'); setReloadTick(t => t + 1); }
  });
  const delMut = useMutation({
    mutationFn: (name: string) => softDeletePermission(name),
    onSuccess: () => { message.success('Deleted'); setReloadTick(t => t + 1); }
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
            <Input.Search allowClear placeholder="搜索权限名/描述" style={{ width: 320 }} onSearch={v => setSearch(v)} />
            {selectedIds.length > 0 && (
              <Popconfirm title={`Delete ${selectedIds.length} permissions?`} onConfirm={onDeleteSelected}>
                <Button danger>Delete Selected</Button>
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
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="permission name" disabled={!!editing?.name} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input placeholder="description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
