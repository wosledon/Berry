import { notification } from 'antd';
import type { ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';

export type NotifyFn = (message: ReactNode, description?: ReactNode) => void;

export function useNotify() {
  const { notificationPlacement } = useTheme();

  const open = (config: Parameters<typeof notification.open>[0]) => {
    notification.open({ placement: notificationPlacement, ...config });
  };

  const success: NotifyFn = (message, description) => notification.success({ message, description, placement: notificationPlacement });
  const info: NotifyFn = (message, description) => notification.info({ message, description, placement: notificationPlacement });
  const warning: NotifyFn = (message, description) => notification.warning({ message, description, placement: notificationPlacement });
  const error: NotifyFn = (message, description) => notification.error({ message, description, placement: notificationPlacement });

  return { open, success, info, warning, error };
}
