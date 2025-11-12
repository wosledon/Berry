import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './pages/App';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ConfigProvider, theme as antdTheme } from 'antd';
import 'antd/dist/reset.css';

const qc = new QueryClient();

function ThemedApp() {
  const { isDark, colors, layoutStyle } = useTheme();
  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { borderRadius: 12, colorPrimary: colors.primary }
    }} componentSize={layoutStyle === 'compact' ? 'small' : 'middle'}>
      <App />
    </ConfigProvider>
  );
}

const AppTree = (
  <BrowserRouter>
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AuthProvider>
          <PermissionsProvider>
            <ThemedApp />
          </PermissionsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

// 说明：React 18 在开发模式下的 StrictMode 会故意二次调用副作用（mount -> unmount -> remount），导致所有 useEffect 中的请求执行两次。
// 如需避免开发环境重复请求，可设置环境变量 VITE_STRICT=false 运行，或在此直接移除 StrictMode。
// 生产构建（npm run build 后部署）不会触发二次请求。
ReactDOM.createRoot(document.getElementById('root')!).render(
  import.meta.env.VITE_STRICT === 'false' ? AppTree : <React.StrictMode>{AppTree}</React.StrictMode>
);
