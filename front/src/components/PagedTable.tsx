import { useEffect, useState } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useDebounce } from '../hooks/useDebounce';

export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

interface PagedTableProps<T> {
  columns: ColumnsType<T>;
  fetch: (args: { page: number; size: number; filters: Record<string, any> }) => Promise<PagedResult<T>>;
  pageSize?: number;
  initialFilters?: Record<string, any>;
  dependencies?: any[]; // 外部依赖变化时重载
  toolbar?: React.ReactNode;
  onDataLoaded?: (data: PagedResult<T>) => void;
  renderFilters?: (filters: Record<string, any>, setFilters: (f: Record<string, any>) => void) => React.ReactNode;
  rowSelectionEnabled?: boolean;
  onSelectionChange?: (selectedKeys: string[], selectedRows: T[]) => void;
  selectedRowKeys?: string[]; // 受控选择
  defaultSelectedRowKeys?: string[]; // 非受控初始选择
  rowKeyFn?: (record: T) => string | number; // 自定义 rowKey
}

export function PagedTable<T extends { id?: string | null }>(props: PagedTableProps<T>) {
  const { columns, fetch, pageSize = 20, initialFilters = {}, dependencies = [], toolbar, onDataLoaded, renderFilters, rowSelectionEnabled, onSelectionChange, selectedRowKeys: controlledKeys, defaultSelectedRowKeys, rowKeyFn } = props;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<T>>();
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const debouncedFilters = useDebounce(filters, 400);
  const [uncontrolledKeys, setUncontrolledKeys] = useState<React.Key[]>(defaultSelectedRowKeys ?? []);

  async function load(p = page, f = debouncedFilters) {
    setLoading(true);
    try {
      const r = await fetch({ page: p, size: pageSize, filters: f });
      setData(r);
      onDataLoaded?.(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, debouncedFilters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        {toolbar}
        {renderFilters?.(filters, setFilters)}
      </div>
      <Table
        rowKey={record => (rowKeyFn ? rowKeyFn(record) : (record as any).id ?? '')}
        loading={loading}
        dataSource={data?.items ?? []}
        columns={columns}
        rowSelection={rowSelectionEnabled ? {
          selectedRowKeys: controlledKeys ?? uncontrolledKeys,
          onChange: (keys, rows) => {
            if (controlledKeys === undefined) setUncontrolledKeys(keys);
            onSelectionChange?.(keys as string[], rows as T[]);
          }
        } : undefined}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: false,
          onChange: (p) => { setPage(p); load(p); }
        }}
      />
    </div>
  );
}

export function useTableFilters<T extends object>(initial: T) {
  const [filters, setFilters] = useState<T>(initial);
  return { filters, setFilters };
}
