import React, { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from './lib/supabase';
import { Save, X, Check, Plus } from 'lucide-react';
import ImageField from './ImageField';
import { logAction } from './adminLogger';

// Get user from window (set by App.jsx)
function getUser() { return window.__adminUser || null; }

// Shared input class
const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}

function FormWrap({ title, color = 'blue', onCancel, onSubmit, saving, children }) {
  return (
    <form onSubmit={onSubmit} className={`bg-white border border-${color}-200 rounded-xl shadow-sm overflow-hidden`}>
      <div className="flex items-center justify-between p-6 pb-0">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button type="button" onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
      <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Скасувати</button>
        <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm">
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
    const p = { question_text: f.question_text, options: f.options, correct_index: f.correct_index, explanation: f.explanation, difficulty: f.difficulty, source_year: f.source_year ? parseInt(f.source_year) : null, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, format: 'single_choice', is_active: true, status: 'verified', publish_status: 'draft', updated_at: new Date().toISOString() };
    if (qid) { delete p.publish_status; await supabase.from('questions').update(p).eq('id', qid); } else await supabase.from('questions').insert(p);
    logAction(getUser(), qid ? 'update' : 'create', 'question', qid, { text: f.question_text?.substring(0, 80) });
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
    const p = { text: f.text, is_true: f.is_true, explanation: f.explanation, difficulty: f.difficulty, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, publish_status: 'draft', updated_at: new Date().toISOString() };
    if (qid) { delete p.publish_status; await supabase.from('blitz_questions').update(p).eq('id', qid); } else await supabase.from('blitz_questions').insert(p);
    logAction(getUser(), qid ? 'update' : 'create', 'blitz', qid, { text: f.text?.substring(0, 80) });
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
  const RID = ['А', 'Б', 'В', 'Г', 'Д'];
  const DEFAULT_SEQUENCE_RIGHT = ['1', '2', '3', '4', ''];
  const [f, setF] = useState({ instruction: 'Встановіть відповідність', left: ['', '', '', ''], right: ['', '', '', '', ''], pairs: { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' }, explanation: '', image_url: '', hide_right_column: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (qid) supabase.from('logical_pairs_questions').select('*').eq('id', qid).single().then(({ data: d }) => { if (d) {
    const rightTexts = (d.right_items || []).map(i => i.text);
    while (rightTexts.length < 5) rightTexts.push('');
    setF({ instruction: d.instruction, left: (d.left_items || []).map(i => i.text), right: rightTexts, pairs: d.correct_pairs || { '1': 'А', '2': 'Б', '3': 'В', '4': 'Г' }, explanation: d.explanation || '', image_url: d.image_url || '', hide_right_column: d.hide_right_column === true });
  }}); }, [qid]);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    // When right column is hidden (sequence-only questions), auto-fill with 1/2/3/4
    // so the test UI's matrix still has data to display.
    const rightSource = f.hide_right_column ? DEFAULT_SEQUENCE_RIGHT : f.right;
    const rightItems = rightSource.map((t, i) => ({ id: RID[i], text: t })).filter(item => item.text.trim() !== '');
    const p = { instruction: f.instruction, left_items: f.left.map((t, i) => ({ id: String(i + 1), text: t })), right_items: rightItems, correct_pairs: f.pairs, explanation: f.explanation, difficulty: 1, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, publish_status: 'draft', updated_at: new Date().toISOString(), hide_right_column: f.hide_right_column };
    if (qid) { delete p.publish_status; await supabase.from('logical_pairs_questions').update(p).eq('id', qid); } else await supabase.from('logical_pairs_questions').insert(p);
    logAction(getUser(), qid ? 'update' : 'create', 'pairs', qid, { text: f.instruction?.substring(0, 80) });
    setSaving(false); onDone();
  }

  return (
    <FormWrap title="Логічні пари" color="indigo" onCancel={onCancel} onSubmit={submit} saving={saving}>
      <Field label="Інструкція">
        <input value={f.instruction} onChange={e => setF({ ...f, instruction: e.target.value })} className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none -mt-2">
        <input type="checkbox" checked={f.hide_right_column} onChange={e => setF({ ...f, hide_right_column: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
        <span>Приховати праву колонку (питання на послідовність)</span>
      </label>
      <div className={`grid gap-8 ${f.hide_right_column ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Ліва колонка</h4>
          <div className="space-y-3">
            {f.left.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-100">{i + 1}</div>
                <input value={v} onChange={e => { const l = [...f.left]; l[i] = e.target.value; setF({ ...f, left: l }); }}
                  className="flex-1 bg-white border border-slate-200 text-slate-800 px-3 py-1.5 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-8" required />
                <div className="relative shrink-0 w-16">
                  <select value={f.pairs[String(i + 1)]} onChange={e => { const p = { ...f.pairs }; p[String(i + 1)] = e.target.value; setF({ ...f, pairs: p }); }}
                    className="w-full appearance-none bg-white border border-slate-200 text-amber-600 font-bold px-3 py-1.5 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer text-sm h-8 pl-8">
                    {RID.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-100 rounded-sm flex items-center justify-center text-[10px] text-amber-700 font-bold pointer-events-none">{f.pairs[String(i + 1)] || RID[i]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {!f.hide_right_column && <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Права колонка</h4>
          <div className="space-y-3">
            {f.right.map((v, i) => {
              const isExtra = i === 4;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm shrink-0 border ${isExtra ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{RID[i]}</div>
                  <input value={v} onChange={e => { const r = [...f.right]; r[i] = e.target.value; setF({ ...f, right: r }); }}
                    placeholder={isExtra ? 'необов\'язково — зайвий варіант' : ''}
                    className={`flex-1 bg-white border text-slate-800 px-3 py-1.5 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm h-8 ${isExtra ? 'border-dashed border-slate-300' : 'border-slate-200'}`} {...(isExtra ? {} : { required: true })} />
                </div>
              );
            })}
          </div>
        </div>}
      </div>
      <Field label="Пояснення">
        <textarea value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} rows={3}
          className="w-full bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y text-sm" />
      </Field>
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
    const p = { question_text: f.question_text, options: f.options, correct_index: f.correct_index, image_url: f.image_url || null, image_hint: f.image_hint, image_category: 'architecture', explanation: f.explanation, difficulty: f.difficulty, subject_id: sid, topic_tag: tag, is_active: true, publish_status: 'draft', updated_at: new Date().toISOString() };
    if (qid) { delete p.publish_status; await supabase.from('gallery_questions').update(p).eq('id', qid); } else await supabase.from('gallery_questions').insert(p);
    logAction(getUser(), qid ? 'update' : 'create', 'gallery', qid, { text: f.question_text?.substring(0, 80) });
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
    const p = { text: f.text, options: f.options, correct_answers: f.correct_answers, explanation: f.explanation, difficulty: f.difficulty, image_url: f.image_url || null, subject_id: sid, topic_tag: tag, is_active: true, publish_status: 'draft', updated_at: new Date().toISOString() };
    if (qid) { delete p.publish_status; await supabase.from('seven_questions').update(p).eq('id', qid); } else await supabase.from('seven_questions').insert(p);
    logAction(getUser(), qid ? 'update' : 'create', 'seven', qid, { text: f.text?.substring(0, 80) });
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
