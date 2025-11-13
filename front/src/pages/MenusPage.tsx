import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Select, Popconfirm, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PagedTable, PagedResult } from '../components/PagedTable';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createMenu, deleteMenu, listMenus, MenuItem, updateMenu, importMenus, ReportMenuItem } from '../services/menus';
import { routes } from '../config/routes';
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

  // 为“父级”下拉构建选项：拉取全量菜单，构建树，扁平化为有缩进的 options
  const { data: allMenus, isLoading: loadingMenus } = useQuery({
    queryKey: ['menus-all', reloadTick],
    queryFn: async () => {
      const res = await listMenus({ page: 1, size: 1000 });
      return (res as any).items as MenuItem[];
    }
  });
  const parentOptions = useMemo(() => {
    const items = Array.isArray(allMenus) ? allMenus : [];
    // 构建节点映射与子列表
    const byId = new Map<string, any>();
    items.forEach(m => {
      if (!m.id) return;
      byId.set(m.id, { ...m, children: [] as any[] });
    });
    const roots: any[] = [];
    byId.forEach(node => {
      const pid = node.parentId as string | undefined | null;
      if (pid && byId.has(pid)) byId.get(pid).children.push(node); else roots.push(node);
    });
    // 排序函数
    const sortTree = (arr: any[]) => {
      arr.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.name ?? '').localeCompare(b.name ?? ''));
      arr.forEach(n => sortTree(n.children || []));
    };
    sortTree(roots);
    // 计算需要禁用的集合（防环）
    const disabled = new Set<string>();
    const startId = editing?.id;
    if (startId && byId.has(startId)) {
      const stack = [byId.get(startId)];
      while (stack.length) {
        const cur = stack.pop();
        if (cur?.id && !disabled.has(cur.id)) {
          disabled.add(cur.id);
          (cur.children || []).forEach((c: any) => stack.push(c));
        }
      }
    }
    // 扁平化为 options（缩进显示层级）
    const options: Array<{ label: string; value: string; disabled?: boolean }> = [];
    const indentUnit = '  '; // 使用窄空格缩进，视觉更整齐
    const walk = (arr: any[], depth = 0) => {
      arr.forEach(n => {
        if (!n.id) return;
        const indent = indentUnit.repeat(depth);
        const label = `${indent}${n.name ?? '-'}${n.path ? `  (${n.path})` : ''}`;
        options.push({ label, value: n.id, disabled: disabled.has(n.id) });
        if (n.children && n.children.length) walk(n.children, depth + 1);
      });
    };
    walk(roots);
    return options;
  }, [allMenus, editing?.id]);

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
  const importMut = useMutation({
    mutationFn: (items: ReportMenuItem[]) => importMenus(items),
    onSuccess: (res) => { notify.success(t('Reported')); setReloadTick(x => x + 1); },
  });

  function flattenRoutesToMenus() {
    const items: ReportMenuItem[] = [];
    const walk = (arr: typeof routes, parentPath?: string | null) => {
      arr.forEach((r, idx) => {
        if (!r.path) return;
        // use translated text as name; if key missing, i18n returns key which is acceptable
        items.push({
          name: t(r.titleKey),
          path: r.path,
          icon: r.iconKey || undefined,
          order: idx,
          permission: r.any && r.any.length > 0 ? r.any[0] : undefined,
          parentPath: parentPath || null,
        });
        if (Array.isArray(r.children) && r.children.length > 0) {
          walk(r.children as any, r.path);
        }
      });
    };
    walk(routes);
    return items;
  }
  async function onReportMenus() {
    const items = flattenRoutesToMenus();
    await importMut.mutateAsync(items);
  }

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
            <Button onClick={onReportMenus} loading={importMut.isPending}>{t('Report Menus')}</Button>
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
            <Select
              allowClear
              loading={loadingMenus}
              placeholder={t('parent menu (optional)')}
              options={parentOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
