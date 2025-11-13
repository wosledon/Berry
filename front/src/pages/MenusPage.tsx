import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PagedTable, PagedResult } from '../components/PagedTable';
import { useMutation } from '@tanstack/react-query';
import { createMenu, deleteMenu, listMenus, MenuItem, updateMenu } from '../services/menus';
import { useNotify } from '../hooks/useNotify';
import { useTranslation } from 'react-i18next';

export function MenusPage() {
  const { t } = useTranslation();
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form] = Form.useForm<MenuItem>();

  const columns: ColumnsType<MenuItem> = useMemo(() => ([
    { title: t('Name'), dataIndex: 'name' },
    { title: t('Path'), dataIndex: 'path' },
    { title: t('Icon'), dataIndex: 'icon' },
    { title: t('Order'), dataIndex: 'order' },
    { title: t('Permission'), dataIndex: 'permission' },
    { title: t('Created At'), dataIndex: 'createdAt', render: (v?: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: t('Deleted'), dataIndex: 'isDeleted', render: (v?: boolean) => v ? <Tag color="red">{t('Yes')}</Tag> : <Tag>{t('No')}</Tag> },
    { title: t('Actions'), width: 160, render: (_, r) => (
      <div className="flex items-center gap-2">
        <Button size="small" onClick={() => onEdit(r)}>{t('Edit')}</Button>
        <Popconfirm title={t('Delete this menu?')} onConfirm={() => onDelete(r.id!)}>
          <Button size="small" danger>{t('Delete')}</Button>
        </Popconfirm>
      </div>
    )}
  ]), [t]);

  const createMut = useMutation({
    mutationFn: (payload: MenuItem) => createMenu(payload),
    onSuccess: () => { notify.success(t('Created')); setReloadTick(x => x + 1); setModalOpen(false); }
  });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; payload: MenuItem }) => updateMenu(vars.id, vars.payload),
    onSuccess: () => { notify.success(t('Updated')); setReloadTick(x => x + 1); setModalOpen(false); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMenu(id),
    onSuccess: () => { notify.success(t('Deleted')); setReloadTick(x => x + 1); }
  });

  function onNew() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ order: 0 });
    setModalOpen(true);
  }
  function onEdit(m: MenuItem) {
    setEditing(m);
    form.setFieldsValue({ ...m });
    setModalOpen(true);
  }
  async function onDelete(id: string) { await deleteMut.mutateAsync(id); }
  function onSubmit() {
    form.validateFields().then(values => {
      const payload: MenuItem = { ...editing, ...values } as MenuItem;
      if (editing?.id) updateMut.mutate({ id: editing.id, payload }); else createMut.mutate(payload);
    });
  }

  return (
    <div>
      <PagedTable<MenuItem>
        columns={columns}
        fetch={({ page, size, filters }) => listMenus({ page, size, search: filters.search }) as Promise<PagedResult<MenuItem>>}
        initialFilters={{ search }}
        dependencies={[reloadTick]}
        rowSelectionEnabled
        onSelectionChange={(keys) => setSelectedIds(keys)}
        toolbar={(
          <div className="flex items-center gap-2">
            <Button type="primary" onClick={onNew}>{t('New Menu')}</Button>
            <Input.Search allowClear placeholder={t('Search menu name/path/permission')} style={{ width: 320 }} onSearch={v => setSearch(v)} />
            {selectedIds.length > 0 && (
              <Popconfirm title={t('Delete selected items?', { count: selectedIds.length })} onConfirm={async ()=> { for(const id of selectedIds) await deleteMut.mutateAsync(id); setSelectedIds([]); }}>
                <Button danger>{t('Delete Selected')}</Button>
              </Popconfirm>
            )}
          </div>
        )}
      />

      <Modal title={editing ? t('Edit Menu') : t('New Menu')} open={modalOpen} onCancel={()=>setModalOpen(false)} onOk={onSubmit} confirmLoading={createMut.isPending || updateMut.isPending} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item label={t('Name')} name="name" rules={[{ required: true, message: t('Required') }]}>
            <Input placeholder={t('menu name')} />
          </Form.Item>
          <Form.Item label={t('Path')} name="path" rules={[{ required: true, message: t('Required') }]}>
            <Input placeholder={t('path')} />
          </Form.Item>
          <Form.Item label={t('Icon')} name="icon">
            <Input placeholder={t('icon')} />
          </Form.Item>
          <Form.Item label={t('Order')} name="order">
            <Input type="number" placeholder={t('order')} />
          </Form.Item>
          <Form.Item label={t('Permission')} name="permission">
            <Input placeholder={t('permission')} />
          </Form.Item>
          <Form.Item label={t('Parent')} name="parentId">
            <Select allowClear placeholder={t('parent menu (optional)')} options={[]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
