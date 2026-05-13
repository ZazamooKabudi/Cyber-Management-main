/**
 * Central API client — all fetch calls go through here.
 * The Vite dev server proxies /api → http://localhost:3001
 * In production, serve the built frontend from the same Node.js server.
 */

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  // DELETE and some PUT responses return { ok: true } — still parse
  return res.json();
}

const get  = <T>(path: string) => request<T>('GET', path);
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body);
const put  = <T>(path: string, body: unknown) => request<T>('PUT', path, body);
const del  = <T>(path: string) => request<T>('DELETE', path);
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body);

// ═══════════════════════════════════════════════════════════════════════════
// Auth / Users
// ═══════════════════════════════════════════════════════════════════════════

export const authApi = {
  login: (username: string, password: string) =>
    post<import('../types').User>('/users/login', { username, password }),
};

export const usersApi = {
  getAll: () => get<import('../types').User[]>('/users'),
  getById: (id: number) => get<import('../types').User>(`/users/${id}`),
  create: (u: Omit<import('../types').User, 'id'>) => post<import('../types').User>('/users', u),
  update: (id: number, u: Partial<import('../types').User>) => put<import('../types').User>(`/users/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/users/${id}`),
  changePassword: (id: number, password: string) => patch<{ ok: boolean }>(`/users/${id}/password`, { password }),
  getPermissions: (id: number) => get<import('../types').Permission[]>(`/users/${id}/permissions`),
  addPermission: (id: number, p: Omit<import('../types').Permission, 'id'>) =>
    post<import('../types').Permission>(`/users/${id}/permissions`, p),
  logActivity: (entry: Omit<import('../types').ActivityLog, 'id'>) =>
    post<import('../types').ActivityLog>('/users/activity/log', entry),
  getActivity: () => get<import('../types').ActivityLog[]>('/users/activity/log'),
};

// ═══════════════════════════════════════════════════════════════════════════
// Incidents
// ═══════════════════════════════════════════════════════════════════════════

export const incidentsApi = {
  getAll: () => get<import('../types').Incident[]>('/incidents'),
  create: (inc: Omit<import('../types').Incident, 'id'>) => post<import('../types').Incident>('/incidents', inc),
  update: (id: number, u: Partial<import('../types').Incident>) => put<import('../types').Incident>(`/incidents/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/incidents/${id}`),
  getActions: (incidentId: number) => get<import('../types').IncidentAction[]>(`/incidents/${incidentId}/actions`),
  addAction: (incidentId: number, a: Omit<import('../types').IncidentAction, 'id'>) =>
    post<import('../types').IncidentAction>(`/incidents/${incidentId}/actions`, a),
  getAssets: (incidentId: number) => get<import('../types').IncidentAsset[]>(`/incidents/${incidentId}/assets`),
  addAsset: (incidentId: number, a: Omit<import('../types').IncidentAsset, 'id'>) =>
    post<import('../types').IncidentAsset>(`/incidents/${incidentId}/assets`, a),
  getChecklist: (incidentId: number) => get<import('../types').IncidentChecklistItem[]>(`/incidents/${incidentId}/checklist`),
  addChecklistItem: (incidentId: number, item: Omit<import('../types').IncidentChecklistItem, 'id'>) =>
    post<import('../types').IncidentChecklistItem>(`/incidents/${incidentId}/checklist`, item),
  updateChecklistItem: (itemId: number, updates: Partial<import('../types').IncidentChecklistItem>) =>
    put<import('../types').IncidentChecklistItem>(`/incidents/checklist/${itemId}`, updates),
};

// ═══════════════════════════════════════════════════════════════════════════
// Tasks
// ═══════════════════════════════════════════════════════════════════════════

export const tasksApi = {
  getAll: () => get<import('../types').Task[]>('/tasks'),
  create: (t: Omit<import('../types').Task, 'id'>) => post<import('../types').Task>('/tasks', t),
  update: (id: number, u: Partial<import('../types').Task>) => put<import('../types').Task>(`/tasks/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/tasks/${id}`),
  getComments: (taskId: number) => get<import('../types').TaskComment[]>(`/tasks/${taskId}/comments`),
  addComment: (taskId: number, c: Omit<import('../types').TaskComment, 'id'>) =>
    post<import('../types').TaskComment>(`/tasks/${taskId}/comments`, c),
  getChecklist: (taskId: number) => get<import('../types').TaskChecklistItem[]>(`/tasks/${taskId}/checklist`),
  addChecklistItem: (taskId: number, item: Omit<import('../types').TaskChecklistItem, 'id'>) =>
    post<import('../types').TaskChecklistItem>(`/tasks/${taskId}/checklist`, item),
  updateChecklistItem: (itemId: number, isDone: boolean) =>
    put<{ ok: boolean }>(`/tasks/checklist/${itemId}`, { isDone }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Systems
// ═══════════════════════════════════════════════════════════════════════════

export const systemsApi = {
  getAll: () => get<import('../types').MonitoredSystem[]>('/systems'),
  create: (s: Omit<import('../types').MonitoredSystem, 'id'>) => post<import('../types').MonitoredSystem>('/systems', s),
  update: (id: number, u: Partial<import('../types').MonitoredSystem>) => put<import('../types').MonitoredSystem>(`/systems/${id}`, u),
  getChecks: (systemId: number) => get<import('../types').SystemCheck[]>(`/systems/${systemId}/checks`),
  addCheck: (systemId: number, check: Omit<import('../types').SystemCheck, 'id'>) =>
    post<import('../types').SystemCheck>(`/systems/${systemId}/checks`, check),
  getChecksByDate: (date: string) => get<(import('../types').SystemCheck & { systemName: string; systemCategory: string })[]>(`/systems/checks/by-date?date=${date}`),
  getDailySessions: () => get<import('../types').DailyCheckSession[]>('/systems/daily/sessions'),
  saveDailySession: (session: Omit<import('../types').DailyCheckSession, 'id'>) =>
    post<import('../types').DailyCheckSession>('/systems/daily/sessions', session),
};

// ═══════════════════════════════════════════════════════════════════════════
// CVEs
// ═══════════════════════════════════════════════════════════════════════════

export const cvesApi = {
  getAll: () => get<import('../types').CVE[]>('/cves'),
  create: (c: Omit<import('../types').CVE, 'id'>) => post<import('../types').CVE>('/cves', c),
  update: (id: number, u: Partial<import('../types').CVE>) => put<import('../types').CVE>(`/cves/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/cves/${id}`),
  getAssets: (cveId: number) => get<import('../types').CVEAsset[]>(`/cves/${cveId}/assets`),
  addAsset: (cveId: number, a: Omit<import('../types').CVEAsset, 'id'>) =>
    post<import('../types').CVEAsset>(`/cves/${cveId}/assets`, a),
  updateAsset: (assetId: number, u: Partial<import('../types').CVEAsset>) =>
    put<import('../types').CVEAsset>(`/cves/assets/${assetId}`, u),
};

// ═══════════════════════════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════════════════════════

export const settingsApi = {
  getAll: () => get<Record<string, string>>('/settings'),
  set: (key: string, value: string) => put<{ key: string; value: string }>(`/settings/${key}`, { value }),
  setBulk: (map: Record<string, string>) => put<{ ok: boolean }>('/settings', map),
  getTicker: () => get<import('../types').TickerMessage[]>('/settings/ticker/messages'),
  addTicker: (m: Omit<import('../types').TickerMessage, 'id'>) =>
    post<import('../types').TickerMessage>('/settings/ticker/messages', m),
  updateTicker: (id: number, u: Partial<import('../types').TickerMessage>) =>
    put<import('../types').TickerMessage>(`/settings/ticker/messages/${id}`, u),
  deleteTicker: (id: number) => del<{ ok: boolean }>(`/settings/ticker/messages/${id}`),
  getActiveBanner: () => get<import('../types').EmergencyBanner | null>('/settings/banner/active'),
  getBanners: () => get<import('../types').EmergencyBanner[]>('/settings/banners/all'),
  createBanner: (b: Omit<import('../types').EmergencyBanner, 'id'>) =>
    post<import('../types').EmergencyBanner>('/settings/banners/all', b),
  updateBanner: (id: number, u: Partial<import('../types').EmergencyBanner>) =>
    put<import('../types').EmergencyBanner>(`/settings/banners/all/${id}`, u),
};

// ═══════════════════════════════════════════════════════════════════════════
// App Config (DB path, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export const configApi = {
  get: () => get<{ db_path: string }>('/config'),
  setDbPath: (db_path: string) =>
    put<{ ok: boolean; db_path: string; restartRequired: boolean }>('/config/db-path', { db_path }),
  copyAndSetDbPath: (db_path: string) =>
    post<{ ok: boolean; db_path: string; copied: boolean; restartRequired: boolean }>('/config/db-path/copy', { db_path }),
};

// ═══════════════════════════════════════════════════════════════════════════
// Analysts & Shifts
// ═══════════════════════════════════════════════════════════════════════════

export const analystsApi = {
  getAll: () => get<import('../types').Analyst[]>('/analysts'),
  create: (a: Omit<import('../types').Analyst, 'id'>) => post<import('../types').Analyst>('/analysts', a),
  update: (id: number, u: Partial<import('../types').Analyst>) => put<import('../types').Analyst>(`/analysts/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/analysts/${id}`),
  getShifts: (from?: string, to?: string) => {
    const q = from && to ? `?from=${from}&to=${to}` : '';
    return get<import('../types').Shift[]>(`/analysts/shifts/all${q}`);
  },
  addShift: (s: Omit<import('../types').Shift, 'id'>) => post<import('../types').Shift>('/analysts/shifts/all', s),
  updateShift: (id: number, u: Partial<import('../types').Shift>) =>
    put<import('../types').Shift>(`/analysts/shifts/all/${id}`, u),
  deleteShift: (id: number) => del<{ ok: boolean }>(`/analysts/shifts/all/${id}`),
};

// ═══════════════════════════════════════════════════════════════════════════
// Shift Handover
// ═══════════════════════════════════════════════════════════════════════════

export const handoverApi = {
  getAll: () => get<import('../types').ShiftHandover[]>('/handover'),
  create: (h: Omit<import('../types').ShiftHandover, 'id'>) => post<import('../types').ShiftHandover>('/handover', h),
  update: (id: number, u: Partial<import('../types').ShiftHandover>) =>
    put<import('../types').ShiftHandover>(`/handover/${id}`, u),
  getItems: (handoverId: number) => get<import('../types').HandoverItem[]>(`/handover/${handoverId}/items`),
  addItem: (handoverId: number, item: Omit<import('../types').HandoverItem, 'id'>) =>
    post<import('../types').HandoverItem>(`/handover/${handoverId}/items`, item),
  updateItem: (itemId: number, u: Partial<import('../types').HandoverItem>) =>
    put<import('../types').HandoverItem>(`/handover/items/${itemId}`, u),
};

// ═══════════════════════════════════════════════════════════════════════════
// Special Events
// ═══════════════════════════════════════════════════════════════════════════

export const eventsApi = {
  getAll: () => get<import('../types').SpecialEvent[]>('/events'),
  create: (e: Omit<import('../types').SpecialEvent, 'id'>) => post<import('../types').SpecialEvent>('/events', e),
  update: (id: number, u: Partial<import('../types').SpecialEvent>) =>
    put<import('../types').SpecialEvent>(`/events/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/events/${id}`),
  getParticipants: (eventId: number) => get<import('../types').EventParticipant[]>(`/events/${eventId}/participants`),
  addParticipant: (eventId: number, p: Omit<import('../types').EventParticipant, 'id'>) =>
    post<import('../types').EventParticipant>(`/events/${eventId}/participants`, p),
  removeParticipant: (eventId: number, userId: number) =>
    del<{ ok: boolean }>(`/events/${eventId}/participants/${userId}`),
  getChecklist: (eventId: number) =>
    get<import('../types').EventChecklistItem[]>(`/events/${eventId}/checklist`),
  addChecklistItem: (eventId: number, item: Omit<import('../types').EventChecklistItem, 'id'>) =>
    post<import('../types').EventChecklistItem>(`/events/${eventId}/checklist`, item),
  updateChecklistItem: (itemId: number, u: Partial<import('../types').EventChecklistItem>) =>
    put<import('../types').EventChecklistItem>(`/events/checklist/${itemId}`, u),
};

// ═══════════════════════════════════════════════════════════════════════════
// Playbooks
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// Inventory & Loans
// ═══════════════════════════════════════════════════════════════════════════

export const inventoryApi = {
  getAll:      () => get<import('../types').InventoryItem[]>('/inventory'),
  create:      (item: Omit<import('../types').InventoryItem, 'id'>) =>
    post<import('../types').InventoryItem>('/inventory', item),
  update:      (id: number, u: Partial<import('../types').InventoryItem>) =>
    put<import('../types').InventoryItem>(`/inventory/${id}`, u),
  delete:      (id: number) => del<{ ok: boolean }>(`/inventory/${id}`),

  getLoans:    () => get<import('../types').Loan[]>('/inventory/loans'),
  getItemLoans:(itemId: number) => get<import('../types').Loan[]>(`/inventory/${itemId}/loans`),
  createLoan:  (loan: Omit<import('../types').Loan, 'id' | 'itemName' | 'itemType' | 'itemSerial'>) =>
    post<import('../types').Loan>('/inventory/loans', loan),
  updateLoan:  (id: number, u: Partial<import('../types').Loan>) =>
    put<import('../types').Loan>(`/inventory/loans/${id}`, u),
  deleteLoan:  (id: number) => del<{ ok: boolean }>(`/inventory/loans/${id}`),
  returnLoan:  (id: number) =>
    put<import('../types').Loan>(`/inventory/loans/${id}`, {
      status: 'returned',
      returnedAt: new Date().toISOString(),
    }),
};

export const playbooksApi = {
  getAll: () => get<import('../types').Playbook[]>('/playbooks'),
  create: (p: Omit<import('../types').Playbook, 'id'>) => post<import('../types').Playbook>('/playbooks', p),
  update: (id: number, u: Partial<import('../types').Playbook>) =>
    put<import('../types').Playbook>(`/playbooks/${id}`, u),
  delete: (id: number) => del<{ ok: boolean }>(`/playbooks/${id}`),
  getItems: (playbookId: number) => get<import('../types').PlaybookItem[]>(`/playbooks/${playbookId}/items`),
  addItem: (playbookId: number, item: Omit<import('../types').PlaybookItem, 'id'>) =>
    post<import('../types').PlaybookItem>(`/playbooks/${playbookId}/items`, item),
  updateItem: (itemId: number, u: Partial<import('../types').PlaybookItem>) =>
    put<import('../types').PlaybookItem>(`/playbooks/items/${itemId}`, u),
  deleteItem: (itemId: number) => del<{ ok: boolean }>(`/playbooks/items/${itemId}`),
};
