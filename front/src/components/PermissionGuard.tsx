import { ReactNode } from 'react';
import { usePermissions } from '../context/PermissionsContext';

interface Props {
  all?: string[];
  any?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ all, any, fallback = null, children }: Props) {
  const { hasAll, hasAny } = usePermissions();
  if (all && !hasAll(all)) return <>{fallback}</>;
  if (any && !hasAny(any)) return <>{fallback}</>;
  return <>{children}</>;
}
