import { Routes, Route, Navigate } from 'react-router-dom';
import '../i18n';
import { Layout } from '../components/Layout';
import { Dashboard } from './Dashboard';
import { UsersPage } from './UsersPage';
import { RolesPage } from './RolesPage';
import { PermissionsPage } from './PermissionsPage';
import { AuditLogsPage } from './AuditLogsPage';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { MenusPage } from './MenusPage';
import { TenantsPage } from './TenantsPage';
import { PermissionGuard } from '../components/PermissionGuard';
import { AuthGuard } from '../components/AuthGuard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/menus" element={<PermissionGuard any={["menus.view"]}><MenusPage /></PermissionGuard>} />
                <Route path="/tenants" element={<PermissionGuard any={["tenants.view"]}><TenantsPage /></PermissionGuard>} />
                <Route path="/users" element={<PermissionGuard any={["users.view"]}><UsersPage /></PermissionGuard>} />
                <Route path="/roles" element={<PermissionGuard any={["roles.view"]}><RolesPage /></PermissionGuard>} />
                <Route path="/permissions" element={<PermissionGuard any={["permissions.view"]}><PermissionsPage /></PermissionGuard>} />
                <Route path="/audits" element={<PermissionGuard any={["audit.view"]}><AuditLogsPage /></PermissionGuard>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}
