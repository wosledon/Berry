import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Dashboard } from './Dashboard';
import { UsersPage } from './UsersPage';
import { RolesPage } from './RolesPage';
import { PermissionsPage } from './PermissionsPage';
import { AuditLogsPage } from './AuditLogsPage';
import { LoginPage } from './LoginPage';
import { PermissionGuard } from '../components/PermissionGuard';
import { AuthGuard } from '../components/AuthGuard';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/users" element={<AuthGuard><PermissionGuard any={["users.view"]}><UsersPage /></PermissionGuard></AuthGuard>} />
        <Route path="/roles" element={<AuthGuard><PermissionGuard any={["roles.view"]}><RolesPage /></PermissionGuard></AuthGuard>} />
        <Route path="/permissions" element={<AuthGuard><PermissionGuard any={["permissions.view"]}><PermissionsPage /></PermissionGuard></AuthGuard>} />
        <Route path="/audits" element={<AuthGuard><PermissionGuard any={["audit.view"]}><AuditLogsPage /></PermissionGuard></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
