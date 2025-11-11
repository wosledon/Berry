export function getAuthState() {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');
  const tenantId = localStorage.getItem('tenantId');
  return { token, userId, tenantId };
}
