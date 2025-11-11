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
  const { isDark, colors } = useTheme();
  return (
    <ConfigProvider theme={{
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: { borderRadius: 12, colorPrimary: colors.primary }
    }}>
      <App />
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
