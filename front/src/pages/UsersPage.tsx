import { useMutation } from '@tanstack/react-query';
import { listUsers, User, createUser, updateUser, deleteUser, bindUserRoles, unbindUserRoles, getUserDetail } from '../services/users';
import { useMemo, useState } from 'react';
import { Input, Modal, Form, Tag, Button, Popconfirm } from 'antd';
import { useNotify } from '../hooks/useNotify';
import type { ColumnsType } from 'antd/es/table';
import { listRoles, Role } from '../services/roles';
import { PagedTable, PagedResult } from '../components/PagedTable';
import { useTranslation } from 'react-i18next';

export function UsersPage() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form] = Form.useForm<{ username: string; displayName?: string; email?: string }>();
  // 分配角色弹窗状态
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const { t } = useTranslation();

  const columns: ColumnsType<User> = useMemo(() => ([
    { title: t('Username'), dataIndex: 'username' },
    { title: t('Display Name'), dataIndex: 'displayName' },
    { title: t('Email'), dataIndex: 'email' },
    { title: t('Created At'), dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('Deleted'), dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">Yes</Tag> : <Tag>No</Tag> },
    {
      title: t('Actions'),
      width: 160,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button size="small" onClick={() => onManageRoles(record)}>{t('Manage Roles')}</Button>
          <Button size="small" onClick={() => onEdit(record)}>{t('Edit')}</Button>
          <Popconfirm title={t('Delete this user?')} onConfirm={() => onDelete(record.id!)}>
            <Button size="small" danger>{t('Delete')}</Button>
          </Popconfirm>
        </div>
      )
    }
  ]), [t]);

  const createMut = useMutation({
    mutationFn: (payload: User) => createUser(payload),
    onSuccess: () => { notify.success(t('Created')); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: User }) => updateUser(vars.id, vars.payload),
    onSuccess: () => { notify.success(t('Updated')); setReloadTick(t => t + 1); setModalOpen(false); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => { notify.success(t('Deleted')); setReloadTick(t => t + 1); }
  });

  function onNew() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }
  function onEdit(u: User) {
    setEditing(u);
    form.setFieldsValue({ username: u.username ?? '', displayName: u.displayName ?? '', email: u.email ?? '' });
    setModalOpen(true);
  }
  function onManageRoles(u: User) {
    setAssignTarget(u);
    setSelectedRoleIds([]);
    setRoleSearch('');
    setAssignOpen(true);
    if (u.id) {
      getUserDetail(u.id).then((detail: any) => {
        const ids = Array.isArray(detail?.roles) ? detail.roles.map((r: any) => r?.id).filter((x: any) => !!x) : [];
        setSelectedRoleIds(ids);
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
      const payload: User = { username: values.username, displayName: values.displayName, email: values.email } as User;
      if (editing?.id) updateMut.mutate({ id: editing.id!, payload }); else createMut.mutate(payload);
    });
  }

  // 分配角色 - 绑定/解绑
  async function onBindRoles() {
    if (!assignTarget?.id) return;
    if (selectedRoleIds.length === 0) { notify.warning(t('Please select roles to bind')); return; }
    await bindUserRoles(assignTarget.id!, selectedRoleIds);
    notify.success(t('Roles bound'));
    setAssignOpen(false);
  }
  async function onUnbindRoles() {
    if (!assignTarget?.id) return;
    if (selectedRoleIds.length === 0) { notify.warning(t('Please select roles to unbind')); return; }
    await unbindUserRoles(assignTarget.id!, selectedRoleIds);
    notify.success(t('Roles unbound'));
    setAssignOpen(false);
  }

  return (
    <div>
      <PagedTable<User>
        columns={columns}
        fetch={({ page, size, filters }) => listUsers({ page, size, search: filters.search }) as Promise<PagedResult<User>>}
        initialFilters={{ search }}
        dependencies={[reloadTick]}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
        toolbar={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={onNew}>{t('New User')}</Button>
            <Input.Search allowClear placeholder={t('Search username/name/email')} onSearch={v => { setSearch(v); }} style={{ width: 280 }} />
            {selectedIds.length > 0 && (
              <Popconfirm title={`Delete ${selectedIds.length} users?`} onConfirm={onDeleteSelected}>
                <Button danger>{t('Delete Selected')}</Button>
              </Popconfirm>
            )}
          </div>
        )}
      />

      <Modal
        title={editing ? t('Edit User') : t('New User')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={onSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label={t('Username')} name="username" rules={[{ required: true, message: t('Required') }]}>
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item label={t('Display Name')} name="displayName">
            <Input placeholder="display name" />
          </Form.Item>
          <Form.Item label={t('Email')} name="email" rules={[{ type: 'email', message: t('Invalid email') }]}>
            <Input placeholder="email" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${t('Manage Roles')}${assignTarget?.username ? ` - ${assignTarget.username}` : ''}`}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        footer={(
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={onUnbindRoles} danger disabled={!assignTarget?.id}>{t('Unbind Selected')}</Button>
              <Button type="primary" onClick={onBindRoles} disabled={!assignTarget?.id}>{t('Bind Selected')}</Button>
            </div>
            <div className="opacity-70">{t('Selected {count} items', { count: selectedRoleIds.length })}</div>
          </div>
        )}
        width={720}
        destroyOnClose
      >
        <div className="mb-2">
          <Input.Search allowClear placeholder={t('Search role name/description')} style={{ width: 320 }} onSearch={v => setRoleSearch(v)} />
        </div>
        <PagedTable<Role>
          columns={useMemo<ColumnsType<Role>>(() => ([
            { title: t('Name'), dataIndex: 'name' },
            { title: t('Description'), dataIndex: 'description' },
            { title: t('Created At'), dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
          ]), [t])}
          fetch={({ page, size, filters }) => listRoles({ page, size, search: filters.search }) as Promise<PagedResult<Role>>}
          initialFilters={{ search: roleSearch }}
          dependencies={[roleSearch]}
          rowSelectionEnabled
          selectedRowKeys={selectedRoleIds}
          onSelectionChange={(keys) => setSelectedRoleIds(keys)}
          pageSize={10}
        />
      </Modal>
    </div>
  );
}
