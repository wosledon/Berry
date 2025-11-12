import { useMemo, useState } from 'react';
import { Input, Tag, Button, Modal, Form, Popconfirm } from 'antd';
import { useNotify } from '../hooks/useNotify';
import { useMutation } from '@tanstack/react-query';
import { listRoles, Role, createRole, updateRole, deleteRole, getRoleDetail } from '../services/roles';
import { PagedTable, PagedResult } from '../components/PagedTable';
import type { ColumnsType } from 'antd/es/table';
import { listPermissions, Permission } from '../services/permissions';
import { bindRolePermissions, unbindRolePermissions } from '../services/roles';

export function RolesPage() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form] = Form.useForm<{ name: string; description?: string }>();
  // 分配权限弹窗状态
  const [permOpen, setPermOpen] = useState(false);
  const [permTarget, setPermTarget] = useState<Role | null>(null);
  const [permSearch, setPermSearch] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

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
          <Button size="small" onClick={() => onManagePermissions(record)}>Manage Permissions</Button>
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
    onSuccess: () => { notify.success('Created'); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: Role }) => updateRole(vars.id, vars.payload),
    onSuccess: () => { notify.success('Updated'); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => { notify.success('Deleted'); setReloadTick(t => t + 1); }
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
  function onManagePermissions(r: Role) {
    setPermTarget(r);
    setSelectedPermissionIds([]);
    setPermSearch('');
    setPermOpen(true);
    if (r.id) {
      getRoleDetail(r.id).then((detail: any) => {
        const perms = Array.isArray(detail?.permissions) ? detail.permissions : [];
        setSelectedPermissionIds(perms);
      }).catch(() => { /* ignore */ });
    }
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

  // 分配权限 - 绑定/解绑
  async function onBindPermissions() {
    if (!permTarget?.id) return;
    if (selectedPermissionIds.length === 0) { notify.warning('请选择要绑定的权限'); return; }
    await bindRolePermissions(permTarget.id!, selectedPermissionIds);
    notify.success('已绑定权限');
    setPermOpen(false);
  }
  async function onUnbindPermissions() {
    if (!permTarget?.id) return;
    if (selectedPermissionIds.length === 0) { notify.warning('请选择要解绑的权限'); return; }
    await unbindRolePermissions(permTarget.id!, selectedPermissionIds);
    notify.success('已解绑权限');
    setPermOpen(false);
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

      <Modal
        title={`Manage Permissions${permTarget?.name ? ` - ${permTarget.name}` : ''}`}
        open={permOpen}
        onCancel={() => setPermOpen(false)}
        footer={(
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={onUnbindPermissions} danger disabled={!permTarget?.id}>Unbind Selected</Button>
              <Button type="primary" onClick={onBindPermissions} disabled={!permTarget?.id}>Bind Selected</Button>
            </div>
            <div className="opacity-70">已选 {selectedPermissionIds.length} 项</div>
          </div>
        )}
        width={820}
        destroyOnClose
      >
        <div className="mb-2">
          <Input.Search allowClear placeholder="搜索权限名/描述" style={{ width: 360 }} onSearch={v => setPermSearch(v)} />
        </div>
        <PagedTable<Permission>
          columns={useMemo<ColumnsType<Permission>>(() => ([
            { title: 'Name', dataIndex: 'name' },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Created At', dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
          ]), [])}
          fetch={({ page, size, filters }) => listPermissions({ page, size, search: filters.search }) as Promise<PagedResult<Permission>>}
          initialFilters={{ search: permSearch }}
          dependencies={[permSearch]}
          rowSelectionEnabled
          rowKeyFn={(record) => (record as any).name ?? ''}
          selectedRowKeys={selectedPermissionIds}
          onSelectionChange={(keys) => setSelectedPermissionIds(keys)}
          pageSize={10}
        />
      </Modal>
    </div>
  );
}
