import React, { useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Link, Upload, Eye } from 'lucide-react';

export default function ImageField({ value, onChange }) {
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
      <label className="block text-sm font-medium text-slate-600">Зображення (необов'язково)</label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('url')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'url' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><Link size={14} /> URL</button>
        <button type="button" onClick={() => { setMode('upload'); fileRef.current?.click(); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500"><Upload size={14} /> Файл</button>
        {value && <button type="button" onClick={() => { onChange(''); setMode('none'); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600">Видалити</button>}
      </div>
      {mode === 'url' && <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..." className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && <img src={value} alt="" className="h-24 rounded-lg object-cover border" onError={e => e.target.style.display = 'none'} />}
    </div>
  );
}
