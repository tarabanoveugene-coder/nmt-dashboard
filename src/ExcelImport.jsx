import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';
import { Upload, Download, FileSpreadsheet, Check, AlertCircle, X, Loader2, FolderPlus } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS — кожен шаблон має колонку "Тема"
// ══════════════════════════════════════════════════════════════════════════
const TEMPLATES = {
  questions: {
    name: 'Тест (4 варіанти)',
    headers: ['Тема', 'Текст питання', 'Варіант A', 'Варіант B', 'Варіант C', 'Варіант D', 'Правильна відповідь (A/B/C/D)', 'Пояснення', 'Складність (1/2/3)', 'Рік джерела', 'URL зображення'],
    example: ['Київська Русь', 'Хто був першим президентом України?', 'Л. Кравчук', 'Л. Кучма', 'В. Ющенко', 'П. Порошенко', 'A', 'Леонід Кравчук став першим президентом у 1991', '1', '2020', ''],
    parse: (row) => ({
      _topicName: (row['Тема'] || '').toString().trim(),
      question_text: row['Текст питання'],
      options: [row['Варіант A'], row['Варіант B'], row['Варіант C'], row['Варіант D']],
      correct_index: 'ABCD'.indexOf((row['Правильна відповідь (A/B/C/D)'] || 'A').toString().toUpperCase().trim()),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      source_year: parseInt(row['Рік джерела']) || null,
      image_url: row['URL зображення'] || null,
      format: 'single_choice', is_active: true, status: 'verified',
    }),
    validate: (item) => {
      if (!item._topicName) return 'Тема не вказана';
      if (!item.question_text) return 'Текст питання порожній';
      if (item.options.some(o => !o)) return 'Не всі варіанти заповнені';
      if (item.correct_index < 0 || item.correct_index > 3) return 'Невірна відповідь (A/B/C/D)';
      return null;
    },
  },

  blitz_questions: {
    name: 'Бліц (Так/Ні)',
    headers: ['Тема', 'Твердження', 'Правильна відповідь (ТАК/НІ)', 'Пояснення', 'Складність (1/2/3)', 'URL зображення'],
    example: ['Київська Русь', 'Київську Русь заснував Олег', 'ТАК', 'Олег об\'єднав Новгород і Київ у 882 році', '1', ''],
    parse: (row) => ({
      _topicName: (row['Тема'] || '').toString().trim(),
      text: row['Твердження'],
      is_true: ['так', 'true', '1', 'yes'].includes((row['Правильна відповідь (ТАК/НІ)'] || '').toString().toLowerCase().trim()),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      image_url: row['URL зображення'] || null,
      is_active: true,
    }),
    validate: (item) => {
      if (!item._topicName) return 'Тема не вказана';
      if (!item.text) return 'Твердження порожнє';
      return null;
    },
  },

  logical_pairs_questions: {
    name: 'Логічні пари',
    headers: ['Тема', 'Інструкція', 'Ліва 1', 'Ліва 2', 'Ліва 3', 'Ліва 4', 'Права А', 'Права Б', 'Права В', 'Права Г', 'Права Д (зайва)', 'Пара 1→(А-Д)', 'Пара 2→(А-Д)', 'Пара 3→(А-Д)', 'Пара 4→(А-Д)', 'Пояснення', 'URL зображення'],
    example: ['Київська Русь', 'Встановіть відповідність', '1648', '1654', '1667', '1709', 'Повстання Хмельницького', 'Переяславська рада', 'Андрусівський мир', 'Полтавська битва', 'Столипінська реформа', 'А', 'Б', 'В', 'Г', '', ''],
    parse: (row) => {
      const rightItems = [
        { id: 'А', text: row['Права А'] || '' },
        { id: 'Б', text: row['Права Б'] || '' },
        { id: 'В', text: row['Права В'] || '' },
        { id: 'Г', text: row['Права Г'] || '' },
        ...(row['Права Д (зайва)'] ? [{ id: 'Д', text: row['Права Д (зайва)'] }] : []),
      ].filter(item => item.text);
      return {
      _topicName: (row['Тема'] || '').toString().trim(),
      instruction: row['Інструкція'] || 'Встановіть відповідність',
      left_items: [{ id: '1', text: row['Ліва 1'] || '' }, { id: '2', text: row['Ліва 2'] || '' }, { id: '3', text: row['Ліва 3'] || '' }, { id: '4', text: row['Ліва 4'] || '' }],
      right_items: rightItems,
      correct_pairs: { '1': (row['Пара 1→(А-Д)'] || 'А').toString().trim(), '2': (row['Пара 2→(А-Д)'] || 'Б').toString().trim(), '3': (row['Пара 3→(А-Д)'] || 'В').toString().trim(), '4': (row['Пара 4→(А-Д)'] || 'Г').toString().trim() },
      explanation: row['Пояснення'] || '', difficulty: 1, image_url: row['URL зображення'] || null, is_active: true,
    };},
    validate: (item) => {
      if (!item._topicName) return 'Тема не вказана';
      if (item.left_items.some(i => !i.text)) return 'Не всі ліві елементи заповнені';
      if (item.right_items.length < 4) return 'Потрібно мінімум 4 правих елементи';
      return null;
    },
  },

  gallery_questions: {
    name: 'Галерея',
    headers: ['Тема', 'Текст питання', 'Варіант A', 'Варіант B', 'Варіант C', 'Варіант D', 'Правильна відповідь (A/B/C/D)', 'Пояснення', 'URL зображення', 'Підказка зображення', 'Складність (1/2/3)'],
    example: ['Архітектура', 'Що зображено на фото?', 'Софійський собор', 'Лавра', 'Золоті ворота', 'Андріївська церква', 'A', 'Побудовано за Ярослава Мудрого', 'https://example.com/photo.jpg', 'Архітектура Києва', '2'],
    parse: (row) => ({
      _topicName: (row['Тема'] || '').toString().trim(),
      question_text: row['Текст питання'],
      options: [row['Варіант A'], row['Варіант B'], row['Варіант C'], row['Варіант D']],
      correct_index: 'ABCD'.indexOf((row['Правильна відповідь (A/B/C/D)'] || 'A').toString().toUpperCase().trim()),
      explanation: row['Пояснення'] || '',
      image_url: row['URL зображення'] || null,
      image_hint: row['Підказка зображення'] || '', image_category: 'architecture',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1, is_active: true,
    }),
    validate: (item) => {
      if (!item._topicName) return 'Тема не вказана';
      if (!item.question_text) return 'Текст порожній';
      if (item.options.some(o => !o)) return 'Не всі варіанти заповнені';
      return null;
    },
  },

  seven_questions: {
    name: 'Сімки (3 з 7)',
    headers: ['Тема', 'Текст питання', 'Варіант 1', 'Варіант 2', 'Варіант 3', 'Варіант 4', 'Варіант 5', 'Варіант 6', 'Варіант 7', 'Правильний 1 (1-7)', 'Правильний 2 (1-7)', 'Правильний 3 (1-7)', 'Пояснення', 'Складність (1/2/3)', 'URL зображення'],
    example: ['Революція', 'Оберіть 3 події Української революції', 'Утворення УЦР', 'Голодомор', 'Проголошення УНР', 'Полтавська битва', 'Битва під Крутами', 'Берестейський мир', 'Люблінська унія', '1', '3', '5', 'УЦР, УНР та Крути — 1917-1918 рр.', '2', ''],
    parse: (row) => ({
      _topicName: (row['Тема'] || '').toString().trim(),
      text: row['Текст питання'],
      options: [row['Варіант 1'], row['Варіант 2'], row['Варіант 3'], row['Варіант 4'], row['Варіант 5'], row['Варіант 6'], row['Варіант 7']],
      correct_answers: [parseInt(row['Правильний 1 (1-7)']) - 1, parseInt(row['Правильний 2 (1-7)']) - 1, parseInt(row['Правильний 3 (1-7)']) - 1].filter(n => n >= 0 && n <= 6).sort(),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1, image_url: row['URL зображення'] || null, is_active: true,
    }),
    validate: (item) => {
      if (!item._topicName) return 'Тема не вказана';
      if (!item.text) return 'Текст порожній';
      if (item.options.some(o => !o)) return 'Не всі 7 варіантів';
      if (item.correct_answers.length !== 3) return 'Потрібно 3 правильних';
      return null;
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════
// SLUGIFY for auto-generating topic tags
// ══════════════════════════════════════════════════════════════════════════
function slugify(s) {
  return s.toLowerCase()
    .replace(/[іїєґ]/g, c => ({ і: 'i', ї: 'yi', є: 'ye', ґ: 'g' }[c] || c))
    .replace(/[а-яё]/g, c => {
      const m = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
      const l = 'abvgdezhziyklmnoprstufkhtschchshschyyyeyuya'.match(/.{1,2}/g) || [];
      const i = m.indexOf(c);
      return i >= 0 ? (l[i] || '') : c;
    })
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ══════════════════════════════════════════════════════════════════════════
// RESOLVE TOPICS: find existing or create new
// ══════════════════════════════════════════════════════════════════════════
async function resolveTopics(topicNames, subjectId) {
  // Fetch all existing topics for this subject
  const { data: existing } = await supabase.from('topics').select('*').eq('subject_id', subjectId);
  const byName = {};
  const byTag = {};
  (existing || []).forEach(t => {
    byName[t.name.toLowerCase()] = t.tag;
    byTag[t.tag] = t.name;
  });

  const uniqueNames = [...new Set(topicNames.filter(Boolean))];
  const mapping = {}; // topicName → tag
  const created = [];
  let maxOrder = Math.max(0, ...(existing || []).map(t => t.sort_order || 0));

  for (const name of uniqueNames) {
    const lower = name.toLowerCase();
    if (byName[lower]) {
      // Existing topic
      mapping[name] = byName[lower];
    } else {
      // Create new topic
      const tag = slugify(name);
      // Check tag doesn't already exist
      if (byTag[tag]) {
        mapping[name] = tag;
      } else {
        maxOrder++;
        const { data, error } = await supabase.from('topics').insert({
          name, tag, subject_id: subjectId, sort_order: maxOrder, is_active: true,
        }).select('tag').single();
        if (data) {
          mapping[name] = data.tag;
          byName[lower] = data.tag;
          byTag[data.tag] = name;
          created.push(name);
        } else {
          console.error('Failed to create topic:', name, error);
          mapping[name] = tag; // fallback
        }
      }
    }
  }

  return { mapping, created };
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATE AND DOWNLOAD TEMPLATE
// ══════════════════════════════════════════════════════════════════════════
function downloadTemplate(formatTable) {
  const tmpl = TEMPLATES[formatTable];
  if (!tmpl) return;

  const wb = XLSX.utils.book_new();
  const data = [tmpl.headers, tmpl.example];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = tmpl.headers.map(h => ({ wch: Math.max(h.length + 2, 20) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');

  const instrData = [
    ['Інструкція з імпорту — ' + tmpl.name],
    [''],
    ['1. Заповніть дані починаючи з рядка 2'],
    ['2. Колонка "Тема" — ОБОВ\'ЯЗКОВА. Вкажіть назву теми для кожного питання.'],
    ['3. Якщо тема вже існує в базі — питання додасться до неї.'],
    ['4. Якщо теми ще немає — вона створиться автоматично.'],
    ['5. Можна вказувати різні теми в одному файлі — питання розподіляться автоматично.'],
    ['6. Не змінюйте назви колонок в рядку 1'],
    ['7. Збережіть файл як .xlsx і завантажте в адмінку'],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, instrWs, 'Інструкція');

  XLSX.writeFile(wb, `шаблон_${formatTable}.xlsx`);
}

// ══════════════════════════════════════════════════════════════════════════
// IMPORT COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function ExcelImport({ formatTable, subjectId, topicTag, onImported }) {
  const tmpl = TEMPLATES[formatTable];
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  if (!tmpl) return null;

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f); setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const valid = [];
      const errors = [];
      const topicNames = new Set();

      rows.forEach((row, i) => {
        try {
          const parsed = tmpl.parse(row);
          const err = tmpl.validate(parsed);
          if (err) {
            errors.push({ row: i + 2, error: err });
          } else {
            valid.push(parsed);
            if (parsed._topicName) topicNames.add(parsed._topicName);
          }
        } catch (ex) {
          errors.push({ row: i + 2, error: ex.message });
        }
      });

      setPreview({ valid, errors, topicNames: [...topicNames] });
    };
    reader.readAsBinaryString(f);
  }

  async function handleImport() {
    if (!preview?.valid.length) return;
    setImporting(true);

    // Step 1: Resolve all topic names → tags (create missing ones)
    const allTopicNames = preview.valid.map(item => item._topicName);
    const { mapping, created } = await resolveTopics(allTopicNames, subjectId);

    // Step 2: Map items to DB rows
    const items = preview.valid.map(({ _topicName, ...item }) => ({
      ...item,
      subject_id: subjectId,
      topic_tag: topicTag || mapping[_topicName] || slugify(_topicName),
      updated_at: new Date().toISOString(),
    }));

    // Step 3: Batch insert
    let success = 0, failed = 0;
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100);
      const { error } = await supabase.from(formatTable).insert(batch);
      if (error) { failed += batch.length; console.error('Import error:', error); }
      else { success += batch.length; }
    }

    setResult({ success, failed, createdTopics: created });
    setImporting(false);
    if (success > 0 && onImported) onImported();
  }

  function reset() {
    setFile(null); setPreview(null); setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-blue-600" /> Імпорт з Excel — {tmpl.name}
        </h3>
        <button onClick={reset} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>

      <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
        <Download size={16} className="text-blue-600 shrink-0" />
        <span className="text-sm text-blue-800">Завантажте шаблон, заповніть і завантажте назад. Теми створяться автоматично.</span>
        <button onClick={() => downloadTemplate(formatTable)} className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
          <Download size={14} /> Шаблон .xlsx
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
          <Upload size={16} /> {file ? file.name : 'Обрати файл .xlsx'}
        </button>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm"><Check size={16} className="text-emerald-600" /><span className="text-emerald-700 font-medium">Валідних: {preview.valid.length}</span></div>
            {preview.errors.length > 0 && <div className="flex items-center gap-2 text-sm"><AlertCircle size={16} className="text-red-500" /><span className="text-red-600 font-medium">Помилок: {preview.errors.length}</span></div>}
            <div className="flex items-center gap-2 text-sm"><FolderPlus size={16} className="text-blue-500" /><span className="text-blue-700 font-medium">Тем: {preview.topicNames.length}</span></div>
          </div>

          {/* Topics that will be used/created */}
          {preview.topicNames.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Теми в файлі (існуючі використаються, нові створяться):</div>
              <div className="flex flex-wrap gap-1">
                {preview.topicNames.map((name, i) => (
                  <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{name}</span>
                ))}
              </div>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              {preview.errors.map((err, i) => <div key={i} className="text-xs text-red-700 py-1">Рядок {err.row}: {err.error}</div>)}
            </div>
          )}

          {preview.valid.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="text-xs text-slate-500 mb-2">Прев'ю:</div>
              {preview.valid.slice(0, 5).map((item, i) => (
                <div key={i} className="text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0 flex gap-2">
                  <span className="bg-slate-200 text-slate-600 px-1.5 rounded shrink-0">{item._topicName}</span>
                  <span className="truncate">{item.question_text || item.text || item.instruction || '...'}</span>
                </div>
              ))}
              {preview.valid.length > 5 && <div className="text-xs text-slate-400 pt-1">...і ще {preview.valid.length - 5}</div>}
            </div>
          )}

          {preview.valid.length > 0 && !result && (
            <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-sm">
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {importing ? `Імпорт...` : `Імпортувати ${preview.valid.length} записів`}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className={`p-4 rounded-lg ${result.failed ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <div className="font-medium text-slate-800 flex items-center gap-2"><Check size={20} className="text-emerald-600" /> Імпорт завершено</div>
          <div className="text-sm text-slate-600 mt-1">Успішно: {result.success} | Помилок: {result.failed}</div>
          {result.createdTopics?.length > 0 && (
            <div className="text-sm text-blue-600 mt-1 flex items-center gap-1">
              <FolderPlus size={14} /> Створено нових тем: {result.createdTopics.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { downloadTemplate, TEMPLATES };
