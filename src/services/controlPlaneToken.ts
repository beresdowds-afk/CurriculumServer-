export function getSuperAdminAuthHeader(): Record<string, string> {
  try {
    const token = typeof window !== 'undefined'
      ? window.sessionStorage?.getItem('cf_control_plane_jwt')
      : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
