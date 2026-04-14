import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { supabase } from './lib/supabase';
import ExcelImport, { downloadTemplate, TEMPLATES } from './ExcelImport';
import { FORM_MAP } from './QuestionForms';
import { logAction } from './adminLogger';
import { exportQuestions } from './ExcelExport';
import {
  LayoutDashboard, BookOpen, Edit, Trash2, Plus, Activity, Landmark,
  BookText, Calculator, Globe, Microscope, Earth, FlaskConical, Zap,
  ChevronRight, ArrowLeft, Layers, FolderOpen, FileQuestion, LogOut,
  Save, X, Check, Link, Upload, Download, Trophy, ShieldAlert, ShieldCheck, Eye, ArrowRightLeft, Loader2,
  Key, RefreshCw, Copy, Lock, Headset, Users, UserPlus, Radio,
  CreditCard, TrendingUp, Calendar, Settings, MessageSquare, ScrollText,
  Inbox, Bug, Lightbulb, MoreHorizontal, Ban, Filter,
  ChevronLeft, CheckCircle2, Image as ImageIcon
} from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ══════════════════════════════════════════════════════════════════════════
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }
/** superadmin and moderator can edit; analyst and support are read-only */
function useCanEdit() { const { user } = useAuth(); return user?.role === 'superadmin' || user?.role === 'moderator'; }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      supabase.from('admin_sessions').select('*, admin_users(*)').eq('token', token).gt('expires_at', new Date().toISOString()).single()
        .then(({ data }) => { if (data?.admin_users) setUser(data.admin_users); setLoading(false); })
        .catch(() => { localStorage.removeItem('admin_token'); setLoading(false); });
    } else setLoading(false);
  }, []);

  async function login(email, password) {
    const { data: u } = await supabase.from('admin_users').select('*').eq('email', email).eq('password_hash', password).eq('status', 'active').single();
    if (!u) throw new Error('Невірний email або пароль');
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await supabase.from('admin_sessions').insert({ user_id: u.id, token, expires_at: expires });
    await supabase.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', u.id);
    localStorage.setItem('admin_token', token);
    setUser(u);
    logAction(u, 'login', 'session', null, { email: u.email });
  }

  function logout() { if (user) logAction(user, 'logout', 'session', null, { email: user.email }); localStorage.removeItem('admin_token'); setUser(null); }

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner /></div>;
  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

// ══════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════
const SUBJECTS = [
  { id: 'history_ua', name: 'Історія України', icon: Landmark },
  { id: 'ukr', name: 'Українська мова', icon: BookText },
  { id: 'math', name: 'Математика', icon: Calculator },
  { id: 'eng', name: 'Англійська мова', icon: Globe },
  { id: 'bio', name: 'Біологія', icon: Microscope },
  { id: 'geo', name: 'Географія', icon: Earth },
  { id: 'chem', name: 'Хімія', icon: FlaskConical },
  { id: 'phys', name: 'Фізика', icon: Zap },
];

const FORMATS = [
  { id: 'express', name: 'Експрес', desc: 'Бібліотека усіх питань', table: 'questions' },
  { id: 'thematic', name: 'Тематичний', desc: 'Питання за темами', table: 'questions' },
  { id: 'pairs', name: 'Логічні пари', desc: 'Встановлення відповідності', table: 'logical_pairs_questions' },
  { id: 'blitz', name: 'Бліц так/ні', desc: 'Швидкі питання з двома варіантами', table: 'blitz_questions' },
  { id: 'gallery', name: 'Галерея', desc: 'Питання на основі зображень', table: 'gallery_questions' },
  { id: 'sevens', name: 'Сімки (3 з 7)', desc: 'Вибір 3 правильних із 7', table: 'seven_questions' },
  { id: 'exam', name: 'Іспит на максимум', desc: 'Комбіновані питання у папках', table: 'exam_questions', isExam: true },
  { id: 'library', name: 'Бібліотека', desc: 'Усі питання — менеджмент та розподіл по темах', table: null, isLibrary: true },
];

// ══════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD
// ══════════════════════════════════════════════════════════════════════════
function ImageField({ value, onChange }) {
  const [mode, setMode] = useState(value ? 'url' : 'none');
  const fileRef = useRef();
  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const path = `questions/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
    if (error) { alert('Помилка: ' + error.message); return; }
    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
    onChange(data.publicUrl); setMode('url');
  }
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">Зображення</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('url')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'url' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><Link size={14} /> URL</button>
        <button type="button" onClick={() => { setMode('upload'); fileRef.current?.click(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500"><Upload size={14} /> Файл</button>
        {value && <button type="button" onClick={() => { onChange(''); setMode('none'); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600">Видалити</button>}
      </div>
      {mode === 'url' && <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..." className="inp w-full" />}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && <img src={value} alt="" className="h-24 rounded-lg object-cover border" onError={e => e.target.style.display = 'none'} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}

function AppInner() {
  const { user, logout } = useAuth();
  if (!user) return <LoginScreen />;
  window.__adminUser = user; // expose for QuestionForms logging

  const [activeMenu, setActiveMenu] = useState('subjects');
  const canSeeUsers = user.role === 'superadmin';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
        <div className="p-6"><h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NMT Admin</h1></div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Дашборд" active={activeMenu === 'dashboard'} onClick={() => setActiveMenu('dashboard')} />
          <SidebarItem icon={<BookOpen size={20} />} label="Предмети" active={activeMenu === 'subjects'} onClick={() => setActiveMenu('subjects')} />
          {canSeeUsers && <SidebarItem icon={<ShieldCheck size={20} />} label="Користувачі (Адмін)" active={activeMenu === 'users'} onClick={() => setActiveMenu('users')} />}
          {(user.role === 'superadmin' || user.role === 'support') && <SidebarItem icon={<MessageSquare size={20} />} label="Запити користувачів" active={activeMenu === 'requests'} onClick={() => setActiveMenu('requests')} />}
          {user.role === 'superadmin' && <SidebarItem icon={<ScrollText size={20} />} label="Логі" active={activeMenu === 'logs'} onClick={() => setActiveMenu('logs')} />}
          <SidebarItem icon={<Settings size={20} />} label="Налаштування" active={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} />
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="px-4 py-2 text-xs text-slate-500 truncate">{user.name} <RoleBadge role={user.role} /></div>
          <button onClick={logout} className="group flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-medium"><LogOut size={20} className="text-slate-400 group-hover:text-rose-600" /><span>Вийти</span></button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <h2 className="text-xl font-semibold">
            {activeMenu === 'dashboard' && 'Огляд та Аналітика'}
            {activeMenu === 'subjects' && 'Управління контентом'}
            {activeMenu === 'users' && 'Керування доступом'}
            {activeMenu === 'requests' && 'Служба підтримки'}
            {activeMenu === 'logs' && 'Логі дій адміністрації'}
            {activeMenu === 'settings' && 'Налаштування'}
          </h2>
          <div className="flex items-center gap-3">
            {canSeeUsers && <PublishButton user={user} />}
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">{user.name?.[0] || 'А'}</div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8 bg-slate-50"><div className="max-w-7xl mx-auto">
          {activeMenu === 'dashboard' && <DashboardView />}
          {activeMenu === 'subjects' && <SubjectsView user={user} />}
          {activeMenu === 'users' && canSeeUsers && <UsersAdminView />}
          {activeMenu === 'requests' && <SupportRequestsView />}
          {activeMenu === 'logs' && user.role === 'superadmin' && <AdminLogsView />}
          {activeMenu === 'settings' && <Empty text="Налаштування у розробці" />}
        </div></div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════
function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NMT Admin</h1>
          <p className="text-slate-500 mt-2">Увійдіть в систему адміністрування</p>
        </div>
        {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="inp w-full" placeholder="admin@nmt.edu" required /></div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Пароль</label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="inp w-full pr-12" placeholder="••••••••" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
              <Eye size={18} />
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
          {loading ? 'Вхід...' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD (with real stats)
// ══════════════════════════════════════════════════════════════════════════
function DashboardView() {
  const [s, setS] = useState({});
  useEffect(() => {
    Promise.all([
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('topics').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('blitz_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('logical_pairs_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('gallery_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('seven_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('exam_questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]).then(([q, t, b, p, g, sv, e, au]) => setS({
      q: q.count || 0, t: t.count || 0, b: b.count || 0, p: p.count || 0,
      g: g.count || 0, s: sv.count || 0, e: e.count || 0, admins: au.count || 0,
    }));
  }, []);
  const total = (s.q || 0) + (s.b || 0) + (s.p || 0) + (s.g || 0) + (s.s || 0) + (s.e || 0);
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-slate-700">Ключові показники</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileQuestion />} label="Всього питань" value={total} color="blue" />
        <StatCard icon={<FolderOpen />} label="Тем" value={s.t || 0} color="emerald" />
        <StatCard icon={<Users />} label="Адмінів" value={s.admins || 0} color="indigo" />
        <StatCard icon={<Activity />} label="Статус БД" value="Online" color="emerald" isLive />
      </div>
      <h3 className="text-lg font-medium text-slate-700">По форматах</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MiniStat label="Експрес" value={s.q || 0} />
        <MiniStat label="Бліц" value={s.b || 0} />
        <MiniStat label="Пари" value={s.p || 0} />
        <MiniStat label="Галерея" value={s.g || 0} />
        <MiniStat label="Сімки" value={s.s || 0} />
        <MiniStat label="Іспит" value={s.e || 0} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center"><div className="text-2xl font-bold text-slate-800">{value}</div><div className="text-xs text-slate-500 mt-1">{label}</div></div>;
}

// ══════════════════════════════════════════════════════════════════════════
// USERS ADMINISTRATION (Supabase-backed)
// ══════════════════════════════════════════════════════════════════════════
function UsersAdminView() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [editUser, setEditUser] = useState(null);

  async function load() { setLoading(true); const { data } = await supabase.from('admin_users').select('*').order('created_at'); setAdmins(data || []); setLoading(false); }
  useEffect(() => { load(); }, []);

  if (view === 'form') return <UserForm user={editUser} onBack={() => { setView('list'); setEditUser(null); load(); }} />;
  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="text-xl font-bold text-slate-800">Команда проекту</h3><p className="text-sm text-slate-500 mt-1">Керування доступами та ролями</p></div>
        <Btn onClick={() => { setEditUser(null); setView('form'); }}><Plus size={18} /> Додати користувача</Btn>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr><th className="px-6 py-4 font-medium">Користувач</th><th className="px-6 py-4 font-medium">Роль</th><th className="px-6 py-4 font-medium">Доступ</th><th className="px-6 py-4 font-medium">Статус</th><th className="px-6 py-4 font-medium text-right">Дії</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {admins.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/80 group">
                <td className="px-6 py-4"><div className="font-medium text-slate-800">{a.name}</div><div className="text-slate-500 text-xs mt-0.5">{a.email}</div></td>
                <td className="px-6 py-4"><RoleBadge role={a.role} /></td>
                <td className="px-6 py-4"><AccessDesc role={a.role} subjects={a.allowed_subjects} formats={a.allowed_formats} /></td>
                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium border flex w-max items-center gap-1.5 ${a.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}><span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />{a.status === 'active' ? 'Активний' : 'Неактивний'}</span></td>
                <td className="px-6 py-4 flex justify-end gap-2">
                  <Abtn icon={<Edit size={16} />} onClick={() => { setEditUser(a); setView('form'); }} />
                  <Abtn icon={<Trash2 size={16} />} danger onClick={async () => { if (!confirm('Видалити?')) return; await supabase.from('admin_users').delete().eq('id', a.id); logAction(window.__adminUser, 'delete', 'admin_user', a.id, { name: a.name, email: a.email }); load(); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const m = { superadmin: ['bg-purple-50 text-purple-700', ShieldAlert, 'Супер адмін'], moderator: ['bg-blue-50 text-blue-700', Edit, 'Модератор'], analyst: ['bg-slate-100 text-slate-600', Eye, 'Аналітик'], support: ['bg-teal-50 text-teal-700', Headset, 'Підтримка'] };
  const [cls, Icon, label] = m[role] || m.moderator;
  return <span className={`px-3 py-1 rounded-lg font-semibold text-xs flex items-center gap-1.5 w-max ${cls}`}><Icon size={14} /> {label}</span>;
}

function AccessDesc({ role, subjects, formats }) {
  if (role === 'superadmin') return <span className="text-purple-600 font-medium text-xs">Повний доступ</span>;
  if (role === 'analyst') return <span className="text-slate-500 text-xs">Тільки перегляд</span>;
  if (role === 'support') return <span className="text-teal-600 text-xs">Звернення користувачів</span>;
  return <div className="flex flex-col gap-0.5"><span className="text-xs">Предметів: <strong className="text-blue-600">{subjects?.length || 0}</strong></span><span className="text-xs">Форматів: <strong className="text-blue-600">{formats?.length || 0}</strong></span></div>;
}

// ── USER CREATE / EDIT FORM ──
function UserForm({ user, onBack }) {
  const isNew = !user;
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'moderator');
  const [status, setStatus] = useState(user?.status || 'active');
  const [pwd, setPwd] = useState('');
  const [subjects, setSubjects] = useState(user?.allowed_subjects || []);
  const [formats, setFormats] = useState(user?.allowed_formats || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (isNew) genPwd(); }, []);
  function genPwd() { const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%"; let p = ""; for (let i = 0; i < 10; i++) p += c[Math.floor(Math.random() * c.length)]; setPwd(p); }
  function toggleSubj(id) { setSubjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }
  function toggleFmt(id) { setFormats(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]); }

  async function handleSave() {
    setSaving(true);
    const payload = { name, email, role, status, allowed_subjects: subjects, allowed_formats: formats };
    if (isNew) { payload.password_hash = pwd; await supabase.from('admin_users').insert(payload); }
    else { if (pwd) payload.password_hash = pwd; await supabase.from('admin_users').update(payload).eq('id', user.id); }
    logAction(window.__adminUser, isNew ? 'create' : 'update', 'admin_user', null, { name, email, role });
    setSaving(false); onBack();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></button>
        <div><h2 className="text-2xl font-bold text-slate-800">{isNew ? 'Новий користувач' : 'Редагування'}</h2><p className="text-slate-500 text-sm mt-1">Профіль та права доступу</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT: Profile + Password */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">ПІБ</label><input value={name} onChange={e => setName(e.target.value)} className="inp w-full" placeholder="Іван Іванов" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email (Логін)</label><input value={email} onChange={e => setEmail(e.target.value)} className="inp w-full" placeholder="email@nmt.edu" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Статус</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="inp w-full"><option value="active">Активний</option><option value="inactive">Неактивний</option></select></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold"><Key size={18} className="text-amber-500" /> Пароль</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative"><input type="text" readOnly value={pwd || '********'} className="inp w-full font-mono tracking-wider" />
                {pwd && <button onClick={() => navigator.clipboard.writeText(pwd)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600"><Copy size={16} /></button>}
              </div>
            </div>
            <button onClick={genPwd} className="flex items-center justify-center gap-2 w-full py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-sm font-medium"><RefreshCw size={16} /> Згенерувати новий</button>
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100"><Lock size={14} className="shrink-0 text-slate-400 mt-0.5" /><span>Користувач зможе замінити пароль після першої авторизації.</span></div>
          </div>
        </div>

        {/* RIGHT: Role + Permissions */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Роль</h3>
            <div className="space-y-3">
              {[
                ['superadmin', ShieldAlert, 'text-purple-600', 'border-purple-200 bg-purple-50/50', 'Супер адмін', 'Повний контроль над системою'],
                ['moderator', Edit, 'text-blue-600', 'border-blue-200 bg-blue-50/50', 'Модератор', 'Додає та редагує контент в дозволених предметах'],
                ['analyst', Eye, 'text-slate-600', 'border-slate-200 bg-slate-50/50', 'Аналітик', 'Перегляд статистики без редагування'],
                ['support', Headset, 'text-teal-600', 'border-teal-200 bg-teal-50/50', 'Підтримка', 'Доступ до звернень користувачів'],
              ].map(([id, Icon, ic, ac, title, desc]) => (
                <label key={id} className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${role === id ? ac + ' ring-1 ring-offset-1 ring-blue-500/30' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <input type="radio" name="role" value={id} checked={role === id} onChange={() => setRole(id)} className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div><div className="flex items-center gap-2 mb-1"><Icon size={18} className={ic} /><span className="font-semibold text-slate-800">{title}</span></div><p className="text-sm text-slate-500">{desc}</p></div>
                </label>
              ))}
            </div>
          </div>

          {role === 'moderator' && (
            <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6"><ShieldCheck size={20} className="text-blue-600" /><h3 className="text-lg font-semibold text-slate-800">Права модератора</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><h4 className="text-sm font-medium text-slate-700 mb-3 border-b pb-2">Предмети</h4>
                  {SUBJECTS.map(s => { const I = s.icon; return (
                    <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={subjects.includes(s.id)} onChange={() => toggleSubj(s.id)} className="w-4 h-4 text-blue-600 rounded" />
                      <I size={16} className="text-slate-400" /><span className="text-sm">{s.name}</span>
                    </label>);
                  })}
                </div>
                <div><h4 className="text-sm font-medium text-slate-700 mb-3 border-b pb-2">Формати</h4>
                  {FORMATS.filter(f => !f.isExam).map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={formats.includes(f.id)} onChange={() => toggleFmt(f.id)} className="w-4 h-4 text-blue-600 rounded" />
                      <span className="text-sm font-medium">{f.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onBack} className="px-6 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">Скасувати</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50">{saving ? 'Збереження...' : 'Зберегти'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SUBJECTS VIEW (same as before, imports from existing code)
// ══════════════════════════════════════════════════════════════════════════
function SubjectsView({ user }) {
  const [sid, setSid] = useState(SUBJECTS[0].id);
  // Filter subjects for moderators
  const visibleSubjects = user.role === 'moderator' && user.allowed_subjects?.length
    ? SUBJECTS.filter(s => user.allowed_subjects.includes(s.id))
    : SUBJECTS;

  useEffect(() => { if (visibleSubjects.length && !visibleSubjects.find(s => s.id === sid)) setSid(visibleSubjects[0].id); }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto gap-2">
        {visibleSubjects.map(s => { const I = s.icon; const a = sid === s.id; return (
          <button key={s.id} onClick={() => setSid(s.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${a ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <I size={18} className={a ? 'text-blue-600' : 'text-slate-400'} />{s.name}</button>);
        })}
      </div>
      <DrillDown subject={SUBJECTS.find(s => s.id === sid) || SUBJECTS[0]} user={user} />
    </div>
  );
}

function DrillDown({ subject, user }) {
  const [fmt, setFmt] = useState(null);
  const [topic, setTopic] = useState(null);
  const [folder, setFolder] = useState(null);
  useEffect(() => { setFmt(null); setTopic(null); setFolder(null); }, [subject.id]);
  const SI = subject.icon;

  // Filter formats for moderators
  const visibleFormats = user.role === 'moderator' && user.allowed_formats?.length
    ? FORMATS.filter(f => user.allowed_formats.includes(f.id))
    : FORMATS;

  const level = !fmt ? 'formats' : fmt.isLibrary ? 'library' : fmt.id === 'express' ? 'express-all' : fmt.isExam ? (folder ? 'exam-questions' : 'exam-folders') : (!topic ? 'topics' : 'questions');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4 gap-1">
          <button onClick={() => { setFmt(null); setTopic(null); setFolder(null); }} className={!fmt ? 'text-blue-600' : 'hover:text-blue-600'}><span className="flex items-center gap-1"><SI size={16} />{subject.name}</span></button>
          {fmt && <><ChevronRight size={16} className="text-slate-300" /><button onClick={() => { setTopic(null); setFolder(null); }} className={!topic && !folder ? 'text-blue-600' : 'hover:text-blue-600'}>{fmt.name}</button></>}
          {topic && <><ChevronRight size={16} className="text-slate-300" /><span className="text-blue-600">{topic.name}</span></>}
          {folder && <><ChevronRight size={16} className="text-slate-300" /><span className="text-blue-600">{folder.name}</span></>}
        </div>
        <div className="flex items-center gap-4">
          {(fmt || topic || folder) && <button onClick={() => { if (topic) setTopic(null); else if (folder) setFolder(null); else setFmt(null); }} className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></button>}
          <h2 className="text-2xl font-bold text-slate-800 flex-1">
            {level === 'formats' && 'Оберіть формат'}{level === 'topics' && 'Оберіть тему'}{level === 'questions' && 'База питань'}{level === 'express-all' && 'Експрес — усі питання'}{level === 'library' && 'Бібліотека питань'}{level === 'exam-folders' && 'Папки іспиту'}{level === 'exam-questions' && 'Питання іспиту'}
          </h2>
          {level === 'formats' && <ExportDialog subjectId={subject.id} />}
        </div>
      </div>
      <div className="p-6 flex-1 bg-slate-50/50">
        {level === 'formats' && <FormatsGrid subjectId={subject.id} formats={visibleFormats} onSelect={setFmt} />}
        {level === 'library' && <LibraryView sid={subject.id} />}
        {level === 'express-all' && <ExpressAllView sid={subject.id} />}
        {level === 'topics' && <TopicsTable subjectId={subject.id} formatTable={fmt.table} onSelect={setTopic} />}
        {level === 'questions' && fmt.id === 'pairs' && <GenericTable sid={subject.id} tag={topic.tag} table="logical_pairs_questions" textKey="instruction" />}
        {level === 'questions' && fmt.id === 'blitz' && <GenericTable sid={subject.id} tag={topic.tag} table="blitz_questions" textKey="text" />}
        {level === 'questions' && fmt.id === 'gallery' && <GenericTable sid={subject.id} tag={topic.tag} table="gallery_questions" textKey="question_text" />}
        {level === 'questions' && fmt.id === 'sevens' && <GenericTable sid={subject.id} tag={topic.tag} table="seven_questions" textKey="text" />}
        {level === 'questions' && (fmt.id === 'express' || fmt.id === 'thematic') && <GenericTable sid={subject.id} tag={topic.tag} table="questions" textKey="question_text" />}
        {level === 'exam-folders' && <ExamFoldersView sid={subject.id} onSelect={setFolder} />}
        {level === 'exam-questions' && <ExamBuilderView sid={subject.id} folderId={folder.id} folderName={folder.name} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// FORMATS GRID
// ══════════════════════════════════════════════════════════════════════════
function FormatsGrid({ subjectId, formats, onSelect }) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    // Count questions per format table
    const allTables = ['questions', 'blitz_questions', 'logical_pairs_questions', 'gallery_questions', 'seven_questions'];
    Promise.all([
      // Individual format counts
      ...formats.filter(f => f.table && !f.isExam).map(async f => {
        const { count } = await supabase.from(f.table).select('*', { count: 'exact', head: true }).eq('subject_id', subjectId).eq('is_active', true);
        return [f.id, count || 0];
      }),
      // Express + Library = sum of ALL tables (except exam)
      (async () => {
        const results = await Promise.all(allTables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }).eq('subject_id', subjectId).eq('is_active', true)));
        const total = results.reduce((sum, r) => sum + (r.count || 0), 0);
        return ['express', total];
      })(),
      (async () => {
        const results = await Promise.all(allTables.map(t => supabase.from(t).select('*', { count: 'exact', head: true }).eq('subject_id', subjectId).eq('is_active', true)));
        return ['library', results.reduce((sum, r) => sum + (r.count || 0), 0)];
      })(),
      // Exam
      ...formats.filter(f => f.isExam).map(async f => {
        const { count } = await supabase.from(f.table).select('*', { count: 'exact', head: true }).eq('subject_id', subjectId).eq('is_active', true);
        return [f.id, count || 0];
      }),
    ]).then(entries => setCounts(Object.fromEntries(entries)));
  }, [subjectId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {formats.map(f => (
        <div key={f.id} onClick={() => onSelect(f)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-xl transition-colors ${f.isLibrary ? 'bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white' : f.isExam ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-blue-600 group-hover:text-white'}`}>{f.isLibrary ? <FolderOpen size={24} /> : f.isExam ? <Trophy size={24} /> : <Layers size={24} />}</div>
            <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg group-hover:text-blue-700 mb-1">{f.name}</h3>
          <p className="text-sm text-slate-500 mb-4">{f.desc}</p>
          <div className="pt-3 border-t border-slate-50 mt-auto flex items-center gap-1.5"><FileQuestion size={14} className="text-slate-400" /><span className="text-sm text-slate-500">Питань: <strong>{counts[f.id] ?? '...'}</strong></span></div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOPICS TABLE (with CRUD)
// ══════════════════════════════════════════════════════════════════════════
function TopicsTable({ subjectId, formatTable, onSelect }) {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const [topics, setTopics] = useState([]); const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false); const [editId, setEditId] = useState(null);
  const [bulkRows, setBulkRows] = useState([{ name: '', tag: '', tagEdited: false }]);

  async function load() { setLoading(true);
    const { data: t } = await supabase.from('topics').select('*').eq('subject_id', subjectId).eq('is_active', true).order('sort_order');
    const { data: q } = await supabase.from(formatTable).select('topic_tag').eq('subject_id', subjectId).eq('is_active', true);
    const c = {}; (q || []).forEach(r => { c[r.topic_tag] = (c[r.topic_tag] || 0) + 1; });
    setTopics((t || []).map(tp => ({ ...tp, cnt: c[tp.tag] || 0 }))); setLoading(false);
  }
  useEffect(() => { load(); }, [subjectId, formatTable]);

  function slug(s) { return s.toLowerCase().replace(/[іїєґ]/g, c => ({ і: 'i', ї: 'yi', є: 'ye', ґ: 'g' }[c] || c)).replace(/[а-яё]/g, c => { const m = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'; const l = 'abvgdezhziyklmnoprstufkhtschchshschyyyeyuya'.match(/.{1,2}/g) || []; const i = m.indexOf(c); return i >= 0 ? (l[i] || '') : c; }).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
  function updateBulkRow(i, field, value) {
    setBulkRows(prev => prev.map((r, idx) => idx !== i ? r : field === 'name' ? { ...r, name: value, tag: r.tagEdited ? r.tag : slug(value) } : { ...r, tag: value, tagEdited: true }));
  }
  function addBulkRow() { if (bulkRows.length < 30) setBulkRows(prev => [...prev, { name: '', tag: '', tagEdited: false }]); }
  function removeBulkRow(i) { setBulkRows(prev => prev.length <= 1 ? [{ name: '', tag: '', tagEdited: false }] : prev.filter((_, idx) => idx !== i)); }
  async function addTopic(e) { e.preventDefault();
    const valid = bulkRows.filter(r => r.name.trim());
    if (!valid.length) return;
    const rows = valid.map((r, i) => ({ name: r.name.trim(), tag: r.tag.trim() || slug(r.name.trim()), subject_id: subjectId, sort_order: topics.length + i, is_active: true }));
    await supabase.from('topics').insert(rows);
    for (const r of rows) logAction(user, 'create', 'topic', null, { name: r.name });
    setBulkRows([{ name: '', tag: '', tagEdited: false }]); setShowAdd(false); load();
  }
  async function renameTopic(id, name) { await supabase.from('topics').update({ name }).eq('id', id); logAction(user, 'update', 'topic', id, { name }); setEditId(null); load(); }

  const [showImport, setShowImport] = useState(false);
  const hasTemplate = !!TEMPLATES[formatTable];

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Тем: <strong>{topics.length}</strong></span>
        <div className="flex gap-2">
          <button onClick={() => exportQuestions(subjectId, null, null)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-200"><Download size={14} /> Експорт всіх</button>
          {canEdit && hasTemplate && <>
            <button onClick={() => downloadTemplate(formatTable)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"><Download size={14} /> Шаблон .xlsx</button>
            <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"><Upload size={14} /> Імпорт з Excel</button>
          </>}
          {canEdit && <Btn onClick={() => setShowAdd(!showAdd)}><Plus size={16} /> Додати тему</Btn>}
        </div>
      </div>
      {showImport && canEdit && <ExcelImport formatTable={formatTable} subjectId={subjectId} onImported={() => { setShowImport(false); load(); }} />}
      {showAdd && canEdit && <form onSubmit={addTopic} className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-slate-600">Додати теми <span className="text-slate-400 font-normal">(до 30)</span></label>
          <div className="flex gap-2">
            {bulkRows.length < 30 && <button type="button" onClick={addBulkRow} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-1"><Plus size={14} /> Ще рядок</button>}
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 text-sm font-medium"><Check size={16} /> Додати {bulkRows.filter(r => r.name.trim()).length}</button>
            <button type="button" onClick={() => { setShowAdd(false); setBulkRows([{ name: '', tag: '', tagEdited: false }]); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
          </div>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          <div className="flex gap-3 text-xs font-medium text-slate-400 px-1"><span className="flex-1">Назва</span><span className="w-48">Тег</span><span className="w-8"></span></div>
          {bulkRows.map((r, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input value={r.name} onChange={e => updateBulkRow(i, 'name', e.target.value)} className="inp flex-1" placeholder={`Тема ${i + 1}`} />
              <input value={r.tag || (r.name ? slug(r.name) : '')} onChange={e => updateBulkRow(i, 'tag', e.target.value)} className="inp w-48 font-mono text-xs text-slate-500" placeholder="auto" />
              <button type="button" onClick={() => removeBulkRow(i)} className="text-slate-300 hover:text-red-500 w-8 flex justify-center"><X size={16} /></button>
            </div>
          ))}
        </div>
      </form>}
      {!topics.length && !showAdd ? <Empty text="Додайте першу тему" /> :
        <Table heads={['#', 'Тема', 'Тег', 'Питань', '']}>
          {topics.map(tp => (
            <tr key={tp.id} className="hover:bg-slate-50/80 group">
              <td className="px-6 py-4 text-slate-400 text-xs">{tp.sort_order}</td>
              <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3"><FolderOpen size={18} className="text-slate-400" />
                {editId === tp.id ? <form onSubmit={e => { e.preventDefault(); renameTopic(tp.id, e.target.elements.n.value); }} className="flex gap-2"><input name="n" defaultValue={tp.name} className="inp" autoFocus /><button type="submit" className="text-emerald-600"><Check size={16} /></button></form> : tp.name}
              </td>
              <td className="px-6 py-4 text-slate-400 text-xs font-mono">{tp.tag}</td>
              <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full text-xs font-semibold">{tp.cnt}</span></td>
              <td className="px-6 py-4 text-right flex justify-end gap-2">
                <button onClick={() => onSelect(tp)} className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium">Відкрити</button>
                <Abtn icon={<Download size={14} />} onClick={() => exportQuestions(subjectId, tp.tag, null)} />
                {canEdit && <Abtn icon={<Edit size={16} />} onClick={() => setEditId(tp.id)} />}
                {canEdit && <Abtn icon={<Trash2 size={16} />} danger onClick={async () => { if (!confirm('Деактивувати?')) return; await supabase.from('topics').update({ is_active: false }).eq('id', tp.id); logAction(user, 'deactivate', 'topic', tp.id, { name: tp.name }); load(); }} />}
              </td>
            </tr>
          ))}
        </Table>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GENERIC TABLE (questions from any table)
// ══════════════════════════════════════════════════════════════════════════
function GenericTable({ sid, tag, table, textKey, folderId }) {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [formId, setFormId] = useState(null); // null=hidden, 'new'=add, uuid=edit
  const hasTemplate = !!TEMPLATES[table];
  const FormComponent = FORM_MAP[table];
  async function load() { setLoading(true);
    let q = supabase.from(table).select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(200);
    if (tag) q = q.eq('topic_tag', tag);
    if (sid && table !== 'exam_questions') q = q.eq('subject_id', sid);
    if (folderId) q = q.eq('folder_id', folderId);
    const { data } = await q; setItems(data || []); setLoading(false);
  }
  useEffect(() => { load(); }, [sid, tag, table, folderId]);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={() => exportQuestions(sid, tag, table)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-200"><Download size={14} /> Експорт</button>
            {hasTemplate && <>
              <button onClick={() => downloadTemplate(table)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"><Download size={14} /> Шаблон .xlsx</button>
              <button onClick={() => { setShowImport(!showImport); setFormId(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors"><Upload size={14} /> Імпорт з Excel</button>
            </>}
            <button onClick={() => { setFormId('new'); setShowImport(false); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm"><Plus size={16} /> Додати питання</button>
          </div>
        )}
      </div>
      {showImport && canEdit && <ExcelImport formatTable={table} subjectId={sid} topicTag={tag} onImported={() => { setShowImport(false); load(); }} />}
      {formId && canEdit && (() => { const FC = FormComponent || FORM_MAP.questions; return <FC sid={sid} tag={tag} qid={formId === 'new' ? null : formId} onDone={() => { setFormId(null); load(); }} onCancel={() => setFormId(null)} />; })()}
      <Table heads={['#', 'Зміст', 'Тип', canEdit ? '' : null].filter(Boolean)}>
        {items.map((q, i) => (
          <tr key={q.id} className="hover:bg-slate-50/80 group">
            <td className="px-6 py-4 text-slate-400 text-xs text-center">{i + 1}</td>
            <td className="px-6 py-4 font-medium text-slate-800 max-w-lg"><div className="line-clamp-2">{q[textKey] || JSON.stringify(q.question_data || {}).substring(0, 80)}</div></td>
            <td className="px-6 py-4 text-xs text-slate-500">{q.format || q.question_type || table.replace('_questions', '')}</td>
            {canEdit && <td className="px-6 py-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100">
              {FormComponent && <Abtn icon={<Edit size={16} />} onClick={() => { setFormId(q.id); setShowImport(false); }} />}
              <MoveButton question={q} fromTable={table} sid={sid} onMoved={load} />
              <Abtn icon={<Trash2 size={16} />} danger onClick={async () => { if (!confirm('Деактивувати?')) return; await supabase.from(table).update({ is_active: false }).eq('id', q.id); logAction(user, 'deactivate', table.replace('_questions',''), q.id, { text: q[textKey]?.substring(0,80) }); load(); }} />
            </td>}
          </tr>
        ))}
      </Table>
      {!items.length && <Empty text="Немає питань" />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXAM FOLDERS
// ══════════════════════════════════════════════════════════════════════════
function ExamFoldersView({ sid, onSelect }) {
  const canEdit = useCanEdit();
  const [folders, setFolders] = useState([]); const [loading, setLoading] = useState(true); const [newName, setNewName] = useState('');
  async function load() { setLoading(true);
    const { data } = await supabase.from('exam_folders').select('*').eq('subject_id', sid).eq('is_active', true).order('sort_order');
    const { data: qd } = await supabase.from('exam_questions').select('folder_id').eq('subject_id', sid).eq('is_active', true);
    const c = {}; (qd || []).forEach(r => { c[r.folder_id] = (c[r.folder_id] || 0) + 1; });
    setFolders((data || []).map(f => ({ ...f, cnt: c[f.id] || 0 }))); setLoading(false);
  }
  useEffect(() => { load(); }, [sid]);
  async function add(e) { e.preventDefault(); if (!newName.trim()) return; await supabase.from('exam_folders').insert({ name: newName.trim(), subject_id: sid, sort_order: folders.length }); setNewName(''); load(); }
  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      {canEdit && <form onSubmit={add} className="flex gap-3"><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Назва нової папки..." className="inp flex-1" /><Btn type="submit"><Plus size={16} /> Створити</Btn></form>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map(f => (
          <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer group" onClick={() => onSelect(f)}>
            <div className="flex items-start justify-between mb-3"><div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white"><FolderOpen size={24} /></div>
              {canEdit && <Abtn icon={<Trash2 size={14} />} danger onClick={async e => { e.stopPropagation(); if (!confirm('Видалити папку?')) return; await supabase.from('exam_questions').delete().eq('folder_id', f.id); await supabase.from('exam_folders').delete().eq('id', f.id); load(); }} />}
            </div>
            <h3 className="font-semibold text-slate-800 text-lg mb-1">{f.name}</h3>
            <div className="text-sm text-slate-500">Питань: <strong>{f.cnt}</strong></div>
          </div>
        ))}
      </div>
      {!folders.length && <Empty text="Створіть першу папку" />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXAM BUILDER (two-panel: composition + question bank)
// ══════════════════════════════════════════════════════════════════════════
const EXAM_SOURCES = [
  { table: 'questions', label: 'Тест', textKey: 'question_text', type: 'test' },
  { table: 'blitz_questions', label: 'Бліц', textKey: 'text', type: 'blitz' },
  { table: 'logical_pairs_questions', label: 'Пари', textKey: 'instruction', type: 'pairs' },
  { table: 'gallery_questions', label: 'Галерея', textKey: 'question_text', type: 'gallery' },
  { table: 'seven_questions', label: 'Сімка', textKey: 'text', type: 'seven' },
];

function ExamBuilderView({ sid, folderId, folderName }) {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  // Left panel: exam composition
  const [examItems, setExamItems] = useState([]); const [loadingExam, setLoadingExam] = useState(true);
  // Right panel: question bank
  const [bankItems, setBankItems] = useState([]); const [loadingBank, setLoadingBank] = useState(false);
  const [bankFilter, setBankFilter] = useState('questions');
  const [search, setSearch] = useState('');
  const [bankTopic, setBankTopic] = useState('');
  const [topics, setTopics] = useState([]);

  async function loadExam() { setLoadingExam(true);
    const { data } = await supabase.from('exam_questions').select('*').eq('folder_id', folderId).eq('is_active', true).order('sort_order');
    setExamItems(data || []); setLoadingExam(false);
  }

  async function loadBank() { setLoadingBank(true);
    const src = EXAM_SOURCES.find(s => s.table === bankFilter);
    let q = supabase.from(src.table).select('*').eq('subject_id', sid).eq('is_active', true).eq('publish_status', 'published').order('updated_at', { ascending: false }).limit(500);
    if (bankTopic) q = q.eq('topic_tag', bankTopic);
    const { data } = await q;
    setBankItems(data || []); setLoadingBank(false);
  }

  async function loadTopics() {
    const { data } = await supabase.from('topics').select('tag, name').eq('subject_id', sid).eq('is_active', true).order('sort_order');
    setTopics(data || []);
  }

  useEffect(() => { loadExam(); loadTopics(); }, [folderId]);
  useEffect(() => { loadBank(); }, [bankFilter, bankTopic]);

  const src = EXAM_SOURCES.find(s => s.table === bankFilter);
  const filteredBank = search.trim()
    ? bankItems.filter(q => {
        const text = (q[src.textKey] || q.question_text || q.text || q.instruction || JSON.stringify(q.question_data || {})).toLowerCase();
        return text.includes(search.toLowerCase());
      })
    : bankItems;

  // Check which bank items are already in exam
  const examDataIds = new Set(examItems.map(e => e.question_data?.source_id));

  async function addToExam(q) {
    const src2 = EXAM_SOURCES.find(s => s.table === bankFilter);
    const questionData = { ...q, source_table: bankFilter, source_id: q.id };
    await supabase.from('exam_questions').insert({
      folder_id: folderId, subject_id: sid, question_type: src2.type,
      question_data: questionData, sort_order: examItems.length, is_active: true, publish_status: 'draft',
    });
    logAction(user, 'add_to_exam', 'exam', folderId, { source: bankFilter, qid: q.id });
    loadExam();
  }

  async function removeFromExam(id) {
    await supabase.from('exam_questions').delete().eq('id', id);
    logAction(user, 'remove_from_exam', 'exam', folderId, { exam_question_id: id });
    loadExam();
  }

  async function moveItem(idx, dir) {
    const newItems = [...examItems];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newItems.length) return;
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
    for (let i = 0; i < newItems.length; i++) {
      await supabase.from('exam_questions').update({ sort_order: i }).eq('id', newItems[i].id);
    }
    loadExam();
  }

  const typeLabels = { test: 'Тест', blitz: 'Бліц', pairs: 'Пари', gallery: 'Галерея', seven: 'Сімка' };
  const typeColors = { test: 'bg-blue-100 text-blue-700', blitz: 'bg-amber-100 text-amber-700', pairs: 'bg-purple-100 text-purple-700', gallery: 'bg-emerald-100 text-emerald-700', seven: 'bg-rose-100 text-rose-700' };

  function getQuestionText(item) {
    const d = item.question_data || {};
    return d.question_text || d.text || d.instruction || JSON.stringify(d).substring(0, 80);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '70vh' }}>
      {/* LEFT: Exam composition */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2"><Trophy size={20} className="text-amber-500" /> Склад іспиту</h3>
          <span className="text-sm text-slate-400">Питань: <strong className="text-slate-700">{examItems.length}</strong></span>
        </div>
        {loadingExam ? <Spinner /> : examItems.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            <div className="text-center"><Inbox size={40} className="mx-auto mb-2 text-slate-300" /><p>Додайте питання з правої панелі</p></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[65vh]">
            {examItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-300 transition-colors">
                <span className="text-xs text-slate-400 w-6 text-center font-mono">{idx + 1}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[item.question_type] || 'bg-slate-100 text-slate-600'}`}>{typeLabels[item.question_type] || item.question_type}</span>
                <span className="flex-1 text-sm text-slate-700 line-clamp-1">{getQuestionText(item)}</span>
                {canEdit && <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} className="rotate-90" /></button>
                  <button onClick={() => moveItem(idx, 1)} disabled={idx === examItems.length - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30"><ChevronLeft size={14} className="-rotate-90" /></button>
                  <button onClick={() => removeFromExam(item.id)} className="p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
                </div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Question bank */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2"><BookOpen size={20} className="text-blue-500" /> База питань</h3>
          <span className="text-sm text-slate-400">Знайдено: <strong className="text-slate-700">{filteredBank.length}</strong></span>
        </div>
        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {EXAM_SOURCES.map(s => (
            <button key={s.table} onClick={() => { setBankFilter(s.table); setSearch(''); setBankTopic(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${bankFilter === s.table ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s.label}</button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук по тексту..." className="inp flex-1" />
          <select value={bankTopic} onChange={e => setBankTopic(e.target.value)} className="inp w-44">
            <option value="">Усі теми</option>
            {topics.map(t => <option key={t.tag} value={t.tag}>{t.name}</option>)}
          </select>
        </div>
        {/* List */}
        {loadingBank ? <Spinner /> : (
          <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[55vh]">
            {filteredBank.map(q => {
              const text = q[src.textKey] || q.question_text || q.text || q.instruction || '';
              const alreadyAdded = examDataIds.has(q.id);
              return (
                <div key={q.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${alreadyAdded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-300'}`}>
                  <span className="flex-1 text-sm text-slate-700 line-clamp-1">{text}</span>
                  <span className="text-xs text-slate-400 font-mono shrink-0">{q.topic_tag || ''}</span>
                  {canEdit && (alreadyAdded
                    ? <span className="text-emerald-500 shrink-0"><CheckCircle2 size={18} /></span>
                    : <button onClick={() => addToExam(q)} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shrink-0 flex items-center gap-1"><Plus size={12} /> Додати</button>
                  )}
                </div>
              );
            })}
            {!filteredBank.length && <Empty text="Немає питань" />}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MOVE QUESTION BETWEEN FORMATS
// ══════════════════════════════════════════════════════════════════════════
const MOVE_TARGETS = [
  { table: 'questions', label: 'Тест (4 варіанти)', fields: q => ({ question_text: q.question_text || q.text || q.instruction || '', options: q.options || ['', '', '', ''], correct_index: q.correct_index ?? 0, explanation: q.explanation || '', difficulty: q.difficulty || 1, format: 'single_choice', status: 'verified' }) },
  { table: 'blitz_questions', label: 'Бліц (Так/Ні)', fields: q => ({ text: q.text || q.question_text || q.instruction || '', is_true: q.is_true ?? true, explanation: q.explanation || '', difficulty: q.difficulty || 1 }) },
  { table: 'logical_pairs_questions', label: 'Логічні пари', fields: q => ({ instruction: q.instruction || q.question_text || q.text || '', left_items: q.left_items || [{ id: '1', text: '' }, { id: '2', text: '' }, { id: '3', text: '' }, { id: '4', text: '' }], right_items: q.right_items || [{ id: 'А', text: '' }, { id: 'Б', text: '' }, { id: 'В', text: '' }, { id: 'Г', text: '' }], correct_pairs: q.correct_pairs || { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' }, explanation: q.explanation || '', difficulty: q.difficulty || 1 }) },
  { table: 'gallery_questions', label: 'Галерея', fields: q => ({ question_text: q.question_text || q.text || q.instruction || '', options: q.options || ['', '', '', ''], correct_index: q.correct_index ?? 0, explanation: q.explanation || '', image_url: q.image_url || null, image_hint: q.image_hint || '', image_category: 'architecture', difficulty: q.difficulty || 1 }) },
  { table: 'seven_questions', label: 'Сімки (3 з 7)', fields: q => ({ text: q.text || q.question_text || q.instruction || '', options: q.options || ['', '', '', '', '', '', ''], correct_answers: q.correct_answers || [0, 1, 2], explanation: q.explanation || '', difficulty: q.difficulty || 1 }) },
];

function MoveButton({ question, fromTable, sid, onMoved }) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const targets = MOVE_TARGETS.filter(t => t.table !== fromTable);

  async function moveTo(target) {
    if (!confirm(`Перемістити питання в "${target.label}"?`)) return;
    setMoving(true);
    const fields = target.fields(question);
    const payload = { ...fields, subject_id: sid, topic_tag: question.topic_tag, image_url: question.image_url || null, is_active: true, updated_at: new Date().toISOString() };
    const { error } = await supabase.from(target.table).insert(payload);
    if (error) { alert('Помилка: ' + error.message); setMoving(false); return; }
    await supabase.from(fromTable).update({ is_active: false }).eq('id', question.id);
    logAction(window.__adminUser, 'move', fromTable.replace('_questions',''), question.id, { from: fromTable, to: target.table });
    setMoving(false); setOpen(false); onMoved();
  }

  const btnRef = useRef();

  return (
    <>
      <button ref={btnRef} onClick={() => setOpen(!open)} disabled={moving} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Перемістити в інший формат">
        {moving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
      </button>
      {open && <>
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[220px]"
          style={{ top: (btnRef.current?.getBoundingClientRect().bottom || 0) + 4, left: (btnRef.current?.getBoundingClientRect().right || 0) - 220 }}>
          <div className="px-3 py-2 text-xs text-slate-400 font-medium border-b border-slate-100">Перемістити в:</div>
          {targets.map(t => (
            <button key={t.table} onClick={() => moveTo(t)} className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              {t.label}
            </button>
          ))}
          <button onClick={() => setOpen(false)} className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 border-t border-slate-100">Скасувати</button>
        </div>
      </>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SUPPORT REQUESTS (Supabase-backed)
// ══════════════════════════════════════════════════════════════════════════
function SupportRequestsView() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  async function load() {
    setLoading(true);
    let q = supabase.from('support_requests').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (dateFilter === 'today') q = q.gte('created_at', new Date(Date.now() - 86400000).toISOString());
    else if (dateFilter === 'week') q = q.gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());
    else if (dateFilter === 'month') q = q.gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
    else if (dateFilter === 'custom') {
      if (customStart) q = q.gte('created_at', customStart);
      if (customEnd) q = q.lte('created_at', customEnd + 'T23:59:59');
    }
    const { data } = await q;
    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); setPage(1); }, [statusFilter, dateFilter, customStart, customEnd]);

  async function updateStatus(id, status) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'resolved') updates.resolved_by = user.id;
    if (status === 'pending') updates.assigned_to = user.id;
    await supabase.from('support_requests').update(updates).eq('id', id);
    logAction(user, 'status_change', 'support_request', id, { status });
    load();
    if (selected?.id === id) setSelected({ ...selected, status });
  }

  // Detail view
  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelected(null)} className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Запит {selected.request_number}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Від: {selected.user_name} ({selected.user_email}) &bull; {new Date(selected.created_at).toLocaleString('uk-UA')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CatBadge cat={selected.category} />
            <StatusBadge status={selected.status} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 mb-4 pb-4 border-b border-slate-100">Тема: {selected.subject}</h3>
              <div className="bg-slate-50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</div>
              {selected.attachments?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4"><ImageIcon size={16} className="text-slate-400" /> Прикріплені фото</h4>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {selected.attachments.map((url, i) => <img key={i} src={url} alt="" className="h-32 rounded-lg border object-cover shadow-sm" />)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800 pb-2 border-b border-slate-100">Дії із запитом</h3>
              <div className="space-y-2">
                <button onClick={() => updateStatus(selected.id, 'resolved')} className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-sm font-medium flex items-center gap-2"><CheckCircle2 size={16} /> Вирішено</button>
                <button onClick={() => updateStatus(selected.id, 'pending')} className="w-full py-2.5 px-4 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-sm font-medium flex items-center gap-2"><Activity size={16} /> В роботу</button>
                <button onClick={() => updateStatus(selected.id, 'irrelevant')} className="w-full py-2.5 px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-sm font-medium flex items-center gap-2"><Ban size={16} /> Не релевантно</button>
                <button onClick={async () => { if (!confirm('Видалити запит назавжди?')) return; await supabase.from('support_requests').delete().eq('id', selected.id); setSelected(null); load(); }} className="w-full py-2.5 px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium flex items-center gap-2"><Trash2 size={16} /> Видалити</button>
              </div>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100 text-center">Зворотній зв'язок з користувачем не передбачений.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  const total = requests.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const pageItems = requests.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div><h3 className="text-xl font-bold text-slate-800">Звернення користувачів</h3><p className="text-sm text-slate-500 mt-1">Тікети з форми "Написати нам"</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-10 pr-4 rounded-xl shadow-sm text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Всі статуси</option><option value="new">Нові</option><option value="pending">В роботі</option><option value="resolved">Вирішено</option><option value="irrelevant">Не релевантно</option>
          </select><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
          <div className="relative"><select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-10 pr-4 rounded-xl shadow-sm text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">За весь час</option><option value="today">Сьогодні</option><option value="week">За тиждень</option><option value="month">За місяць</option><option value="custom">Кастомний</option>
          </select><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div>
          {dateFilter === 'custom' && <div className="flex items-center gap-2"><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="inp" /><span className="text-slate-400">-</span><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="inp" /></div>}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr><th className="px-6 py-4 font-medium w-32">ID / Дата</th><th className="px-6 py-4 font-medium">Користувач</th><th className="px-6 py-4 font-medium">Тег</th><th className="px-6 py-4 font-medium">Тема</th><th className="px-6 py-4 font-medium">Статус</th><th className="px-6 py-4 font-medium text-right">Дії</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {pageItems.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80 group">
                    <td className="px-6 py-4"><div className="font-mono text-slate-800 font-medium">{req.request_number}</div><div className="text-slate-400 text-xs mt-0.5">{new Date(req.created_at).toLocaleDateString('uk-UA')}</div></td>
                    <td className="px-6 py-4"><div className="font-medium text-slate-800">{req.user_name}</div><div className="text-slate-500 text-xs mt-0.5">{req.user_email}</div></td>
                    <td className="px-6 py-4"><CatBadge cat={req.category} /></td>
                    <td className="px-6 py-4"><div className="text-slate-800 font-medium truncate max-w-[200px] flex items-center gap-2">{req.attachments?.length > 0 && <ImageIcon size={14} className="text-blue-500 shrink-0" />}{req.subject}</div><div className="text-slate-500 text-xs truncate max-w-[200px] mt-0.5">{req.message}</div></td>
                    <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => setSelected(req)} className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition-colors">Відкрити</button></td>
                  </tr>
                ))}
                {!pageItems.length && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Запитів не знайдено</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
            <span className="text-sm text-slate-500">{total > 0 ? (page-1)*perPage+1 : 0}–{Math.min(page*perPage, total)} з {total}</span>
            <div className="flex gap-1.5">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronLeft size={18} /></button>
              <button disabled={page>=totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatBadge({ cat }) {
  if (cat === 'bug') return <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-medium text-xs flex items-center gap-1.5 w-max"><Bug size={14} /> Помилка</span>;
  if (cat === 'idea') return <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium text-xs flex items-center gap-1.5 w-max"><Lightbulb size={14} /> Ідея</span>;
  return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1.5 w-max"><MoreHorizontal size={14} /> Інше</span>;
}

function StatusBadge({ status }) {
  if (status === 'new') return <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs flex items-center gap-1.5 w-max"><Inbox size={14} /> Новий</span>;
  if (status === 'pending') return <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs flex items-center gap-1.5 w-max"><Activity size={14} /> В роботі</span>;
  if (status === 'resolved') return <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs flex items-center gap-1.5 w-max"><CheckCircle2 size={14} /> Вирішено</span>;
  return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs flex items-center gap-1.5 w-max"><Ban size={14} /> Не релевантно</span>;
}

// ══════════════════════════════════════════════════════════════════════════
// EXPORT DIALOG — select formats and topics to export
// ══════════════════════════════════════════════════════════════════════════
function ExportDialog({ subjectId }) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState(['questions', 'blitz_questions', 'logical_pairs_questions', 'gallery_questions', 'seven_questions']);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [allTopics, setAllTopics] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) supabase.from('topics').select('tag, name').eq('subject_id', subjectId).eq('is_active', true).order('sort_order').then(({ data }) => setTopics(data || []));
  }, [open, subjectId]);

  const FORMAT_OPTIONS = [
    { id: 'questions', label: 'Тест (4 варіанти)' },
    { id: 'blitz_questions', label: 'Бліц (Так/Ні)' },
    { id: 'logical_pairs_questions', label: 'Логічні пари' },
    { id: 'gallery_questions', label: 'Галерея' },
    { id: 'seven_questions', label: 'Сімки (3 з 7)' },
  ];

  function toggleFormat(id) { setSelectedFormats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function toggleTopic(tag) { setSelectedTopics(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]); }

  async function handleExport() {
    setExporting(true);
    // Build one workbook with selected formats and topics
    const XLSX_LIB = await import('xlsx');
    const wb = XLSX_LIB.utils.book_new();
    const topicsList = allTopics ? [null] : selectedTopics;

    for (const fmt of selectedFormats) {
      for (const topicTag of topicsList) {
        let query = supabase.from(fmt).select('*').eq('subject_id', subjectId).eq('is_active', true);
        if (topicTag) query = query.eq('topic_tag', topicTag);
        const { data } = await query;
        if (!data || !data.length) continue;

        const sheetLabel = { questions: 'Тест', blitz_questions: 'Бліц', logical_pairs_questions: 'Пари', gallery_questions: 'Галерея', seven_questions: 'Сімка' }[fmt] || fmt;
        const sheetName = (topicTag ? `${sheetLabel}_${topicTag}` : sheetLabel).substring(0, 31);

        let rows;
        if (fmt === 'questions') rows = data.map(q => ({ Тема: q.topic_tag, 'Текст питання': q.question_text, 'Варіант A': q.options?.[0], 'Варіант B': q.options?.[1], 'Варіант C': q.options?.[2], 'Варіант D': q.options?.[3], 'Правильна': String.fromCharCode(65 + (q.correct_index||0)), Пояснення: q.explanation, Складність: q.difficulty, 'URL фото': q.image_url||'' }));
        else if (fmt === 'blitz_questions') rows = data.map(q => ({ Тема: q.topic_tag, Твердження: q.text, Відповідь: q.is_true?'ТАК':'НІ', Пояснення: q.explanation, 'URL фото': q.image_url||'' }));
        else if (fmt === 'logical_pairs_questions') rows = data.map(q => ({ Тема: q.topic_tag, Інструкція: q.instruction, 'Ліва 1': q.left_items?.[0]?.text, 'Ліва 2': q.left_items?.[1]?.text, 'Ліва 3': q.left_items?.[2]?.text, 'Ліва 4': q.left_items?.[3]?.text, 'Права А': q.right_items?.[0]?.text, 'Права Б': q.right_items?.[1]?.text, 'Права В': q.right_items?.[2]?.text, 'Права Г': q.right_items?.[3]?.text, 'Права Д': q.right_items?.[4]?.text||'' }));
        else if (fmt === 'gallery_questions') rows = data.map(q => ({ Тема: q.topic_tag, 'Текст': q.question_text, 'A': q.options?.[0], 'B': q.options?.[1], 'C': q.options?.[2], 'D': q.options?.[3], 'Правильна': String.fromCharCode(65+(q.correct_index||0)), Пояснення: q.explanation, 'URL фото': q.image_url||'' }));
        else if (fmt === 'seven_questions') rows = data.map(q => ({ Тема: q.topic_tag, Текст: q.text, '1': q.options?.[0], '2': q.options?.[1], '3': q.options?.[2], '4': q.options?.[3], '5': q.options?.[4], '6': q.options?.[5], '7': q.options?.[6], 'Прав.1': (q.correct_answers?.[0]??-1)+1, 'Прав.2': (q.correct_answers?.[1]??-1)+1, 'Прав.3': (q.correct_answers?.[2]??-1)+1, Пояснення: q.explanation }));
        else rows = data.map(q => ({ id: q.id, data: JSON.stringify(q) }));

        const ws = XLSX_LIB.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(String(k).length + 2, 15) }));
        XLSX_LIB.utils.book_append_sheet(wb, ws, sheetName);
      }
    }
    XLSX_LIB.writeFile(wb, `export_${subjectId}.xlsx`);
    setExporting(false);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-200">
        <Download size={16} /> Експорт
      </button>
      {open && <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpen(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 w-full max-w-lg overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">Експорт питань</h3>
            <p className="text-sm text-slate-500 mt-1">Оберіть формати та теми для вивантаження</p>
          </div>
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Formats */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">Типи питань</h4>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map(f => (
                  <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={selectedFormats.includes(f.id)} onChange={() => toggleFormat(f.id)} className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                    <span className="text-sm text-slate-700">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Topics */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">Теми</h4>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer mb-2">
                <input type="radio" name="topicMode" checked={allTopics} onChange={() => setAllTopics(true)} className="w-4 h-4 text-blue-600 border-slate-300" />
                <span className="text-sm text-slate-700 font-medium">Усі теми</span>
              </label>
              <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer mb-2">
                <input type="radio" name="topicMode" checked={!allTopics} onChange={() => setAllTopics(false)} className="w-4 h-4 text-blue-600 border-slate-300" />
                <span className="text-sm text-slate-700 font-medium">Обрані теми</span>
              </label>
              {!allTopics && (
                <div className="ml-6 space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-lg p-2">
                  {topics.map(t => (
                    <label key={t.tag} className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input type="checkbox" checked={selectedTopics.includes(t.tag)} onChange={() => toggleTopic(t.tag)} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300" />
                      <span className="text-xs text-slate-700">{t.name}</span>
                    </label>
                  ))}
                  {!topics.length && <span className="text-xs text-slate-400">Немає тем</span>}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Скасувати</button>
            <button onClick={handleExport} disabled={exporting || selectedFormats.length === 0 || (!allTopics && selectedTopics.length === 0)} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Експорт...' : 'Завантажити .xlsx'}
            </button>
          </div>
        </div>
      </>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LIBRARY VIEW — all questions, manage topics, filter, reassign
// ══════════════════════════════════════════════════════════════════════════
function LibraryView({ sid }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 100;

  const fmtColors = { 'Тест': 'bg-blue-50 text-blue-700', 'Бліц': 'bg-orange-50 text-orange-700', 'Пари': 'bg-indigo-50 text-indigo-700', 'Галерея': 'bg-purple-50 text-purple-700', 'Сімка': 'bg-teal-50 text-teal-700' };

  async function load() {
    setLoading(true);
    const all = [];
    const [q, b, p, g, s, t] = await Promise.all([
      supabase.from('questions').select('*').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('blitz_questions').select('*').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('logical_pairs_questions').select('*').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('gallery_questions').select('*').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('seven_questions').select('*').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('topics').select('tag, name').eq('subject_id', sid).eq('is_active', true).order('sort_order'),
    ]);
    (q.data || []).forEach(r => all.push({ ...r, _format: 'Тест', _text: r.question_text, _table: 'questions' }));
    (b.data || []).forEach(r => all.push({ ...r, _format: 'Бліц', _text: r.text, _table: 'blitz_questions' }));
    (p.data || []).forEach(r => all.push({ ...r, _format: 'Пари', _text: r.instruction, _table: 'logical_pairs_questions' }));
    (g.data || []).forEach(r => all.push({ ...r, _format: 'Галерея', _text: r.question_text, _table: 'gallery_questions' }));
    (s.data || []).forEach(r => all.push({ ...r, _format: 'Сімка', _text: r.text, _table: 'seven_questions' }));
    setItems(all);
    setTopics(t.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [filterFormat, filterTopic, filterStatus]);

  async function changeTopic(item, newTag) {
    await supabase.from(item._table).update({ topic_tag: newTag, updated_at: new Date().toISOString() }).eq('id', item.id);
    logAction(user, 'update', item._table.replace('_questions', ''), item.id, { action: 'change_topic', new_topic: newTag });
    load();
  }

  async function deactivate(item) {
    if (!confirm('Деактивувати?')) return;
    await supabase.from(item._table).update({ is_active: false }).eq('id', item.id);
    logAction(user, 'deactivate', item._table.replace('_questions', ''), item.id, { text: item._text?.substring(0, 80) });
    load();
  }

  const filtered = items
    .filter(i => filterFormat === 'all' || i._format === filterFormat)
    .filter(i => filterTopic === 'all' || i.topic_tag === filterTopic)
    .filter(i => filterStatus === 'all' || i.publish_status === filterStatus);
  const total = filtered.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm text-slate-500">Всього: <strong>{items.length}</strong></span>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Всі формати</option>
            {Object.keys(fmtColors).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Всі теми</option>
            <option value="">Без теми</option>
            {topics.map(t => <option key={t.tag} value={t.tag}>{t.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-xs font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Всі статуси</option>
            <option value="draft">Чернетки</option>
            <option value="published">Опубліковані</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr><th className="px-4 py-3 font-medium w-10">#</th><th className="px-4 py-3 font-medium">Питання</th><th className="px-4 py-3 font-medium w-20">Формат</th><th className="px-4 py-3 font-medium w-24">Статус</th><th className="px-4 py-3 font-medium w-48">Тема</th><th className="px-4 py-3 font-medium w-16 text-right">Дії</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pageItems.map((q, i) => (
                <tr key={q.id + q._table} className="hover:bg-slate-50/80 group">
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{(page - 1) * perPage + i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800"><div className="line-clamp-1 max-w-md">{q._text || '—'}</div></td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${fmtColors[q._format]}`}>{q._format}</span></td>
                  <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium border ${q.publish_status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{q.publish_status === 'draft' ? 'Чернетка' : 'Опубл.'}</span></td>
                  <td className="px-4 py-2.5">
                    <select value={q.topic_tag || ''} onChange={e => changeTopic(q, e.target.value)} className="bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded text-xs w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">— Без теми —</option>
                      {topics.map(t => <option key={t.tag} value={t.tag}>{t.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Abtn icon={<Trash2 size={14} />} danger onClick={() => deactivate(q)} />
                  </td>
                </tr>
              ))}
              {!pageItems.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Немає питань</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
          <span className="text-xs text-slate-500">{total > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, total)} з {total}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronLeft size={16} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1 rounded border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXPRESS ALL — shows questions from ALL format tables
// ══════════════════════════════════════════════════════════════════════════
function ExpressAllView({ sid }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState('all');

  async function load() {
    setLoading(true);
    const all = [];

    const [q, b, p, g, s] = await Promise.all([
      supabase.from('questions').select('id, question_text, topic_tag, difficulty, format, is_active, publish_status').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('blitz_questions').select('id, text, topic_tag, difficulty, is_active, publish_status').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('logical_pairs_questions').select('id, instruction, topic_tag, difficulty, is_active, publish_status').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('gallery_questions').select('id, question_text, topic_tag, difficulty, is_active, publish_status').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
      supabase.from('seven_questions').select('id, text, topic_tag, difficulty, is_active, publish_status').eq('subject_id', sid).eq('is_active', true).order('updated_at', { ascending: false }),
    ]);

    (q.data || []).forEach(r => all.push({ ...r, _format: 'Тест', _text: r.question_text, _table: 'questions' }));
    (b.data || []).forEach(r => all.push({ ...r, _format: 'Бліц', _text: r.text, _table: 'blitz_questions' }));
    (p.data || []).forEach(r => all.push({ ...r, _format: 'Пари', _text: r.instruction, _table: 'logical_pairs_questions' }));
    (g.data || []).forEach(r => all.push({ ...r, _format: 'Галерея', _text: r.question_text, _table: 'gallery_questions' }));
    (s.data || []).forEach(r => all.push({ ...r, _format: 'Сімка', _text: r.text, _table: 'seven_questions' }));

    setItems(all);
    setLoading(false);
  }

  useEffect(() => { load(); }, [sid]);

  const fmtColors = { 'Тест': 'bg-blue-50 text-blue-700', 'Бліц': 'bg-orange-50 text-orange-700', 'Пари': 'bg-indigo-50 text-indigo-700', 'Галерея': 'bg-purple-50 text-purple-700', 'Сімка': 'bg-teal-50 text-teal-700' };
  const statusColors = { draft: 'bg-amber-50 text-amber-700 border-amber-200', published: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  const filtered = filterFormat === 'all' ? items : items.filter(i => i._format === filterFormat);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">Всього: <strong>{items.length}</strong> питань з усіх форматів</span>
        <div className="flex items-center gap-3">
          <select value={filterFormat} onChange={e => setFilterFormat(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-xl text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Всі формати ({items.length})</option>
            {Object.keys(fmtColors).map(f => { const c = items.filter(i => i._format === f).length; return <option key={f} value={f}>{f} ({c})</option>; })}
          </select>
        </div>
      </div>

      <Table heads={['#', 'Питання', 'Формат', 'Статус', 'Тема']}>
        {filtered.map((q, i) => (
          <tr key={q.id + q._table} className="hover:bg-slate-50/80 group">
            <td className="px-6 py-3 text-slate-400 text-xs text-center">{i + 1}</td>
            <td className="px-6 py-3 font-medium text-slate-800 max-w-lg"><div className="line-clamp-1">{q._text || '—'}</div></td>
            <td className="px-6 py-3"><span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${fmtColors[q._format]}`}>{q._format}</span></td>
            <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColors[q.publish_status] || statusColors.published}`}>{q.publish_status === 'draft' ? 'Чернетка' : 'Опубліковано'}</span></td>
            <td className="px-6 py-3 text-xs text-slate-500">{q.topic_tag || '—'}</td>
          </tr>
        ))}
      </Table>
      {!filtered.length && <Empty text="Немає питань" />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PUBLISH BUTTON — "Оновити базу"
// ══════════════════════════════════════════════════════════════════════════
function PublishButton({ user }) {
  const [drafts, setDrafts] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const TABLES = ['questions', 'blitz_questions', 'logical_pairs_questions', 'gallery_questions', 'seven_questions', 'exam_questions'];

  async function countDrafts() {
    let total = 0;
    for (const t of TABLES) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('publish_status', 'draft').eq('is_active', true);
      total += (count || 0);
    }
    setDrafts(total);
  }

  useEffect(() => { countDrafts(); const interval = setInterval(countDrafts, 30000); return () => clearInterval(interval); }, []);

  async function publish() {
    setPublishing(true);
    for (const t of TABLES) {
      await supabase.from(t).update({ publish_status: 'published' }).eq('publish_status', 'draft').eq('is_active', true);
    }
    // Increment db version so mobile app knows to re-sync
    const { data: ver } = await supabase.from('db_version').select('version').eq('id', 1).single();
    const newVersion = (ver?.version || 0) + 1;
    await supabase.from('db_version').update({ version: newVersion, published_at: new Date().toISOString(), published_by: user.id }).eq('id', 1);
    logAction(user, 'publish', 'database', null, { drafts_published: drafts, new_version: newVersion });
    setPublishing(false);
    setShowConfirm(false);
    setDrafts(0);
  }

  if (drafts === 0) return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
      <Check size={14} /> База актуальна
    </div>
  );

  return (
    <>
      <button onClick={() => setShowConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium shadow-sm transition-colors relative">
        <Upload size={16} /> Оновити базу
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{drafts}</span>
      </button>
      {showConfirm && <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowConfirm(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-50 w-full max-w-md space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Оновити базу додатку?</h3>
          <p className="text-sm text-slate-600">
            <strong>{drafts}</strong> нових/змінених питань будуть опубліковані та стануть доступні користувачам мобільного додатку.
          </p>
          <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-800">
            Після публікації додаток автоматично завантажить оновлену базу при наступному запуску.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Скасувати</button>
            <button onClick={publish} disabled={publishing} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-sm">
              {publishing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {publishing ? 'Публікація...' : 'Опублікувати'}
            </button>
          </div>
        </div>
      </>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN LOGS (superadmin only)
// ══════════════════════════════════════════════════════════════════════════
function AdminLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const perPage = 25;

  async function load() {
    setLoading(true);
    let q = supabase.from('admin_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (filterUser !== 'all') q = q.eq('user_email', filterUser);
    if (filterAction !== 'all') q = q.eq('action', filterAction);
    const { data } = await q;
    setLogs(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); setPage(1); }, [filterUser, filterAction]);

  const actionLabels = { login: 'Вхід', logout: 'Вихід', create: 'Створення', update: 'Оновлення', delete: 'Видалення', deactivate: 'Деактивація', move: 'Переміщення', import: 'Імпорт', status_change: 'Зміна статусу' };
  const actionColors = { login: 'bg-blue-50 text-blue-700', logout: 'bg-slate-100 text-slate-600', create: 'bg-emerald-50 text-emerald-700', update: 'bg-amber-50 text-amber-700', delete: 'bg-red-50 text-red-700', deactivate: 'bg-red-50 text-red-600', move: 'bg-indigo-50 text-indigo-700', import: 'bg-purple-50 text-purple-700', status_change: 'bg-teal-50 text-teal-700' };
  const entityLabels = { question: 'Питання', blitz: 'Бліц', pairs: 'Пари', gallery: 'Галерея', seven: 'Сімка', exam: 'Іспит', topic: 'Тема', admin_user: 'Адмін', support_request: 'Запит', folder: 'Папка', session: 'Сесія', logical_pairs: 'Пари' };

  const uniqueUsers = [...new Set(logs.map(l => l.user_email))];
  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const total = logs.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const pageItems = logs.slice((page - 1) * perPage, page * perPage);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="text-xl font-bold text-slate-800">Логі дій</h3><p className="text-sm text-slate-500 mt-1">Усі дії адміністраторів в системі</p></div>
        <div className="flex items-center gap-3">
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-9 rounded-xl text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center]">
            <option value="all">Всі користувачі</option>
            {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-9 rounded-xl text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center]">
            <option value="all">Всі дії</option>
            {uniqueActions.map(a => <option key={a} value={a}>{actionLabels[a] || a}</option>)}
          </select>
          <button onClick={load} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-600">Оновити</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr><th className="px-5 py-3 font-medium">Час</th><th className="px-5 py-3 font-medium">Користувач</th><th className="px-5 py-3 font-medium">Дія</th><th className="px-5 py-3 font-medium">Об'єкт</th><th className="px-5 py-3 font-medium">Деталі</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {pageItems.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3"><div className="font-medium text-slate-800 text-xs">{log.user_name}</div><div className="text-slate-400 text-xs">{log.user_email}</div></td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>{actionLabels[log.action] || log.action}</span></td>
                  <td className="px-5 py-3"><span className="text-xs text-slate-600">{entityLabels[log.entity_type] || log.entity_type}</span>{log.entity_id && <span className="text-xs text-slate-400 ml-1">#{log.entity_id.substring(0, 8)}</span>}</td>
                  <td className="px-5 py-3 text-xs text-slate-500 max-w-[300px] truncate">{log.details?.text || log.details?.email || log.details?.count ? `${log.details.count} шт.` : JSON.stringify(log.details || {}).substring(0, 60)}</td>
                </tr>
              ))}
              {!pageItems.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Логів ще немає</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
          <span className="text-sm text-slate-500">{total > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, total)} з {total}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronLeft size={18} /></button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 disabled:opacity-50 bg-white shadow-sm"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SHARED UI
// ══════════════════════════════════════════════════════════════════════════
function SidebarItem({ icon, label, active, onClick }) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}><span className={active ? 'text-blue-600' : 'text-slate-400'}>{icon}</span>{label}</button>; }
function StatCard({ icon, label, value, color, isLive }) { const cm = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', indigo: 'bg-indigo-50 text-indigo-600' }; return <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"><div className="flex justify-between items-start"><div className={`p-2.5 rounded-xl ${cm[color]}`}>{React.cloneElement(icon, { size: 20 })}</div>{isLive && <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>}</div><div><div className="text-sm text-slate-500 font-medium mb-1">{label}</div><div className="text-2xl font-bold text-slate-800">{value}</div></div></div>; }
function Spinner() { return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>; }
function Empty({ text }) { return <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">{text}</div>; }
function Btn({ children, onClick, type = 'button' }) { return <button type={type} onClick={onClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm">{children}</button>; }
function Abtn({ icon, danger, onClick }) { return <button onClick={onClick} className={`p-2 rounded-lg transition-colors ${danger ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>{icon}</button>; }
function Table({ heads, children }) { return <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr>{heads.map((h, i) => <th key={i} className={`px-6 py-4 font-medium ${i === heads.length - 1 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 text-sm">{children}</tbody></table></div>; }
