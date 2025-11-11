import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Dashboard } from './Dashboard';
import { UsersPage } from './UsersPage';
import { RolesPage } from './RolesPage';
import { PermissionsPage } from './PermissionsPage';
import { AuditLogsPage } from './AuditLogsPage';
import { LoginPage } from './LoginPage';
import { PermissionGuard } from '../components/PermissionGuard';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={
          <PermissionGuard any={["users.view"]}>
            <UsersPage />
          </PermissionGuard>
        } />
        <Route path="/roles" element={
          <PermissionGuard any={["roles.view"]}>
            <RolesPage />
          </PermissionGuard>
        } />
        <Route path="/permissions" element={
          <PermissionGuard any={["permissions.view"]}>
            <PermissionsPage />
          </PermissionGuard>
        } />
        <Route path="/audits" element={
          <PermissionGuard any={["audit.view"]}>
            <AuditLogsPage />
          </PermissionGuard>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
