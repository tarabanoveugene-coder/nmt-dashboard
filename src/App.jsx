import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import {
  LayoutDashboard, BookOpen, Users, Settings, Edit, Trash2, Plus,
  Activity, Landmark, BookText, Calculator, Globe, Microscope, Earth,
  FlaskConical, Zap, ChevronRight, ArrowLeft, Layers, FolderOpen,
  FileQuestion, LogOut, Save, X, Check, Image, Link, Upload, Trophy
} from 'lucide-react';

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
  { id: 'pairs', name: 'Логічні пари', desc: 'Встановлення відповідності між елементами', table: 'logical_pairs_questions' },
  { id: 'blitz', name: 'Бліц так/ні', desc: 'Швидкі питання з двома варіантами', table: 'blitz_questions' },
  { id: 'gallery', name: 'Галерея', desc: 'Питання на основі зображень', table: 'gallery_questions' },
  { id: 'sevens', name: 'Сімки (3 з 7)', desc: 'Вибір 3 правильних із 7', table: 'seven_questions' },
  { id: 'exam', name: 'Іспит на максимум', desc: 'Комбіновані питання у власних папках', table: 'exam_questions', isExam: true },
];

// ══════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD WIDGET — reusable for all question forms
// ══════════════════════════════════════════════════════════════════════════
function ImageField({ value, onChange }) {
  const [mode, setMode] = useState(value ? 'url' : 'none'); // none | url | upload
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `questions/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
    if (error) { alert('Помилка завантаження: ' + error.message); return; }
    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
    onChange(data.publicUrl);
    setMode('url');
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">Зображення (необов'язково)</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => { setMode('url'); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'url' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><Link size={14} /> URL</button>
        <button type="button" onClick={() => { setMode('upload'); fileRef.current?.click(); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mode === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><Upload size={14} /> Файл</button>
        {value && <button type="button" onClick={() => { onChange(''); setMode('none'); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">Видалити</button>}
      </div>
      {mode === 'url' && <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && <img src={value} alt="" className="h-24 rounded-lg object-cover border border-slate-200" onError={e => e.target.style.display='none'} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activeMenu, setActiveMenu] = useState('subjects');
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10">
        <div className="p-6"><h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NMT Admin</h1></div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Дашборд" active={activeMenu === 'dashboard'} onClick={() => setActiveMenu('dashboard')} />
          <SidebarItem icon={<BookOpen size={20} />} label="Предмети" active={activeMenu === 'subjects'} onClick={() => setActiveMenu('subjects')} />
          <SidebarItem icon={<Users size={20} />} label="Користувачі" active={activeMenu === 'users'} onClick={() => setActiveMenu('users')} />
          <SidebarItem icon={<Settings size={20} />} label="Налаштування" active={activeMenu === 'settings'} onClick={() => setActiveMenu('settings')} />
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button className="group flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-medium"><LogOut size={20} className="text-slate-400 group-hover:text-rose-600" /><span>Вийти</span></button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-semibold">{activeMenu === 'dashboard' ? 'Огляд' : activeMenu === 'subjects' ? 'Управління контентом' : 'Розділ'}</h2>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">А</div>
        </header>
        <div className="flex-1 overflow-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {activeMenu === 'dashboard' && <DashboardView />}
            {activeMenu === 'subjects' && <SubjectsView />}
            {activeMenu !== 'dashboard' && activeMenu !== 'subjects' && <div className="flex min-h-[400px] items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">Розділ у розробці</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function DashboardView() {
  const [s, setS] = useState({});
  useEffect(() => {
    Promise.all([
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('topics').select('*', { count: 'exact', head: true }),
      supabase.from('blitz_questions').select('*', { count: 'exact', head: true }),
      supabase.from('logical_pairs_questions').select('*', { count: 'exact', head: true }),
      supabase.from('gallery_questions').select('*', { count: 'exact', head: true }),
      supabase.from('seven_questions').select('*', { count: 'exact', head: true }),
      supabase.from('exam_questions').select('*', { count: 'exact', head: true }),
    ]).then(([q, t, b, p, g, sv, e]) => setS({ q: q.count||0, t: t.count||0, b: b.count||0, p: p.count||0, g: g.count||0, s: sv.count||0, e: e.count||0 }));
  }, []);
  const total = (s.q||0)+(s.b||0)+(s.p||0)+(s.g||0)+(s.s||0)+(s.e||0);
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-slate-700">Ключові показники</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileQuestion />} label="Всього питань" value={total} color="blue" />
        <StatCard icon={<FolderOpen />} label="Тем" value={s.t||0} color="emerald" />
        <StatCard icon={<BookOpen />} label="Предметів" value="1" color="indigo" />
        <StatCard icon={<Activity />} label="Статус БД" value="Online" color="emerald" isLive />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SUBJECTS + DRILL-DOWN
// ══════════════════════════════════════════════════════════════════════════
function SubjectsView() {
  const [sid, setSid] = useState(SUBJECTS[0].id);
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto gap-2">
        {SUBJECTS.map(s => { const I = s.icon; const a = sid === s.id; return (
          <button key={s.id} onClick={() => setSid(s.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${a ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <I size={18} className={a ? 'text-blue-600' : 'text-slate-400'} />{s.name}</button>);
        })}
      </div>
      <DrillDown subject={SUBJECTS.find(s => s.id === sid)} />
    </div>
  );
}

function DrillDown({ subject }) {
  const [fmt, setFmt] = useState(null);
  const [topic, setTopic] = useState(null);
  const [folder, setFolder] = useState(null);
  useEffect(() => { setFmt(null); setTopic(null); setFolder(null); }, [subject.id]);
  const SI = subject.icon;

  const level = !fmt ? 'formats' : fmt.isExam ? (folder ? 'exam-questions' : 'exam-folders') : (!topic ? 'topics' : 'questions');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
      {/* Breadcrumbs */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center text-sm font-medium text-slate-500 mb-4 gap-1">
          <button onClick={() => { setFmt(null); setTopic(null); setFolder(null); }} className={!fmt ? 'text-blue-600' : 'hover:text-blue-600'}><span className="flex items-center gap-1"><SI size={16} />{subject.name}</span></button>
          {fmt && <><ChevronRight size={16} className="text-slate-300" /><button onClick={() => { setTopic(null); setFolder(null); }} className={!topic && !folder ? 'text-blue-600' : 'hover:text-blue-600'}>{fmt.name}</button></>}
          {topic && <><ChevronRight size={16} className="text-slate-300" /><span className="text-blue-600">{topic.name}</span></>}
          {folder && <><ChevronRight size={16} className="text-slate-300" /><span className="text-blue-600">{folder.name}</span></>}
        </div>
        <div className="flex items-center gap-4">
          {(fmt || topic || folder) && <button onClick={() => { if (topic) setTopic(null); else if (folder) setFolder(null); else setFmt(null); }} className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100"><ArrowLeft size={20} /></button>}
          <h2 className="text-2xl font-bold text-slate-800">
            {level === 'formats' && 'Оберіть формат'}
            {level === 'topics' && 'Оберіть тему'}
            {level === 'questions' && 'База питань'}
            {level === 'exam-folders' && 'Папки іспиту'}
            {level === 'exam-questions' && 'Питання іспиту'}
          </h2>
        </div>
      </div>

      <div className="p-6 flex-1 bg-slate-50/50">
        {level === 'formats' && <FormatsGrid subjectId={subject.id} onSelect={setFmt} />}
        {level === 'topics' && <TopicsTable subjectId={subject.id} formatTable={fmt.table} onSelect={setTopic} />}
        {level === 'questions' && fmt.id === 'pairs' && <PairsView sid={subject.id} tag={topic.tag} />}
        {level === 'questions' && fmt.id === 'blitz' && <BlitzView sid={subject.id} tag={topic.tag} />}
        {level === 'questions' && fmt.id === 'gallery' && <GalleryView sid={subject.id} tag={topic.tag} />}
        {level === 'questions' && fmt.id === 'sevens' && <SevensView sid={subject.id} tag={topic.tag} />}
        {level === 'questions' && (fmt.id === 'express' || fmt.id === 'thematic') && <ExpressView sid={subject.id} tag={topic.tag} />}
        {level === 'exam-folders' && <ExamFoldersView sid={subject.id} onSelect={setFolder} />}
        {level === 'exam-questions' && <ExamQuestionsView sid={subject.id} folder={folder} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// FORMATS GRID — real counts from each table
// ══════════════════════════════════════════════════════════════════════════
function FormatsGrid({ subjectId, onSelect }) {
  const [counts, setCounts] = useState({});
  useEffect(() => {
    Promise.all(FORMATS.filter(f => f.table).map(async f => {
      const { count } = await supabase.from(f.table).select('*', { count: 'exact', head: true }).eq(f.table === 'exam_questions' ? 'subject_id' : 'subject_id', subjectId).eq('is_active', true);
      return [f.id, count || 0];
    })).then(entries => setCounts(Object.fromEntries(entries)));
  }, [subjectId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {FORMATS.map(f => (
        <div key={f.id} onClick={() => onSelect(f)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-3 rounded-xl transition-colors ${f.isExam ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
              {f.isExam ? <Trophy size={24} /> : <Layers size={24} />}
            </div>
            <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
          </div>
          <h3 className="font-semibold text-slate-800 text-lg group-hover:text-blue-700 mb-1">{f.name}</h3>
          <p className="text-sm text-slate-500 mb-4">{f.desc}</p>
          <div className="pt-3 border-t border-slate-50 mt-auto flex items-center gap-1.5">
            <FileQuestion size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500">Питань: <strong className="text-slate-700">{counts[f.id] ?? '...'}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TOPICS TABLE — with counts from correct format table
// ══════════════════════════════════════════════════════════════════════════
function TopicsTable({ subjectId, formatTable, onSelect }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');

  async function load() {
    setLoading(true);
    const { data: t } = await supabase.from('topics').select('*').eq('subject_id', subjectId).eq('is_active', true).order('sort_order');
    const { data: q } = await supabase.from(formatTable).select('topic_tag').eq('subject_id', subjectId).eq('is_active', true);
    const c = {};
    (q || []).forEach(r => { c[r.topic_tag] = (c[r.topic_tag] || 0) + 1; });
    setTopics((t || []).map(tp => ({ ...tp, cnt: c[tp.tag] || 0 })));
    setLoading(false);
  }
  useEffect(() => { load(); }, [subjectId, formatTable]);

  function slugify(s) { return s.toLowerCase().replace(/[іїєґ]/g, c=>({і:'i',ї:'yi',є:'ye',ґ:'g'}[c]||c)).replace(/[а-яё]/g, c=>{const m='абвгдежзийклмнопрстуфхцчшщъыьэюя';const l='abvgdezhziyklmnoprstufkhtschchshschyyyeyuya'.match(/.{1,2}/g)||[];const i=m.indexOf(c);return i>=0?(l[i]||''):c;}).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }

  async function addTopic(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const tag = newTag.trim() || slugify(newName.trim());
    await supabase.from('topics').insert({ name: newName.trim(), tag, subject_id: subjectId, sort_order: topics.length, is_active: true });
    setNewName(''); setNewTag(''); setShowAdd(false); load();
  }

  async function deleteTopic(id) {
    if (!confirm('Деактивувати тему?')) return;
    await supabase.from('topics').update({ is_active: false }).eq('id', id);
    load();
  }

  async function renameTopic(id, name) {
    await supabase.from('topics').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
    setEditId(null); load();
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Тем: <strong>{topics.length}</strong></span>
        <Btn onClick={() => setShowAdd(!showAdd)}><Plus size={16} /> Додати тему</Btn>
      </div>

      {showAdd && (
        <form onSubmit={addTopic} className="bg-white border border-emerald-200 rounded-xl p-4 flex gap-3 items-end shadow-sm">
          <div className="flex-1"><label className="block text-sm font-medium text-slate-600 mb-1">Назва теми</label>
            <input value={newName} onChange={e => { setNewName(e.target.value); if (!newTag) setNewTag(''); }} className="inp w-full" placeholder="Київська Русь" required /></div>
          <div className="w-48"><label className="block text-sm font-medium text-slate-600 mb-1">Тег (авто)</label>
            <input value={newTag || slugify(newName)} onChange={e => setNewTag(e.target.value)} className="inp w-full" placeholder="kyivska_rus" /></div>
          <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"><Check size={16} /></button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"><X size={16} /></button>
        </form>
      )}

      {!topics.length && !showAdd ? <Empty text="Теми не знайдено. Додайте першу тему." /> : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr><th className="px-6 py-4 font-medium">#</th><th className="px-6 py-4 font-medium">Назва теми</th><th className="px-6 py-4 font-medium">Тег</th><th className="px-6 py-4 font-medium">Питань</th><th className="px-6 py-4 font-medium text-right">Дії</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {topics.map(tp => (
                <tr key={tp.id} className="hover:bg-slate-50/80 group">
                  <td className="px-6 py-4 text-slate-400 text-xs">{tp.sort_order}</td>
                  <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                    <FolderOpen size={18} className="text-slate-400" />
                    {editId === tp.id ? (
                      <form onSubmit={e => { e.preventDefault(); renameTopic(tp.id, e.target.elements.n.value); }} className="flex gap-2">
                        <input name="n" defaultValue={tp.name} className="inp" autoFocus />
                        <button type="submit" className="text-emerald-600"><Check size={16} /></button>
                        <button type="button" onClick={() => setEditId(null)} className="text-slate-400"><X size={16} /></button>
                      </form>
                    ) : tp.name}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs font-mono">{tp.tag}</td>
                  <td className="px-6 py-4"><span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full text-xs font-semibold">{tp.cnt}</span></td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button onClick={() => onSelect(tp)} className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-medium transition-colors">Відкрити</button>
                    <Abtn icon={<Edit size={16} />} onClick={() => setEditId(tp.id)} />
                    <Abtn icon={<Trash2 size={16} />} danger onClick={() => deleteTopic(tp.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXPRESS / THEMATIC (standard 4-option questions)
// ══════════════════════════════════════════════════════════════════════════
function ExpressView({ sid, tag }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formId, setFormId] = useState(null); // null=hidden, 'new'=add, uuid=edit

  async function load() { setLoading(true); const { data } = await supabase.from('questions').select('*').eq('subject_id', sid).eq('topic_tag', tag).eq('is_active', true).order('updated_at', { ascending: false }).limit(200); setItems(data || []); setLoading(false); }
  useEffect(() => { load(); }, [sid, tag]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span>
        <Btn onClick={() => setFormId('new')}><Plus size={16} /> Додати</Btn>
      </div>
      {formId && <ExpressForm sid={sid} tag={tag} qid={formId === 'new' ? null : formId} onDone={() => { setFormId(null); load(); }} onCancel={() => setFormId(null)} />}
      <Table heads={['#','Текст','Відповідь','Складність','']}>
        {items.map((q, i) => (
          <tr key={q.id} className="hover:bg-slate-50/80 group">
            <td className="px-6 py-4 text-slate-400 text-xs text-center">{i+1}</td>
            <td className="px-6 py-4 font-medium text-slate-800 max-w-md"><div className="line-clamp-2">{q.question_text}</div></td>
            <td className="px-6 py-4"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold">{String.fromCharCode(65+q.correct_index)}</span></td>
            <td className="px-6 py-4"><DiffBadge d={q.difficulty} /></td>
            <td className="px-6 py-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100">
              <Abtn icon={<Edit size={16} />} onClick={() => setFormId(q.id)} />
              <Abtn icon={<Trash2 size={16} />} danger onClick={async () => { if(!confirm('Деактивувати?')) return; await supabase.from('questions').update({is_active:false}).eq('id',q.id); load(); }} />
            </td>
          </tr>
        ))}
      </Table>
      {!items.length && <Empty text="Немає питань" />}
    </div>
  );
}

function ExpressForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ question_text:'', options:['','','',''], correct_index:0, explanation:'', difficulty:1, source_year:'', image_url:'' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if(qid) supabase.from('questions').select('*').eq('id',qid).single().then(({data:d}) => { if(d) setF({ question_text:d.question_text||'', options:d.options||['','','',''], correct_index:d.correct_index||0, explanation:d.explanation||'', difficulty:d.difficulty||1, source_year:d.source_year?.toString()||'', image_url:d.image_url||'' }); }); }, [qid]);

  async function submit(e) { e.preventDefault(); setSaving(true);
    const p = { question_text:f.question_text, options:f.options, correct_index:f.correct_index, explanation:f.explanation, difficulty:f.difficulty, source_year:f.source_year?parseInt(f.source_year):null, image_url:f.image_url||null, subject_id:sid, topic_tag:tag, format:'single_choice', is_active:true, status:'verified', updated_at:new Date().toISOString() };
    if(qid) await supabase.from('questions').update(p).eq('id',qid); else await supabase.from('questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <form onSubmit={submit} className="bg-white border border-blue-200 rounded-xl p-6 space-y-4 shadow-sm">
      <FormHeader title={qid ? 'Редагувати' : 'Нове питання'} onCancel={onCancel} />
      <Field label="Текст питання"><textarea value={f.question_text} onChange={e=>setF({...f,question_text:e.target.value})} className="inp min-h-[80px]" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        {f.options.map((o,i) => (
          <div key={i} className="flex gap-2">
            <input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1" placeholder={`Варіант ${String.fromCharCode(65+i)}`} required />
            <CheckBtn active={i===f.correct_index} onClick={()=>setF({...f,correct_index:i})} />
          </div>
        ))}
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})} />
      <div className="flex gap-4">
        <DiffSelect value={f.difficulty} onChange={v=>setF({...f,difficulty:v})} />
        <Field label="Рік"><input value={f.source_year} onChange={e=>setF({...f,source_year:e.target.value})} className="inp w-24" placeholder="2024" /></Field>
      </div>
      <FormFooter saving={saving} onCancel={onCancel} />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BLITZ (true/false)
// ══════════════════════════════════════════════════════════════════════════
function BlitzView({ sid, tag }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [formId, setFormId] = useState(null);
  async function load() { setLoading(true); const{data}=await supabase.from('blitz_questions').select('*').eq('subject_id',sid).eq('topic_tag',tag).eq('is_active',true).order('updated_at',{ascending:false}); setItems(data||[]); setLoading(false); }
  useEffect(()=>{load();},[sid,tag]);
  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span><Btn onClick={()=>setFormId('new')}><Plus size={16}/> Додати</Btn></div>
      {formId && <BlitzForm sid={sid} tag={tag} qid={formId==='new'?null:formId} onDone={()=>{setFormId(null);load();}} onCancel={()=>setFormId(null)} />}
      <Table heads={['#','Твердження','Відповідь','']}>
        {items.map((q,i)=>(
          <tr key={q.id} className="hover:bg-slate-50/80 group">
            <td className="px-6 py-4 text-slate-400 text-xs text-center">{i+1}</td>
            <td className="px-6 py-4 font-medium text-slate-800 max-w-lg"><div className="line-clamp-2">{q.text}</div></td>
            <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${q.is_true?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>{q.is_true?'ТАК':'НІ'}</span></td>
            <td className="px-6 py-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100">
              <Abtn icon={<Edit size={16}/>} onClick={()=>setFormId(q.id)} />
              <Abtn icon={<Trash2 size={16}/>} danger onClick={async()=>{if(!confirm('Деактивувати?'))return;await supabase.from('blitz_questions').update({is_active:false}).eq('id',q.id);load();}} />
            </td>
          </tr>
        ))}
      </Table>
      {!items.length && <Empty text="Немає тверджень" />}
    </div>
  );
}

function BlitzForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ text:'', is_true:true, explanation:'', difficulty:1, image_url:'' });
  const [saving, setSaving] = useState(false);
  useEffect(()=>{if(qid) supabase.from('blitz_questions').select('*').eq('id',qid).single().then(({data:d})=>{if(d) setF({text:d.text,is_true:d.is_true,explanation:d.explanation||'',difficulty:d.difficulty,image_url:d.image_url||''});});}, [qid]);
  async function submit(e){e.preventDefault();setSaving(true);
    const p={text:f.text,is_true:f.is_true,explanation:f.explanation,difficulty:f.difficulty,image_url:f.image_url||null,subject_id:sid,topic_tag:tag,is_active:true,updated_at:new Date().toISOString()};
    if(qid) await supabase.from('blitz_questions').update(p).eq('id',qid); else await supabase.from('blitz_questions').insert(p);
    setSaving(false);onDone();}
  return (
    <form onSubmit={submit} className="bg-white border border-orange-200 rounded-xl p-6 space-y-4 shadow-sm">
      <FormHeader title="Бліц: Так/Ні" onCancel={onCancel} />
      <Field label="Твердження"><textarea value={f.text} onChange={e=>setF({...f,text:e.target.value})} className="inp min-h-[60px]" required /></Field>
      <div className="flex gap-4 items-center">
        <span className="text-sm font-medium text-slate-600">Відповідь:</span>
        <button type="button" onClick={()=>setF({...f,is_true:true})} className={`px-4 py-2 rounded-lg text-sm font-bold ${f.is_true?'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400':'bg-slate-100 text-slate-500'}`}>ТАК</button>
        <button type="button" onClick={()=>setF({...f,is_true:false})} className={`px-4 py-2 rounded-lg text-sm font-bold ${!f.is_true?'bg-red-100 text-red-700 ring-2 ring-red-400':'bg-slate-100 text-slate-500'}`}>НІ</button>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})} />
      <FormFooter saving={saving} onCancel={onCancel} color="orange" />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOGICAL PAIRS (4↔4 matching)
// ══════════════════════════════════════════════════════════════════════════
function PairsView({ sid, tag }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [formId, setFormId] = useState(null);
  async function load() { setLoading(true); const{data}=await supabase.from('logical_pairs_questions').select('*').eq('subject_id',sid).eq('topic_tag',tag).eq('is_active',true).order('updated_at',{ascending:false}); setItems(data||[]); setLoading(false); }
  useEffect(()=>{load();},[sid,tag]);
  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span><Btn onClick={()=>setFormId('new')}><Plus size={16}/> Додати</Btn></div>
      {formId && <PairsForm sid={sid} tag={tag} qid={formId==='new'?null:formId} onDone={()=>{setFormId(null);load();}} onCancel={()=>setFormId(null)} />}
      <div className="space-y-3">
        {items.map((q,i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md group">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-slate-500">#{i+1} — {q.instruction}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Abtn icon={<Edit size={16}/>} onClick={()=>setFormId(q.id)} />
                <Abtn icon={<Trash2 size={16}/>} danger onClick={async()=>{if(!confirm('Деактивувати?'))return;await supabase.from('logical_pairs_questions').update({is_active:false}).eq('id',q.id);load();}} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">{(q.left_items||[]).map((it,j)=>(<div key={j} className="flex items-center gap-2 text-sm"><span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{it.id}</span><span>{it.text}</span></div>))}</div>
              <div className="space-y-1">{(q.right_items||[]).map((it,j)=>(<div key={j} className="flex items-center gap-2 text-sm"><span className="w-6 h-6 rounded bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{it.id}</span><span>{it.text}</span></div>))}</div>
            </div>
          </div>
        ))}
      </div>
      {!items.length && <Empty text="Немає пар" />}
    </div>
  );
}

function PairsForm({ sid, tag, qid, onDone, onCancel }) {
  const RID = ['А','Б','В','Г'];
  const [f, setF] = useState({ instruction:'Встановіть відповідність', left:['','','',''], right:['','','',''], pairs:{'1':'А','2':'Б','3':'В','4':'Г'}, explanation:'', difficulty:1, image_url:'' });
  const [saving, setSaving] = useState(false);
  useEffect(()=>{if(qid) supabase.from('logical_pairs_questions').select('*').eq('id',qid).single().then(({data:d})=>{if(d) setF({instruction:d.instruction,left:(d.left_items||[]).map(i=>i.text),right:(d.right_items||[]).map(i=>i.text),pairs:d.correct_pairs||{'1':'А','2':'Б','3':'В','4':'Г'},explanation:d.explanation||'',difficulty:d.difficulty,image_url:d.image_url||''});});}, [qid]);
  async function submit(e){e.preventDefault();setSaving(true);
    const p={instruction:f.instruction,left_items:f.left.map((t,i)=>({id:String(i+1),text:t})),right_items:f.right.map((t,i)=>({id:RID[i],text:t})),correct_pairs:f.pairs,explanation:f.explanation,difficulty:f.difficulty,image_url:f.image_url||null,subject_id:sid,topic_tag:tag,is_active:true,updated_at:new Date().toISOString()};
    if(qid) await supabase.from('logical_pairs_questions').update(p).eq('id',qid); else await supabase.from('logical_pairs_questions').insert(p);
    setSaving(false);onDone();}
  return (
    <form onSubmit={submit} className="bg-white border border-indigo-200 rounded-xl p-6 space-y-4 shadow-sm">
      <FormHeader title="Логічні пари" onCancel={onCancel} />
      <Field label="Інструкція"><input value={f.instruction} onChange={e=>setF({...f,instruction:e.target.value})} className="inp" /></Field>
      <div className="grid grid-cols-2 gap-6">
        <div><label className="block text-sm font-medium text-slate-600 mb-2">Ліва колонка</label>{f.left.map((v,i)=>(<div key={i} className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i+1}</span><input value={v} onChange={e=>{const l=[...f.left];l[i]=e.target.value;setF({...f,left:l});}} className="inp flex-1" required /><select value={f.pairs[String(i+1)]||RID[i]} onChange={e=>{const p={...f.pairs};p[String(i+1)]=e.target.value;setF({...f,pairs:p});}} className="inp w-16">{RID.map(r=><option key={r} value={r}>{r}</option>)}</select></div>))}</div>
        <div><label className="block text-sm font-medium text-slate-600 mb-2">Права колонка</label>{f.right.map((v,i)=>(<div key={i} className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">{RID[i]}</span><input value={v} onChange={e=>{const r=[...f.right];r[i]=e.target.value;setF({...f,right:r});}} className="inp flex-1" required /></div>))}</div>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})} />
      <FormFooter saving={saving} onCancel={onCancel} color="indigo" />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GALLERY (image + 4 options)
// ══════════════════════════════════════════════════════════════════════════
function GalleryView({ sid, tag }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [formId, setFormId] = useState(null);
  async function load() { setLoading(true); const{data}=await supabase.from('gallery_questions').select('*').eq('subject_id',sid).eq('topic_tag',tag).eq('is_active',true).order('updated_at',{ascending:false}); setItems(data||[]); setLoading(false); }
  useEffect(()=>{load();},[sid,tag]);
  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span><Btn onClick={()=>setFormId('new')}><Plus size={16}/> Додати</Btn></div>
      {formId && <GalleryForm sid={sid} tag={tag} qid={formId==='new'?null:formId} onDone={()=>{setFormId(null);load();}} onCancel={()=>setFormId(null)} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((q,i)=>(<div key={q.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md group">
          <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400">{q.image_url?<img src={q.image_url} className="h-full w-full object-cover" alt=""/>:<span className="text-sm">{q.image_hint||'Зображення'}</span>}</div>
          <div className="p-4"><div className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{q.question_text}</div>
            <div className="flex gap-1 flex-wrap">{(q.options||[]).map((o,j)=>(<span key={j} className={`text-xs px-2 py-0.5 rounded ${j===q.correct_index?'bg-emerald-100 text-emerald-700 font-bold':'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65+j)}: {o.substring(0,25)}</span>))}</div>
            <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100"><Abtn icon={<Edit size={14}/>} onClick={()=>setFormId(q.id)} /><Abtn icon={<Trash2 size={14}/>} danger onClick={async()=>{if(!confirm('Деактивувати?'))return;await supabase.from('gallery_questions').update({is_active:false}).eq('id',q.id);load();}} /></div>
          </div>
        </div>))}
      </div>
      {!items.length && <Empty text="Немає питань" />}
    </div>
  );
}

function GalleryForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ question_text:'', options:['','','',''], correct_index:0, image_url:'', image_category:'architecture', image_hint:'', explanation:'', difficulty:1 });
  const [saving, setSaving] = useState(false);
  useEffect(()=>{if(qid) supabase.from('gallery_questions').select('*').eq('id',qid).single().then(({data:d})=>{if(d) setF({question_text:d.question_text,options:d.options||['','','',''],correct_index:d.correct_index,image_url:d.image_url||'',image_category:d.image_category,image_hint:d.image_hint||'',explanation:d.explanation||'',difficulty:d.difficulty});});}, [qid]);
  async function submit(e){e.preventDefault();setSaving(true);
    const p={question_text:f.question_text,options:f.options,correct_index:f.correct_index,image_url:f.image_url||null,image_category:f.image_category,image_hint:f.image_hint,explanation:f.explanation,difficulty:f.difficulty,subject_id:sid,topic_tag:tag,is_active:true,updated_at:new Date().toISOString()};
    if(qid) await supabase.from('gallery_questions').update(p).eq('id',qid); else await supabase.from('gallery_questions').insert(p);
    setSaving(false);onDone();}
  return (
    <form onSubmit={submit} className="bg-white border border-purple-200 rounded-xl p-6 space-y-4 shadow-sm">
      <FormHeader title="Галерея" onCancel={onCancel} />
      <ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})} />
      <Field label="Текст питання"><textarea value={f.question_text} onChange={e=>setF({...f,question_text:e.target.value})} className="inp min-h-[60px]" required /></Field>
      <div className="grid grid-cols-2 gap-3">{f.options.map((o,i)=>(<div key={i} className="flex gap-2"><input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1" placeholder={`Варіант ${String.fromCharCode(65+i)}`} required /><CheckBtn active={i===f.correct_index} onClick={()=>setF({...f,correct_index:i})} /></div>))}</div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={2} /></Field>
      <FormFooter saving={saving} onCancel={onCancel} color="purple" />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SEVENS (3 of 7)
// ══════════════════════════════════════════════════════════════════════════
function SevensView({ sid, tag }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [formId, setFormId] = useState(null);
  async function load() { setLoading(true); const{data}=await supabase.from('seven_questions').select('*').eq('subject_id',sid).eq('topic_tag',tag).eq('is_active',true).order('updated_at',{ascending:false}); setItems(data||[]); setLoading(false); }
  useEffect(()=>{load();},[sid,tag]);
  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><span className="text-sm text-slate-500">Знайдено: <strong>{items.length}</strong></span><Btn onClick={()=>setFormId('new')}><Plus size={16}/> Додати</Btn></div>
      {formId && <SevensForm sid={sid} tag={tag} qid={formId==='new'?null:formId} onDone={()=>{setFormId(null);load();}} onCancel={()=>setFormId(null)} />}
      <Table heads={['#','Питання','Варіанти','']}>
        {items.map((q,i)=>(<tr key={q.id} className="hover:bg-slate-50/80 group">
          <td className="px-6 py-4 text-slate-400 text-xs text-center">{i+1}</td>
          <td className="px-6 py-4 font-medium text-slate-800 max-w-sm"><div className="line-clamp-2">{q.text}</div></td>
          <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{(q.options||[]).map((o,j)=>(<span key={j} className={`text-xs px-2 py-0.5 rounded ${(q.correct_answers||[]).includes(j)?'bg-emerald-100 text-emerald-700 font-bold':'bg-slate-100 text-slate-500'}`}>{o.substring(0,20)}</span>))}</div></td>
          <td className="px-6 py-4 flex justify-end gap-1 opacity-0 group-hover:opacity-100"><Abtn icon={<Edit size={16}/>} onClick={()=>setFormId(q.id)} /><Abtn icon={<Trash2 size={16}/>} danger onClick={async()=>{if(!confirm('Деактивувати?'))return;await supabase.from('seven_questions').update({is_active:false}).eq('id',q.id);load();}} /></td>
        </tr>))}
      </Table>
      {!items.length && <Empty text="Немає питань" />}
    </div>
  );
}

function SevensForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ text:'', options:['','','','','','',''], correct_answers:[0,1,2], explanation:'', difficulty:1, image_url:'' });
  const [saving, setSaving] = useState(false);
  useEffect(()=>{if(qid) supabase.from('seven_questions').select('*').eq('id',qid).single().then(({data:d})=>{if(d) setF({text:d.text,options:d.options||['','','','','','',''],correct_answers:d.correct_answers||[0,1,2],explanation:d.explanation||'',difficulty:d.difficulty,image_url:d.image_url||''});});}, [qid]);
  function toggle(idx){const ca=[...f.correct_answers];if(ca.includes(idx)){if(ca.length>1)setF({...f,correct_answers:ca.filter(i=>i!==idx)});}else{if(ca.length<3)setF({...f,correct_answers:[...ca,idx].sort()});}}
  async function submit(e){e.preventDefault();if(f.correct_answers.length!==3){alert('Оберіть рівно 3 правильні');return;}setSaving(true);
    const p={text:f.text,options:f.options,correct_answers:f.correct_answers,explanation:f.explanation,difficulty:f.difficulty,image_url:f.image_url||null,subject_id:sid,topic_tag:tag,is_active:true,updated_at:new Date().toISOString()};
    if(qid) await supabase.from('seven_questions').update(p).eq('id',qid); else await supabase.from('seven_questions').insert(p);
    setSaving(false);onDone();}
  return (
    <form onSubmit={submit} className="bg-white border border-teal-200 rounded-xl p-6 space-y-4 shadow-sm">
      <FormHeader title="Сімки: 3 з 7" onCancel={onCancel} />
      <Field label="Текст питання"><textarea value={f.text} onChange={e=>setF({...f,text:e.target.value})} className="inp min-h-[60px]" required /></Field>
      <div><label className="block text-sm font-medium text-slate-600 mb-2">7 варіантів (позначте 3 правильні)</label>
        {f.options.map((o,i)=>(<div key={i} className="flex items-center gap-2 mb-2"><span className="text-xs text-slate-400 w-4">{i+1}.</span><input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1" required /><CheckBtn active={f.correct_answers.includes(i)} onClick={()=>toggle(i)} /></div>))}
        <div className="text-xs text-slate-500">Обрано: {f.correct_answers.length}/3</div>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})} />
      <FormFooter saving={saving} onCancel={onCancel} color="teal" />
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EXAM MAX — custom folders with mixed question types
// ══════════════════════════════════════════════════════════════════════════
function ExamFoldersView({ sid, onSelect }) {
  const [folders, setFolders] = useState([]); const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  async function load() { setLoading(true); const{data}=await supabase.from('exam_folders').select('*').eq('subject_id',sid).eq('is_active',true).order('sort_order');
    // get question counts
    const{data:qd}=await supabase.from('exam_questions').select('folder_id').eq('subject_id',sid).eq('is_active',true);
    const c={};(qd||[]).forEach(r=>{c[r.folder_id]=(c[r.folder_id]||0)+1;});
    setFolders((data||[]).map(f=>({...f,cnt:c[f.id]||0}))); setLoading(false);
  }
  useEffect(()=>{load();},[sid]);

  async function addFolder(e){e.preventDefault();if(!newName.trim())return;
    await supabase.from('exam_folders').insert({name:newName.trim(),subject_id:sid,sort_order:folders.length});
    setNewName('');load();}
  async function delFolder(id){if(!confirm('Видалити папку і всі питання?'))return;
    await supabase.from('exam_questions').delete().eq('folder_id',id);
    await supabase.from('exam_folders').delete().eq('id',id);load();}

  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <form onSubmit={addFolder} className="flex gap-3">
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Назва нової папки..." className="inp flex-1" />
        <Btn type="submit"><Plus size={16}/> Створити папку</Btn>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map(f=>(
          <div key={f.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all group" onClick={()=>onSelect(f)}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white"><FolderOpen size={24}/></div>
              <div className="flex gap-1">
                <Abtn icon={<Trash2 size={14}/>} danger onClick={e=>{e.stopPropagation();delFolder(f.id);}} />
                <ChevronRight className="text-slate-300 group-hover:text-amber-500" />
              </div>
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

function ExamQuestionsView({ sid, folder }) {
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState(null); // null | 'single_choice' | 'blitz' | 'pairs' | 'gallery' | 'sevens'

  async function load() { setLoading(true); const{data}=await supabase.from('exam_questions').select('*').eq('folder_id',folder.id).eq('is_active',true).order('sort_order'); setItems(data||[]); setLoading(false); }
  useEffect(()=>{load();},[folder.id]);

  async function addQuestion(type, questionData) {
    await supabase.from('exam_questions').insert({ folder_id:folder.id, subject_id:sid, question_type:type, question_data:questionData, sort_order:items.length, is_active:true });
    setAddType(null); load();
  }

  if(loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Папка: <strong>{folder.name}</strong> — {items.length} питань</span>
        <div className="flex gap-2">
          {[['single_choice','Тест'],['blitz','Бліц'],['pairs','Пари'],['gallery','Галерея'],['sevens','Сімка']].map(([t,l])=>(
            <button key={t} onClick={()=>setAddType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${addType===t?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>+ {l}</button>
          ))}
        </div>
      </div>

      {addType === 'single_choice' && <ExamSingleForm onSave={d=>addQuestion('single_choice',d)} onCancel={()=>setAddType(null)} />}
      {addType === 'blitz' && <ExamBlitzForm onSave={d=>addQuestion('blitz',d)} onCancel={()=>setAddType(null)} />}
      {addType === 'pairs' && <ExamPairsForm onSave={d=>addQuestion('pairs',d)} onCancel={()=>setAddType(null)} />}
      {addType === 'gallery' && <ExamGalleryForm onSave={d=>addQuestion('gallery',d)} onCancel={()=>setAddType(null)} />}
      {addType === 'sevens' && <ExamSevensForm onSave={d=>addQuestion('sevens',d)} onCancel={()=>setAddType(null)} />}

      <div className="space-y-2">
        {items.map((q,i) => {
          const d = q.question_data || {};
          const typeLabels = {single_choice:'Тест',blitz:'Бліц',pairs:'Пари',gallery:'Галерея',sevens:'Сімка'};
          const typeColors = {single_choice:'blue',blitz:'orange',pairs:'indigo',gallery:'purple',sevens:'teal'};
          const c = typeColors[q.question_type]||'slate';
          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:shadow-sm group">
              <span className="text-xs text-slate-400 mt-1">{i+1}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${c}-100 text-${c}-700 shrink-0`}>{typeLabels[q.question_type]||q.question_type}</span>
              <div className="flex-1 text-sm text-slate-700 line-clamp-2">{d.text || d.question_text || d.instruction || '...'}</div>
              <Abtn icon={<Trash2 size={14}/>} danger onClick={async()=>{await supabase.from('exam_questions').update({is_active:false}).eq('id',q.id);load();}} />
            </div>
          );
        })}
      </div>
      {!items.length && <Empty text="Додайте питання будь-якого типу" />}
    </div>
  );
}

// Mini forms for exam questions (simplified, save to question_data JSONB)
function ExamSingleForm({onSave,onCancel}){const[f,setF]=useState({question_text:'',options:['','','',''],correct_index:0,explanation:'',image_url:''});
  return <form onSubmit={e=>{e.preventDefault();onSave(f);}} className="bg-white border border-blue-200 rounded-xl p-5 space-y-3"><FormHeader title="Тест (4 варіанти)" onCancel={onCancel}/><Field label="Питання"><textarea value={f.question_text} onChange={e=>setF({...f,question_text:e.target.value})} className="inp min-h-[60px]" required/></Field><div className="grid grid-cols-2 gap-2">{f.options.map((o,i)=>(<div key={i} className="flex gap-1"><input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1 text-xs" placeholder={String.fromCharCode(65+i)} required/><CheckBtn active={i===f.correct_index} onClick={()=>setF({...f,correct_index:i})}/></div>))}</div><Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={1}/></Field><ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})}/><FormFooter saving={false} onCancel={onCancel}/></form>;}

function ExamBlitzForm({onSave,onCancel}){const[f,setF]=useState({text:'',is_true:true,explanation:'',image_url:''});
  return <form onSubmit={e=>{e.preventDefault();onSave(f);}} className="bg-white border border-orange-200 rounded-xl p-5 space-y-3"><FormHeader title="Бліц" onCancel={onCancel}/><Field label="Твердження"><textarea value={f.text} onChange={e=>setF({...f,text:e.target.value})} className="inp" required/></Field><div className="flex gap-3"><button type="button" onClick={()=>setF({...f,is_true:true})} className={`px-3 py-1 rounded text-sm font-bold ${f.is_true?'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400':'bg-slate-100 text-slate-500'}`}>ТАК</button><button type="button" onClick={()=>setF({...f,is_true:false})} className={`px-3 py-1 rounded text-sm font-bold ${!f.is_true?'bg-red-100 text-red-700 ring-2 ring-red-400':'bg-slate-100 text-slate-500'}`}>НІ</button></div><Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={1}/></Field><ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})}/><FormFooter saving={false} onCancel={onCancel} color="orange"/></form>;}

function ExamPairsForm({onSave,onCancel}){const R=['А','Б','В','Г'];const[f,setF]=useState({instruction:'Встановіть відповідність',left:['','','',''],right:['','','',''],pairs:{'1':'А','2':'Б','3':'В','4':'Г'},explanation:'',image_url:''});
  return <form onSubmit={e=>{e.preventDefault();onSave({...f,left_items:f.left.map((t,i)=>({id:String(i+1),text:t})),right_items:f.right.map((t,i)=>({id:R[i],text:t})),correct_pairs:f.pairs});}} className="bg-white border border-indigo-200 rounded-xl p-5 space-y-3"><FormHeader title="Пари" onCancel={onCancel}/><Field label="Інструкція"><input value={f.instruction} onChange={e=>setF({...f,instruction:e.target.value})} className="inp"/></Field><div className="grid grid-cols-2 gap-4"><div>{f.left.map((v,i)=>(<div key={i} className="flex gap-1 mb-1"><span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i+1}</span><input value={v} onChange={e=>{const l=[...f.left];l[i]=e.target.value;setF({...f,left:l});}} className="inp flex-1 text-xs" required/><select value={f.pairs[String(i+1)]} onChange={e=>{const p={...f.pairs};p[String(i+1)]=e.target.value;setF({...f,pairs:p});}} className="inp w-12 text-xs">{R.map(r=><option key={r}>{r}</option>)}</select></div>))}</div><div>{f.right.map((v,i)=>(<div key={i} className="flex gap-1 mb-1"><span className="w-5 h-5 rounded bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{R[i]}</span><input value={v} onChange={e=>{const r=[...f.right];r[i]=e.target.value;setF({...f,right:r});}} className="inp flex-1 text-xs" required/></div>))}</div></div><Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={1}/></Field><ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})}/><FormFooter saving={false} onCancel={onCancel} color="indigo"/></form>;}

function ExamGalleryForm({onSave,onCancel}){const[f,setF]=useState({question_text:'',options:['','','',''],correct_index:0,image_url:'',explanation:''});
  return <form onSubmit={e=>{e.preventDefault();onSave(f);}} className="bg-white border border-purple-200 rounded-xl p-5 space-y-3"><FormHeader title="Галерея" onCancel={onCancel}/><ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})}/><Field label="Питання"><textarea value={f.question_text} onChange={e=>setF({...f,question_text:e.target.value})} className="inp" required/></Field><div className="grid grid-cols-2 gap-2">{f.options.map((o,i)=>(<div key={i} className="flex gap-1"><input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1 text-xs" required/><CheckBtn active={i===f.correct_index} onClick={()=>setF({...f,correct_index:i})}/></div>))}</div><Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={1}/></Field><FormFooter saving={false} onCancel={onCancel} color="purple"/></form>;}

function ExamSevensForm({onSave,onCancel}){const[f,setF]=useState({text:'',options:['','','','','','',''],correct_answers:[0,1,2],explanation:'',image_url:''});
  function tog(i){const ca=[...f.correct_answers];if(ca.includes(i)){if(ca.length>1)setF({...f,correct_answers:ca.filter(x=>x!==i)});}else{if(ca.length<3)setF({...f,correct_answers:[...ca,i].sort()});}}
  return <form onSubmit={e=>{e.preventDefault();if(f.correct_answers.length!==3){alert('Оберіть 3');return;}onSave(f);}} className="bg-white border border-teal-200 rounded-xl p-5 space-y-3"><FormHeader title="Сімка" onCancel={onCancel}/><Field label="Питання"><textarea value={f.text} onChange={e=>setF({...f,text:e.target.value})} className="inp" required/></Field><div>{f.options.map((o,i)=>(<div key={i} className="flex gap-1 mb-1"><span className="text-xs text-slate-400 w-4">{i+1}.</span><input value={o} onChange={e=>{const opts=[...f.options];opts[i]=e.target.value;setF({...f,options:opts});}} className="inp flex-1 text-xs" required/><CheckBtn active={f.correct_answers.includes(i)} onClick={()=>tog(i)}/></div>))}<div className="text-xs text-slate-500">Обрано: {f.correct_answers.length}/3</div></div><Field label="Пояснення"><textarea value={f.explanation} onChange={e=>setF({...f,explanation:e.target.value})} className="inp" rows={1}/></Field><ImageField value={f.image_url} onChange={v=>setF({...f,image_url:v})}/><FormFooter saving={false} onCancel={onCancel} color="teal"/></form>;}

// ══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════
function SidebarItem({icon,label,active,onClick}){return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active?'bg-blue-50 text-blue-700 font-medium':'text-slate-600 hover:bg-slate-50'}`}><span className={active?'text-blue-600':'text-slate-400'}>{icon}</span>{label}</button>;}
function StatCard({icon,label,value,color,isLive}){const cm={blue:'bg-blue-50 text-blue-600',emerald:'bg-emerald-50 text-emerald-600',indigo:'bg-indigo-50 text-indigo-600'};return <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"><div className="flex justify-between items-start"><div className={`p-2.5 rounded-xl ${cm[color]}`}>{React.cloneElement(icon,{size:20})}</div>{isLive&&<span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"/></span>}</div><div><div className="text-sm text-slate-500 font-medium mb-1">{label}</div><div className="text-2xl font-bold text-slate-800">{value}</div></div></div>;}
function Spinner(){return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;}
function Empty({text}){return <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">{text}</div>;}
function Btn({children,onClick,type='button'}){return <button type={type} onClick={onClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">{children}</button>;}
function Abtn({icon,danger,onClick}){return <button onClick={onClick} className={`p-2 rounded-lg transition-colors ${danger?'text-slate-400 hover:text-red-600 hover:bg-red-50':'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>{icon}</button>;}
function CheckBtn({active,onClick}){return <button type="button" onClick={onClick} className={`p-2 rounded-lg transition-colors ${active?'bg-emerald-100 text-emerald-700':'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}><Check size={16}/></button>;}
function DiffBadge({d}){const c=d===1?'bg-green-50 text-green-700 border-green-200':d===2?'bg-yellow-50 text-yellow-700 border-yellow-200':'bg-red-50 text-red-700 border-red-200';return <span className={`px-3 py-1 rounded-full text-xs font-medium border ${c}`}>{d===1?'Легка':d===2?'Середня':'Складна'}</span>;}
function DiffSelect({value,onChange}){return <div><label className="block text-sm font-medium text-slate-600 mb-1">Складність</label><select value={value} onChange={e=>onChange(parseInt(e.target.value))} className="inp"><option value={1}>Легка</option><option value={2}>Середня</option><option value={3}>Складна</option></select></div>;}
function Field({label,children}){return <div><label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>{children}</div>;}
function FormHeader({title,onCancel}){return <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800">{title}</h3><button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X size={20}/></button></div>;}
function FormFooter({saving,onCancel,color='blue'}){return <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Скасувати</button><button type="submit" disabled={saving} className={`flex items-center gap-2 px-5 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg text-sm font-medium disabled:opacity-50`}><Save size={16}/>{saving?'Збереження...':'Зберегти'}</button></div>;}
function Table({heads,children}){return <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider"><tr>{heads.map((h,i)=><th key={i} className={`px-6 py-4 font-medium ${i===heads.length-1?'text-right':''}`}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 text-sm">{children}</tbody></table></div>;}
