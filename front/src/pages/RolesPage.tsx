import { useMemo, useState } from 'react';
import { Input, Tag, Button, Modal, Form, message, Popconfirm } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { listRoles, Role, createRole, updateRole, deleteRole } from '../services/roles';
import { PagedTable, PagedResult } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';

export function RolesPage() {
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm<{ name: string; description?: string }>();

  const columns: ColumnsType<Role> = useMemo(() => ([
    { title: 'Name', dataIndex: 'name' },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Created At', dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Deleted', dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
    {
      title: 'Actions',
      width: 160,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this role?" onConfirm={() => onDelete(record.id!)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </div>
      )
    }
  ]), []);

  const createMut = useMutation({
    mutationFn: (payload: Role) => createRole(payload),
    onSuccess: () => { message.success('Created'); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: Role }) => updateRole(vars.id, vars.payload),
    onSuccess: () => { message.success('Updated'); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => { message.success('Deleted'); setReloadTick(t => t + 1); }
  });

  function onNew() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function onEdit(r: Role) {
    setEditing(r);
    form.setFieldsValue({ name: r.name ?? '', description: r.description ?? '' });
    setModalOpen(true);
  }
  async function onDelete(id: string) {
    await deleteMut.mutateAsync(id);
  }
  async function onDeleteSelected() {
    for (const id of selectedIds) await deleteMut.mutateAsync(id);
    setSelectedIds([]);
  }
  function onSubmit() {
    form.validateFields().then(values => {
      const payload: Role = { name: values.name, description: values.description } as Role;
      if (editing?.id) updateMut.mutate({ id: editing.id!, payload }); else createMut.mutate(payload);
    });
  }

  return (
    <div>
      <PagedTable<Role>
        columns={columns}
        fetch={({ page, size, filters }) => listRoles({ page, size, search: filters.search }) as Promise<PagedResult<Role>>}
        pageSize={20}
        initialFilters={{ search }}
        dependencies={[reloadTick]}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
        toolbar={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={onNew}>New Role</Button>
            <Input.Search allowClear placeholder="搜索角色名/描述" style={{ width: 320 }} onSearch={v => setSearch(v)} />
            {selectedIds.length > 0 && (
              <Popconfirm title={`Delete ${selectedIds.length} roles?`} onConfirm={onDeleteSelected}>
                <Button danger>Delete Selected</Button>
              </Popconfirm>
            )}
          </div>
        )}
      />

      <Modal
        title={editing ? 'Edit Role' : 'New Role'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="role name" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input placeholder="description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
