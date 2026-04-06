import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Save, X, Check, Plus } from 'lucide-react';
import ImageField from './ImageField';

// Shared input class
const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}

function FormWrap({ title, color = 'blue', onCancel, onSubmit, saving, children }) {
  return (
    <form onSubmit={onSubmit} className={`bg-white border border-${color}-200 rounded-xl p-6 space-y-4 shadow-sm`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>
      {children}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Скасувати</button>
        <button type="submit" disabled={saving} className={`flex items-center gap-2 px-5 py-2 bg-${color}-600 hover:bg-${color}-700 text-white rounded-lg text-sm font-medium disabled:opacity-50`}>
          <Save size={16} />{saving ? 'Збереження...' : 'Зберегти'}
        </button>
      </div>
    </form>
  );
}

function CheckBtn({ active, onClick }) {
  return <button type="button" onClick={onClick} className={`p-2 rounded-lg shrink-0 ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}><Check size={16} /></button>;
}

// ══════════════════════════════════════════════════════════════════════════
// STANDARD QUESTION (4 options)
// ══════════════════════════════════════════════════════════════════════════
export function QuestionsForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0, explanation: '', difficulty: 1, source_year: '', image_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) setF({ question_text: d.question_text || '', options: d.options || ['', '', '', ''], correct_index: d.correct_index || 0, explanation: d.explanation || '', difficulty: d.difficulty || 1, source_year: d.source_year?.toString() || '', image_url: d.image_url || '' }); }); }, [qid]);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const p = { question_text: f.question_text, options: f.options, correct_index: f.correct_index, explanation: f.explanation, difficulty: f.difficulty, source_year: f.source_year ? parseInt(f.source_year) : null, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, format: 'single_choice', is_active: true, status: 'verified', updated_at: new Date().toISOString() };
    if (qid) await supabase.from('questions').update(p).eq('id', qid); else await supabase.from('questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <FormWrap title={qid ? 'Редагувати питання' : 'Нове питання'} onCancel={onCancel} onSubmit={submit} saving={saving}>
      <Field label="Текст питання"><textarea value={f.question_text} onChange={e => setF({ ...f, question_text: e.target.value })} className={inp + ' min-h-[80px]'} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        {f.options.map((o, i) => (
          <div key={i}>
            <label className="block text-xs text-slate-500 mb-1">Варіант {String.fromCharCode(65 + i)} {i === f.correct_index && <span className="text-emerald-600">(правильний)</span>}</label>
            <div className="flex gap-2">
              <input value={o} onChange={e => { const opts = [...f.options]; opts[i] = e.target.value; setF({ ...f, options: opts }); }} className={inp} required />
              <CheckBtn active={i === f.correct_index} onClick={() => setF({ ...f, correct_index: i })} />
            </div>
          </div>
        ))}
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} className={inp} rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v => setF({ ...f, image_url: v })} />
      <div className="flex gap-4">
        <Field label="Складність"><select value={f.difficulty} onChange={e => setF({ ...f, difficulty: parseInt(e.target.value) })} className={inp + ' w-auto'}><option value={1}>Легка</option><option value={2}>Середня</option><option value={3}>Складна</option></select></Field>
        <Field label="Рік"><input value={f.source_year} onChange={e => setF({ ...f, source_year: e.target.value })} className={inp + ' w-24'} placeholder="2024" /></Field>
      </div>
    </FormWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BLITZ (true/false)
// ══════════════════════════════════════════════════════════════════════════
export function BlitzForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ text: '', is_true: true, explanation: '', difficulty: 1, image_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('blitz_questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) setF({ text: d.text, is_true: d.is_true, explanation: d.explanation || '', difficulty: d.difficulty, image_url: d.image_url || '' }); }); }, [qid]);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const p = { text: f.text, is_true: f.is_true, explanation: f.explanation, difficulty: f.difficulty, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, updated_at: new Date().toISOString() };
    if (qid) await supabase.from('blitz_questions').update(p).eq('id', qid); else await supabase.from('blitz_questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <FormWrap title="Бліц: Так/Ні" color="orange" onCancel={onCancel} onSubmit={submit} saving={saving}>
      <Field label="Твердження"><textarea value={f.text} onChange={e => setF({ ...f, text: e.target.value })} className={inp + ' min-h-[60px]'} required /></Field>
      <div className="flex gap-4 items-center">
        <span className="text-sm font-medium text-slate-600">Відповідь:</span>
        <button type="button" onClick={() => setF({ ...f, is_true: true })} className={`px-4 py-2 rounded-lg text-sm font-bold ${f.is_true ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400' : 'bg-slate-100 text-slate-500'}`}>ТАК</button>
        <button type="button" onClick={() => setF({ ...f, is_true: false })} className={`px-4 py-2 rounded-lg text-sm font-bold ${!f.is_true ? 'bg-red-100 text-red-700 ring-2 ring-red-400' : 'bg-slate-100 text-slate-500'}`}>НІ</button>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} className={inp} rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v => setF({ ...f, image_url: v })} />
    </FormWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// LOGICAL PAIRS (4↔4)
// ══════════════════════════════════════════════════════════════════════════
export function PairsForm({ sid, tag, qid, onDone, onCancel }) {
  const RID = ['А', 'Б', 'В', 'Г'];
  const [f, setF] = useState({ instruction: 'Встановіть відповідність', left: ['', '', '', ''], right: ['', '', '', ''], pairs: { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' }, explanation: '', image_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('logical_pairs_questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) setF({ instruction: d.instruction, left: (d.left_items || []).map(i => i.text), right: (d.right_items || []).map(i => i.text), pairs: d.correct_pairs || { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' }, explanation: d.explanation || '', image_url: d.image_url || '' }); }); }, [qid]);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const p = { instruction: f.instruction, left_items: f.left.map((t, i) => ({ id: String(i + 1), text: t })), right_items: f.right.map((t, i) => ({ id: RID[i], text: t })), correct_pairs: f.pairs, explanation: f.explanation, difficulty: 1, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, updated_at: new Date().toISOString() };
    if (qid) await supabase.from('logical_pairs_questions').update(p).eq('id', qid); else await supabase.from('logical_pairs_questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <FormWrap title="Логічні пари" color="indigo" onCancel={onCancel} onSubmit={submit} saving={saving}>
      <Field label="Інструкція"><input value={f.instruction} onChange={e => setF({ ...f, instruction: e.target.value })} className={inp} /></Field>
      <div className="grid grid-cols-2 gap-6">
        <div><label className="block text-sm font-medium text-slate-600 mb-2">Ліва колонка</label>
          {f.left.map((v, i) => (<div key={i} className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span><input value={v} onChange={e => { const l = [...f.left]; l[i] = e.target.value; setF({ ...f, left: l }); }} className={inp} required /><select value={f.pairs[String(i + 1)]} onChange={e => { const p = { ...f.pairs }; p[String(i + 1)] = e.target.value; setF({ ...f, pairs: p }); }} className={inp + ' w-16 shrink-0'}>{RID.map(r => <option key={r}>{r}</option>)}</select></div>))}
        </div>
        <div><label className="block text-sm font-medium text-slate-600 mb-2">Права колонка</label>
          {f.right.map((v, i) => (<div key={i} className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">{RID[i]}</span><input value={v} onChange={e => { const r = [...f.right]; r[i] = e.target.value; setF({ ...f, right: r }); }} className={inp} required /></div>))}
        </div>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} className={inp} rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v => setF({ ...f, image_url: v })} />
    </FormWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// GALLERY (image + 4 options)
// ══════════════════════════════════════════════════════════════════════════
export function GalleryForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ question_text: '', options: ['', '', '', ''], correct_index: 0, image_url: '', image_hint: '', explanation: '', difficulty: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('gallery_questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) setF({ question_text: d.question_text, options: d.options || ['', '', '', ''], correct_index: d.correct_index, image_url: d.image_url || '', image_hint: d.image_hint || '', explanation: d.explanation || '', difficulty: d.difficulty }); }); }, [qid]);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    const p = { question_text: f.question_text, options: f.options, correct_index: f.correct_index, image_url: f.image_url || null, image_hint: f.image_hint, image_category: 'architecture', explanation: f.explanation, difficulty: f.difficulty, subject_id: sid, topic_tag: tag, is_active: true, updated_at: new Date().toISOString() };
    if (qid) await supabase.from('gallery_questions').update(p).eq('id', qid); else await supabase.from('gallery_questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <FormWrap title="Галерея" color="purple" onCancel={onCancel} onSubmit={submit} saving={saving}>
      <ImageField value={f.image_url} onChange={v => setF({ ...f, image_url: v })} />
      <Field label="Текст питання"><textarea value={f.question_text} onChange={e => setF({ ...f, question_text: e.target.value })} className={inp + ' min-h-[60px]'} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        {f.options.map((o, i) => (<div key={i} className="flex gap-2"><input value={o} onChange={e => { const opts = [...f.options]; opts[i] = e.target.value; setF({ ...f, options: opts }); }} className={inp} placeholder={`Варіант ${String.fromCharCode(65 + i)}`} required /><CheckBtn active={i === f.correct_index} onClick={() => setF({ ...f, correct_index: i })} /></div>))}
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} className={inp} rows={2} /></Field>
    </FormWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// SEVENS (3 of 7)
// ══════════════════════════════════════════════════════════════════════════
export function SevensForm({ sid, tag, qid, onDone, onCancel }) {
  const [f, setF] = useState({ text: '', options: ['', '', '', '', '', '', ''], correct_answers: [0, 1, 2], explanation: '', difficulty: 1, image_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('seven_questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) setF({ text: d.text, options: d.options || ['', '', '', '', '', '', ''], correct_answers: d.correct_answers || [0, 1, 2], explanation: d.explanation || '', difficulty: d.difficulty, image_url: d.image_url || '' }); }); }, [qid]);

  function toggle(idx) { const ca = [...f.correct_answers]; if (ca.includes(idx)) { if (ca.length > 1) setF({ ...f, correct_answers: ca.filter(i => i !== idx) }); } else { if (ca.length < 3) setF({ ...f, correct_answers: [...ca, idx].sort() }); } }

  async function submit(e) {
    e.preventDefault(); if (f.correct_answers.length !== 3) { alert('Оберіть рівно 3 правильні'); return; } setSaving(true);
    const p = { text: f.text, options: f.options, correct_answers: f.correct_answers, explanation: f.explanation, difficulty: f.difficulty, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, updated_at: new Date().toISOString() };
    if (qid) await supabase.from('seven_questions').update(p).eq('id', qid); else await supabase.from('seven_questions').insert(p);
    setSaving(false); onDone();
  }

  return (
    <FormWrap title="Сімки: 3 з 7" color="teal" onCancel={onCancel} onSubmit={submit} saving={saving}>
      <Field label="Текст питання"><textarea value={f.text} onChange={e => setF({ ...f, text: e.target.value })} className={inp + ' min-h-[60px]'} required /></Field>
      <div><label className="block text-sm font-medium text-slate-600 mb-2">7 варіантів (позначте 3 правильні)</label>
        {f.options.map((o, i) => (<div key={i} className="flex items-center gap-2 mb-2"><span className="text-xs text-slate-400 w-4">{i + 1}.</span><input value={o} onChange={e => { const opts = [...f.options]; opts[i] = e.target.value; setF({ ...f, options: opts }); }} className={inp} required /><CheckBtn active={f.correct_answers.includes(i)} onClick={() => toggle(i)} /></div>))}
        <div className="text-xs text-slate-500">Обрано: {f.correct_answers.length}/3</div>
      </div>
      <Field label="Пояснення"><textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} className={inp} rows={2} /></Field>
      <ImageField value={f.image_url} onChange={v => setF({ ...f, image_url: v })} />
    </FormWrap>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAP: table name → form component
// ══════════════════════════════════════════════════════════════════════════
export const FORM_MAP = {
  questions: QuestionsForm,
  blitz_questions: BlitzForm,
  logical_pairs_questions: PairsForm,
  gallery_questions: GalleryForm,
  seven_questions: SevensForm,
};
