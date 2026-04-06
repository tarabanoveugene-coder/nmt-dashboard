import React, { useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Link, Upload, Loader2 } from 'lucide-react';

export default function ImageField({ value, onChange }) {
  const [mode, setMode] = useState(value ? 'url' : 'none');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Clean filename: remove spaces and special chars
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `questions/${Date.now()}_${cleanName}`;
      const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
      if (error) {
        alert('Помилка завантаження: ' + error.message);
        setUploading(false);
        return;
      }
      const { data } = supabase.storage.from('question-images').getPublicUrl(path);
      onChange(data.publicUrl);
      setMode('url');
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
    setUploading(false);
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600">Зображення (необов'язково)</label>
      <div className="flex gap-2 items-center">
        <button type="button" onClick={() => setMode('url')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${mode === 'url' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
          <Link size={14} /> URL
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Завантаження...' : 'Файл'}
        </button>
        {value && <button type="button" onClick={() => { onChange(''); setMode('none'); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100">Видалити</button>}
      </div>
      {mode === 'url' && (
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..."
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && (
        <div className="mt-2">
          <img src={value} alt="" className="h-24 rounded-lg object-cover border border-slate-200" onError={e => { e.target.style.display = 'none'; }} />
          <div className="text-xs text-slate-400 mt-1 truncate max-w-md">{value}</div>
        </div>
      )}
    </div>
  );
}
