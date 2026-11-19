import { PortalRoleId } from './data/limsPreviewData';

export type CustomerNavTab = 'dashboard' | 'wizard' | 'calendar' | 'catalog';

export type AdminNavTab =
  | 'dashboard'
  | 'verification'
  | 'kaji-ulang'
  | 'calendar'
  | 'catalog'
  | 'analytics';

export const PUBLIC_ROUTES = {
  landing: '/',
  login: '/login',
  register: '/daftar',
} as const;

export const CUSTOMER_TAB_TO_PATH: Record<CustomerNavTab, string> = {
  dashboard: '/pelanggan/dashboard',
  wizard: '/pelanggan/permohonan-baru',
  calendar: '/pelanggan/jadwal',
  catalog: '/pelanggan/katalog',
};

export const CUSTOMER_SLUG_TO_TAB: Record<string, CustomerNavTab> = {
  dashboard: 'dashboard',
  'permohonan-baru': 'wizard',
  jadwal: 'calendar',
  katalog: 'catalog',
};

export const ADMIN_TAB_TO_PATH: Record<AdminNavTab, string> = {
  dashboard: '/internal/dashboard',
  verification: '/internal/verifikasi',
  'kaji-ulang': '/internal/kaji-ulang',
  calendar: '/internal/jadwal',
  catalog: '/internal/katalog',
  analytics: '/internal/analitik',
};

export const ADMIN_SLUG_TO_TAB: Record<string, AdminNavTab> = {
  dashboard: 'dashboard',
  verifikasi: 'verification',
  'kaji-ulang': 'kaji-ulang',
  jadwal: 'calendar',
  katalog: 'catalog',
  analitik: 'analytics',
};

export function getDefaultPortalPath(roleId: PortalRoleId, isAdminUser: boolean): string {
  if (roleId === 'customer' || !isAdminUser) {
    return CUSTOMER_TAB_TO_PATH.dashboard;
  }
  if (roleId === 'technical_manager') {
    return ADMIN_TAB_TO_PATH['kaji-ulang'];
  }
  return ADMIN_TAB_TO_PATH.dashboard;
}

export function isPathAllowedForUser(
  pathname: string,
  roleId: PortalRoleId,
  isAdminUser: boolean
): boolean {
  const isCustomer = roleId === 'customer' || !isAdminUser;
  if (isCustomer) {
    return pathname.startsWith('/pelanggan/');
  }
  return pathname.startsWith('/internal/');
}

const BASE_TITLE = 'SmartLIMS — Portal Permohonan Sampling Lingkungan ISO/IEC 17025';

export function getRouteDocumentTitle(pathname: string): string {
  switch (pathname) {
    case '/':
      return BASE_TITLE;
    case '/login':
      return 'Masuk Akun | SmartLIMS';
    case '/daftar':
      return 'Daftar Badan Usaha | SmartLIMS';
    case '/pelanggan/dashboard':
      return 'Dashboard Pelanggan | SmartLIMS';
    case '/pelanggan/permohonan-baru':
      return 'Buat Permohonan Sampling | SmartLIMS';
    case '/pelanggan/jadwal':
      return 'Jadwal & Kuota Sampler | SmartLIMS';
    case '/pelanggan/katalog':
      return 'Katalog Baku Mutu | SmartLIMS';
    case '/internal/dashboard':
      return 'Dashboard Internal Lab | SmartLIMS';
    case '/internal/verifikasi':
      return 'Verification Center | SmartLIMS';
    case '/internal/kaji-ulang':
      return 'Kaji Ulang ISO 17025 | SmartLIMS';
    case '/internal/jadwal':
      return 'Manajemen Jadwal Sampler | SmartLIMS';
    case '/internal/katalog':
      return 'Katalog Baku Mutu Lab | SmartLIMS';
    case '/internal/analitik':
      return 'Analitik & Audit Log | SmartLIMS';
    default:
      return BASE_TITLE;
  }
}
