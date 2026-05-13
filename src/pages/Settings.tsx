import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Palette, Bell, Rss, Shield, Database, List, Pencil, Trash2, Plus, Check, X, Activity, Filter, BookOpen, GripVertical, Mail, Eye, EyeOff, FolderOpen, AlertTriangle, Copy } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/appStore';
import { useListsStore, type ListName } from '../store/listsStore';
import { usePlaybooksStore } from '../store/playbooksStore';
import { settingsApi, usersApi, incidentsApi, tasksApi, systemsApi, cvesApi, configApi } from '../api/client';
import type { Theme, TickerMessage, ActivityLog, User, PlaybookItem } from '../types';
import { format } from 'date-fns';

const TABS = [
  { id: 'general', label: 'כללי', icon: SettingsIcon },
  { id: 'themes', label: 'Themes', icon: Palette },
  { id: 'banner', label: 'הודעה מתפרצת', icon: Bell },
  { id: 'ticker', label: 'Ticker', icon: Rss },
  { id: 'sla', label: 'SLA', icon: Shield },
  { id: 'lists', label: 'ניהול רשימות', icon: List },
  { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
  { id: 'email', label: 'SMTP מייל', icon: Mail },
  { id: 'activity', label: 'לוג פעולות', icon: Activity },
  { id: 'data', label: 'נתונים', icon: Database },
];

const LIST_DEFS: { key: ListName; label: string }[] = [
  { key: 'incidentCategories', label: 'קטגוריות אירועים' },
  { key: 'incidentSources', label: 'מקורות גילוי' },
  { key: 'systemCategories', label: 'קטגוריות מערכות' },
  { key: 'equipmentTypes', label: 'סוגי ציוד' },
  { key: 'userRoles', label: 'תפקידי משתמשים' },
];

const THEMES: { id: Theme; label: string; desc: string; preview: { bg: string; accent: string } }[] = [
  { id: 'dark', label: 'Dark Cyber', desc: 'רקע כהה עם הדגשות ציאן (ברירת מחדל)', preview: { bg: '#0a0d14', accent: '#00d4ff' } },
  { id: 'midnight', label: 'Midnight Black', desc: 'שחור מוחלט עם ירוק ניאון', preview: { bg: '#000000', accent: '#00ff88' } },
  { id: 'navy', label: 'Navy Ops', desc: 'כחול כהה עם זהב', preview: { bg: '#0a0e1a', accent: '#f5c518' } },
  { id: 'light', label: 'Light Mode', desc: 'מצב בהיר לשימוש יומי', preview: { bg: '#f0f4f8', accent: '#0066cc' } },
  { id: 'contrast', label: 'High Contrast', desc: 'ניגודיות גבוהה לנגישות', preview: { bg: '#000000', accent: '#ffffff' } },
];

const PHASES = ['זיהוי', 'הכלה', 'חקירה', 'תיקון', 'סיום', 'כללי'];

export function Settings() {
  const { theme, setTheme, loadBanner, loadTickerMessages, loadSettings } = useAppStore();
  const { incidentCategories, incidentSources, systemCategories, equipmentTypes, userRoles, addItem, removeItem, updateItem } = useListsStore();
  const { playbooks, loadPlaybooks, addPlaybookItem, updatePlaybookItem, deletePlaybookItem, getPlaybookItems } = usePlaybooksStore();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [tickerMessages, setTickerMessages] = useState<TickerMessage[]>([]);
  const [bannerForm, setBannerForm] = useState({ message: '', severity: 'high' as const, expiresAt: '' });
  const [slaForm, setSlaForm] = useState({ critical: '15', high: '60', medium: '240', low: '1440' });
  const [newTicker, setNewTicker] = useState({ content: '', severity: 'info' as const });
  const [saved, setSaved] = useState(false);
  const [showSmtpPw, setShowSmtpPw] = useState(false);
  const [smtpTestStatus, setSmtpTestStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_password: '',
    smtp_from_address: '', smtp_from_name: 'SOC System', smtp_tls: 'true', smtp_relay_url: '',
  });

  // Data tab — DB path config
  const [dbPath, setDbPath] = useState('');
  const [dbPathInput, setDbPathInput] = useState('');
  const [dbPathStatus, setDbPathStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [dbPathError, setDbPathError] = useState('');
  const [dbPathRestartNeeded, setDbPathRestartNeeded] = useState(false);

  // Playbooks tab state
  const [pbSelected, setPbSelected] = useState<number | null>(null);
  const [pbItems, setPbItems] = useState<PlaybookItem[]>([]);
  const [pbNewItem, setPbNewItem] = useState({ item: '', phase: 'כללי' });
  const [pbAdding, setPbAdding] = useState(false);
  const [pbEditingId, setPbEditingId] = useState<number | null>(null);
  const [pbEditDraft, setPbEditDraft] = useState({ item: '', phase: '' });

  const loadPbItems = useCallback(async (id: number) => {
    const items = await getPlaybookItems(id);
    setPbItems(items);
  }, [getPlaybookItems]);

  useEffect(() => {
    if (activeTab === 'playbooks' && playbooks.length === 0) loadPlaybooks();
  }, [activeTab]);

  useEffect(() => {
    if (pbSelected) loadPbItems(pbSelected);
  }, [pbSelected]);

  const handlePbAddItem = async () => {
    if (!pbNewItem.item.trim() || !pbSelected) return;
    const maxOrder = pbItems.length > 0 ? Math.max(...pbItems.map(i => i.order)) : 0;
    await addPlaybookItem({ playbookId: pbSelected, item: pbNewItem.item.trim(), phase: pbNewItem.phase, order: maxOrder + 1 });
    setPbNewItem({ item: '', phase: 'כללי' });
    setPbAdding(false);
    await loadPbItems(pbSelected);
  };

  const handlePbUpdateItem = async (id: number) => {
    await updatePlaybookItem(id, { item: pbEditDraft.item, phase: pbEditDraft.phase });
    setPbEditingId(null);
    if (pbSelected) await loadPbItems(pbSelected);
  };

  const handlePbDeleteItem = async (id: number) => {
    await deletePlaybookItem(id);
    if (pbSelected) await loadPbItems(pbSelected);
  };

  // Activity log state
  const [activityLogs, setActivityLogs] = useState<(ActivityLog & { username?: string })[]>([]);
  const [activityModule, setActivityModule] = useState('');
  const [activityLoaded, setActivityLoaded] = useState(false);

  const loadActivityLog = async () => {
    const [logs, users] = await Promise.all([usersApi.getActivity(), usersApi.getAll()]);
    const userMap: Record<number, User> = {};
    users.forEach(u => { if (u.id) userMap[u.id] = u; });
    setActivityLogs(logs.map(l => ({ ...l, username: userMap[l.userId]?.fullName || `#${l.userId}` })));
    setActivityLoaded(true);
  };

  // Lists tab state
  const [selectedList, setSelectedList] = useState<ListName>('incidentCategories');
  const [newListItem, setNewListItem] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const currentListItems = selectedList === 'incidentCategories' ? incidentCategories
    : selectedList === 'incidentSources' ? incidentSources
    : selectedList === 'systemCategories' ? systemCategories
    : selectedList === 'equipmentTypes' ? equipmentTypes
    : userRoles;

  useEffect(() => {
    settingsApi.getAll().then(map => {
      setSettings(map);
      setSlaForm({
        critical: map['sla_critical'] || '15',
        high: map['sla_high'] || '60',
        medium: map['sla_medium'] || '240',
        low: map['sla_low'] || '1440',
      });
      setSmtpForm({
        smtp_host: map['smtp_host'] || '',
        smtp_port: map['smtp_port'] || '587',
        smtp_user: map['smtp_user'] || '',
        smtp_password: map['smtp_password'] || '',
        smtp_from_address: map['smtp_from_address'] || '',
        smtp_from_name: map['smtp_from_name'] || 'SOC System',
        smtp_tls: map['smtp_tls'] || 'true',
        smtp_relay_url: map['smtp_relay_url'] || '',
      });
    });
    settingsApi.getTicker().then(msgs => setTickerMessages(msgs.sort((a, b) => a.order - b.order)));
    configApi.get().then(cfg => { setDbPath(cfg.db_path); setDbPathInput(cfg.db_path); }).catch(() => {});
  }, []);

  const saveSetting = async (key: string, value: string) => {
    await settingsApi.set(key, value);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveGeneral = async () => {
    await saveSetting('system_name', settings['system_name'] || 'מרכז פעולות סייבר');
    await saveSetting('ticker_speed', settings['ticker_speed'] || '40');
    await loadSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePublishBanner = async () => {
    if (!bannerForm.message) return;
    const now = new Date().toISOString();
    // Deactivate all active banners
    const existing = await settingsApi.getBanners();
    for (const b of existing.filter(b => b.isActive)) {
      await settingsApi.updateBanner(b.id!, { isActive: false });
    }
    await settingsApi.createBanner({
      message: bannerForm.message,
      severity: bannerForm.severity,
      expiresAt: bannerForm.expiresAt ? new Date(bannerForm.expiresAt).toISOString() : undefined,
      isActive: true,
      createdAt: now,
    });
    // Clear any existing dismiss so the new banner always shows
    localStorage.removeItem('banner_dismissed_until');
    localStorage.removeItem('banner_dismissed_id');
    await loadBanner();
    setBannerForm({ message: '', severity: 'high', expiresAt: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeactivateBanner = async () => {
    const existing = await settingsApi.getBanners();
    for (const b of existing.filter(b => b.isActive)) {
      await settingsApi.updateBanner(b.id!, { isActive: false });
    }
    await loadBanner();
  };

  const handleSaveSLA = async () => {
    for (const [k, v] of Object.entries(slaForm)) {
      await saveSetting(`sla_${k}`, v);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddTicker = async () => {
    if (!newTicker.content) return;
    const now = new Date().toISOString();
    const created = await settingsApi.addTicker({
      ...newTicker, order: tickerMessages.length + 1, isActive: true, createdAt: now,
    });
    setTickerMessages(prev => [...prev, created]);
    setNewTicker({ content: '', severity: 'info' });
    await loadTickerMessages();
  };

  const handleDeleteTicker = async (id: number) => {
    await settingsApi.deleteTicker(id);
    setTickerMessages(prev => prev.filter(m => m.id !== id));
    await loadTickerMessages();
  };

  const handleSaveSmtp = async () => {
    for (const [k, v] of Object.entries(smtpForm)) {
      await saveSetting(k, v);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestSmtp = async () => {
    setSmtpTestStatus('idle');
    if (smtpForm.smtp_relay_url) {
      try {
        const res = await fetch(smtpForm.smtp_relay_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true, smtp: smtpForm }),
        });
        setSmtpTestStatus(res.ok ? 'ok' : 'fail');
      } catch {
        setSmtpTestStatus('fail');
      }
    } else {
      // No relay — open mailto test
      window.location.href = `mailto:${smtpForm.smtp_from_address || ''}?subject=SOC+SMTP+Test&body=Test+email+from+SOC+system`;
      setSmtpTestStatus('ok');
    }
    setTimeout(() => setSmtpTestStatus('idle'), 4000);
  };

  const handleExportDB = async () => {
    const data: Record<string, any> = {};
    [data.incidents, data.tasks, data.systems, data.cves, data.users] = await Promise.all([
      incidentsApi.getAll(), tasksApi.getAll(), systemsApi.getAll(), cvesApi.getAll(), usersApi.getAll(),
    ]);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDbPath = async (copyDb = false) => {
    setDbPathStatus('idle');
    setDbPathError('');
    try {
      const result = copyDb
        ? await configApi.copyAndSetDbPath(dbPathInput)
        : await configApi.setDbPath(dbPathInput);
      setDbPath(result.db_path);
      setDbPathInput(result.db_path);
      setDbPathStatus('saved');
      setDbPathRestartNeeded(result.restartRequired);
      setTimeout(() => setDbPathStatus('idle'), 3000);
    } catch (e: any) {
      setDbPathStatus('error');
      setDbPathError(e.message || 'שגיאה בשמירה');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>הגדרות מערכת</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
          ניהול הגדרות ותצורת המערכת
        </p>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Tab Bar */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: activeTab === tab.id ? 'var(--bg-hover)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400,
                    textAlign: 'right', fontFamily: 'inherit',
                    borderLeft: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  }}>
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1 }}>
          {saved && (
            <div style={{ background: 'rgba(0,196,140,0.15)', border: '1px solid rgba(0,196,140,0.4)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--accent-success)', marginBottom: '16px' }}>
              ✓ הגדרות נשמרו בהצלחה
            </div>
          )}

          {activeTab === 'general' && (
            <Card title="הגדרות כלליות">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'שם המערכת', key: 'system_name', placeholder: 'מרכז פעולות סייבר' },
                  { label: 'שם הארגון', key: 'org_name', placeholder: 'ארגון' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>{f.label}</label>
                    <input value={settings[f.key] || ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    מהירות Ticker — {settings['ticker_speed'] || '120'} שניות
                    <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                      ({Number(settings['ticker_speed'] || 120) <= 60 ? 'מהיר' : Number(settings['ticker_speed'] || 120) <= 150 ? 'בינוני' : 'איטי'})
                    </span>
                  </label>
                  <input type="range" min="30" max="300" step="10" value={settings['ticker_speed'] || '120'}
                    onChange={e => setSettings(s => ({ ...s, ticker_speed: e.target.value }))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>מהיר (30s)</span>
                    <span>איטי מאד (300s)</span>
                  </div>
                </div>
                <Button variant="primary" onClick={handleSaveGeneral}>שמור</Button>
              </div>
            </Card>
          )}

          {activeTab === 'themes' && (
            <Card title="ערכות צבעים">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {THEMES.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                      background: theme === t.id ? 'var(--bg-hover)' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Preview */}
                    <div style={{ width: 48, height: 32, borderRadius: '6px', background: t.preview.bg, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 4, borderRadius: '2px', background: t.preview.accent }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{t.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                    {theme === t.id && <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>✓ פעיל</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'banner' && (
            <Card title="הודעה מתפרצת (Emergency Banner)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תוכן ההודעה</label>
                  <textarea value={bannerForm.message} onChange={e => setBannerForm(f => ({ ...f, message: e.target.value }))} rows={3}
                    placeholder="כתוב הודעה חירום לצוות..."
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>חומרה</label>
                    <select value={bannerForm.severity} onChange={e => setBannerForm(f => ({ ...f, severity: e.target.value as any }))}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
                      <option value="critical">קריטי</option>
                      <option value="high">גבוה</option>
                      <option value="medium">בינוני</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>תפוגה</label>
                    <input type="datetime-local" value={bannerForm.expiresAt} onChange={e => setBannerForm(f => ({ ...f, expiresAt: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="danger" icon={<Bell size={14} />} onClick={handlePublishBanner}>פרסם עכשיו</Button>
                  <Button variant="ghost" onClick={handleDeactivateBanner}>בטל באנר פעיל</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'ticker' && (
            <Card title="ניהול Ticker">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={newTicker.content} onChange={e => setNewTicker(t => ({ ...t, content: e.target.value }))}
                    placeholder="הוסף הודעה חדשה..."
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <select value={newTicker.severity} onChange={e => setNewTicker(t => ({ ...t, severity: e.target.value as any }))}
                    style={{ padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px' }}>
                    <option value="info">מידע</option>
                    <option value="medium">בינוני</option>
                    <option value="high">גבוה</option>
                    <option value="critical">קריטי</option>
                  </select>
                  <Button variant="primary" onClick={handleAddTicker}>הוסף</Button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {tickerMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{msg.content}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{msg.severity}</span>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteTicker(msg.id!)}>מחק</Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'sla' && (
            <Card title="הגדרות SLA">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { label: 'קריטי (דקות)', key: 'critical', color: 'var(--accent-danger)' },
                  { label: 'גבוה (דקות)', key: 'high', color: 'var(--accent-warning)' },
                  { label: 'בינוני (דקות)', key: 'medium', color: 'var(--accent-purple)' },
                  { label: 'נמוך (דקות)', key: 'low', color: 'var(--accent-success)' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>{f.label}</label>
                    <input type="number" value={(slaForm as any)[f.key]} onChange={e => setSlaForm(s => ({ ...s, [f.key]: e.target.value }))}
                      style={{ width: '100px', padding: '8px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '60px' }}>
                      {parseInt((slaForm as any)[f.key]) >= 60 ? `${Math.round(parseInt((slaForm as any)[f.key]) / 60)}ש` : `${(slaForm as any)[f.key]}ד`}
                    </span>
                  </div>
                ))}
                <Button variant="primary" onClick={handleSaveSLA}>שמור הגדרות SLA</Button>
              </div>
            </Card>
          )}

          {activeTab === 'lists' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* List selector tabs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {LIST_DEFS.map(def => (
                  <button key={def.key} onClick={() => { setSelectedList(def.key); setEditingItem(null); setNewListItem(''); }}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                      cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: selectedList === def.key ? 700 : 400,
                      background: selectedList === def.key ? 'var(--accent-primary)' : 'var(--bg-hover)',
                      color: selectedList === def.key ? '#000' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {def.label} ({
                      def.key === 'incidentCategories' ? incidentCategories.length
                      : def.key === 'incidentSources' ? incidentSources.length
                      : def.key === 'systemCategories' ? systemCategories.length
                      : equipmentTypes.length
                    })
                  </button>
                ))}
              </div>

              <Card title={LIST_DEFS.find(d => d.key === selectedList)?.label || ''} titleIcon={<List size={16} />}>
                {/* Add new item */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    value={newListItem}
                    onChange={e => setNewListItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newListItem.trim()) { addItem(selectedList, newListItem); setNewListItem(''); } }}
                    placeholder="הוסף ערך חדש..."
                    style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  />
                  <Button variant="primary" icon={<Plus size={14} />} onClick={() => { if (newListItem.trim()) { addItem(selectedList, newListItem); setNewListItem(''); } }}>
                    הוסף
                  </Button>
                </div>

                {/* Items list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {currentListItems.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
                      אין ערכים ברשימה
                    </div>
                  )}
                  {currentListItems.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {editingItem === item ? (
                        <>
                          <input
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { updateItem(selectedList, item, editValue); setEditingItem(null); } if (e.key === 'Escape') setEditingItem(null); }}
                            autoFocus
                            style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}
                          />
                          <button onClick={() => { updateItem(selectedList, item, editValue); setEditingItem(null); }}
                            style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Check size={14} color="white" />
                          </button>
                          <button onClick={() => setEditingItem(null)}
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <X size={14} color="var(--text-muted)" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{item}</span>
                          <button onClick={() => { setEditingItem(item); setEditValue(item); }}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => removeItem(selectedList, item)}
                            style={{ background: 'none', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--accent-danger)' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'playbooks' && (
            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Playbook list */}
              <div style={{ width: '220px', flexShrink: 0 }}>
                <Card>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Playbooks</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {playbooks.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>אין Playbooks</div>
                    )}
                    {playbooks.map(pb => (
                      <button key={pb.id} onClick={() => { setPbSelected(pb.id!); setPbAdding(false); setPbEditingId(null); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '9px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                          background: pbSelected === pb.id ? 'var(--bg-hover)' : 'transparent',
                          color: pbSelected === pb.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '13px', fontWeight: pbSelected === pb.id ? 600 : 400, textAlign: 'right', fontFamily: 'inherit',
                          borderLeft: pbSelected === pb.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        }}>
                        <BookOpen size={14} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pb.name}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Checklist editor */}
              <div style={{ flex: 1 }}>
                {!pbSelected ? (
                  <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                      <BookOpen size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                      בחר Playbook לעריכת ה-Checklist
                    </div>
                  </Card>
                ) : (
                  <Card title={playbooks.find(p => p.id === pbSelected)?.name || 'Checklist'} titleIcon={<BookOpen size={16} />}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      {playbooks.find(p => p.id === pbSelected)?.description || ''}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      {pbItems.length === 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0' }}>אין צעדים ב-Playbook זה.</div>
                      )}
                      {pbItems.map((item, idx) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                          <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.4 }} />
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', width: '20px', flexShrink: 0 }}>{String(idx + 1).padStart(2, '0')}</span>
                          {pbEditingId === item.id ? (
                            <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input value={pbEditDraft.item} onChange={e => setPbEditDraft(d => ({ ...d, item: e.target.value }))}
                                style={{ flex: 1, padding: '5px 8px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                              />
                              <select value={pbEditDraft.phase} onChange={e => setPbEditDraft(d => ({ ...d, phase: e.target.value }))}
                                style={{ padding: '5px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                              </select>
                              <button onClick={() => handlePbUpdateItem(item.id!)} style={{ background: 'var(--accent-success)', border: 'none', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#000' }}><Check size={12} /></button>
                              <button onClick={() => setPbEditingId(null)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={12} /></button>
                            </div>
                          ) : (
                            <>
                              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{item.item}</span>
                              {item.phase && (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>{item.phase}</span>
                              )}
                              <button onClick={() => { setPbEditingId(item.id!); setPbEditDraft({ item: item.item, phase: item.phase || 'כללי' }); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', opacity: 0.7 }}><Pencil size={13} /></button>
                              <button onClick={() => handlePbDeleteItem(item.id!)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-danger)', padding: '2px', opacity: 0.7 }}><Trash2 size={13} /></button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {pbAdding ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 12px' }}>
                        <input
                          value={pbNewItem.item}
                          onChange={e => setPbNewItem(f => ({ ...f, item: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handlePbAddItem()}
                          autoFocus
                          placeholder="תאר את הצעד..."
                          style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                        />
                        <select value={pbNewItem.phase} onChange={e => setPbNewItem(f => ({ ...f, phase: e.target.value }))}
                          style={{ padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {PHASES.map(ph => <option key={ph} value={ph}>{ph}</option>)}
                        </select>
                        <button onClick={handlePbAddItem} style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '12px', fontFamily: 'inherit' }}>הוסף</button>
                        <button onClick={() => setPbAdding(false)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setPbAdding(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', width: '100%', fontFamily: 'inherit' }}>
                        <Plus size={12} /> הוסף צעד ל-Checklist
                      </button>
                    )}
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select value={activityModule} onChange={e => setActivityModule(e.target.value)}
                  style={{ padding: '9px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <option value="">כל המודולים</option>
                  {Array.from(new Set(activityLogs.map(l => l.module))).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <Button variant="ghost" icon={<Filter size={14} />} onClick={loadActivityLog}>
                  {activityLoaded ? 'רענן' : 'טען לוג'}
                </Button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {activityLoaded ? `${activityLogs.filter(l => !activityModule || l.module === activityModule).length} רשומות` : ''}
                </span>
              </div>
              <Card noPadding>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['תאריך ושעה', 'משתמש', 'מודול', 'פעולה', 'פרטים'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {!activityLoaded && (
                        <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>לחץ "טען לוג" לצפייה בפעולות</td></tr>
                      )}
                      {activityLoaded && activityLogs.filter(l => !activityModule || l.module === activityModule).map((log, i) => (
                        <tr key={log.id ?? i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                            {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                          </td>
                          <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{log.username}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--accent-primary)', fontSize: '11px' }}>{log.module}</span>
                          </td>
                          <td style={{ padding: '9px 14px', color: 'var(--text-primary)' }}>{log.action}</td>
                          <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || '—'}</td>
                        </tr>
                      ))}
                      {activityLoaded && activityLogs.filter(l => !activityModule || l.module === activityModule).length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>אין רשומות</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'email' && (
            <Card title="הגדרות SMTP לשליחת מיילים" titleIcon={<Mail size={16} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {smtpTestStatus !== 'idle' && (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                    background: smtpTestStatus === 'ok' ? 'rgba(0,196,140,0.12)' : 'rgba(255,59,92,0.12)',
                    color: smtpTestStatus === 'ok' ? 'var(--accent-success)' : 'var(--accent-danger)',
                    border: `1px solid ${smtpTestStatus === 'ok' ? 'rgba(0,196,140,0.35)' : 'rgba(255,59,92,0.35)'}`,
                  }}>
                    {smtpTestStatus === 'ok' ? '✓ חיבור תקין / לקוח מייל נפתח' : '✗ חיבור נכשל — בדוק את פרטי ה-Relay'}
                  </div>
                )}

                <div style={{ padding: '12px 14px', background: 'rgba(0,212,255,0.06)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', border: '1px solid rgba(0,212,255,0.15)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>כיצד זה עובד:</strong><br />
                  אם מוגדר <em>SMTP Relay URL</em> — המערכת תשלח POST לשרת הרלאי המקומי שלך (Node.js/Python) שיטפל בשליחה ב-SMTP.<br />
                  אם לא מוגדר — לחיצה על "שלח מייל" תפתח את לקוח המייל של מערכת ההפעלה (mailto:).
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שרת SMTP (Host)</label>
                    <input
                      value={smtpForm.smtp_host}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_host: e.target.value }))}
                      placeholder="smtp.company.local"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>פורט</label>
                    <input
                      value={smtpForm.smtp_port}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_port: e.target.value }))}
                      placeholder="587"
                      type="number"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שם משתמש (SMTP)</label>
                    <input
                      value={smtpForm.smtp_user}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_user: e.target.value }))}
                      placeholder="soc@company.com"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>סיסמה</label>
                    <input
                      value={smtpForm.smtp_password}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_password: e.target.value }))}
                      type={showSmtpPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '9px 36px 9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={() => setShowSmtpPw(v => !v)}
                      style={{ position: 'absolute', left: '10px', top: '34px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                    >
                      {showSmtpPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>שם שולח (From Name)</label>
                    <input
                      value={smtpForm.smtp_from_name}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_from_name: e.target.value }))}
                      placeholder="מרכז פעולות סייבר"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>כתובת שולח (From Address)</label>
                    <input
                      value={smtpForm.smtp_from_address}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_from_address: e.target.value }))}
                      placeholder="soc@company.com"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={smtpForm.smtp_tls === 'true'}
                      onChange={e => setSmtpForm(f => ({ ...f, smtp_tls: e.target.checked ? 'true' : 'false' }))}
                      style={{ accentColor: 'var(--accent-primary)', width: '14px', height: '14px' }}
                    />
                    הפעל TLS / STARTTLS
                  </label>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                    SMTP Relay URL (שרת מקומי לשליחה)
                    <span style={{ color: 'var(--text-muted)', marginRight: '6px', fontWeight: 400 }}>אופציונלי</span>
                  </label>
                  <input
                    value={smtpForm.smtp_relay_url}
                    onChange={e => setSmtpForm(f => ({ ...f, smtp_relay_url: e.target.value }))}
                    placeholder="http://localhost:3001/send-email"
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    שרת Node.js/Python מקומי שמקבל POST ושולח ב-SMTP. אם ריק — יפתח לקוח המייל של המערכת (mailto:).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button variant="ghost" onClick={handleTestSmtp} icon={<Mail size={14} />}>
                    בדיקת חיבור
                  </Button>
                  <Button variant="primary" onClick={handleSaveSmtp} icon={<Check size={14} />}>
                    שמור הגדרות מייל
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card title="מיקום מסד הנתונים">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>נתיב נוכחי: </span>
                    <span style={{ fontFamily: 'monospace', direction: 'ltr', display: 'inline-block' }}>{dbPath || '...'}</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      נתיב חדש לקובץ ה-DB
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <FolderOpen size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      <input
                        value={dbPathInput}
                        onChange={e => setDbPathInput(e.target.value)}
                        placeholder="C:\SQL_DB\Cyber-Management-main\soc.db"
                        dir="ltr"
                        style={{
                          flex: 1, padding: '8px 12px', background: 'var(--bg-hover)',
                          border: '1px solid var(--border)', borderRadius: '6px',
                          color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button
                      variant="primary"
                      icon={<Check size={14} />}
                      onClick={() => handleSaveDbPath(false)}
                      disabled={dbPathInput === dbPath || !dbPathInput.trim()}
                    >
                      שמור נתיב
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<Copy size={14} />}
                      onClick={() => handleSaveDbPath(true)}
                      disabled={dbPathInput === dbPath || !dbPathInput.trim()}
                    >
                      העתק DB לנתיב החדש ושמור
                    </Button>
                  </div>

                  {dbPathStatus === 'saved' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '8px', fontSize: '13px', color: '#00c864' }}>
                      <Check size={14} />
                      הנתיב נשמר בהצלחה
                    </div>
                  )}
                  {dbPathStatus === 'error' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: '8px', fontSize: '13px', color: '#ff5050' }}>
                      <X size={14} />
                      {dbPathError}
                    </div>
                  )}
                  {dbPathRestartNeeded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: '8px', fontSize: '13px', color: '#ffaa00' }}>
                      <AlertTriangle size={14} />
                      <span>יש להפעיל מחדש את השרת כדי שהשינוי ייכנס לתוקף</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="גיבוי ונתונים">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-hover)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    ייצוא הנתונים כולל: אירועים, משימות, מערכות, CVEs, ומשתמשים בפורמט JSON.
                  </div>
                  <Button variant="primary" icon={<Database size={14} />} onClick={handleExportDB}>
                    ייצוא נתונים (JSON)
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
