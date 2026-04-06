import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';
import { Upload, Download, FileSpreadsheet, Check, AlertCircle, X, Loader2 } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS per format
// ══════════════════════════════════════════════════════════════════════════
const TEMPLATES = {
  questions: {
    name: 'Тест (4 варіанти)',
    columns: ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation', 'difficulty', 'source_year'],
    headers: ['Текст питання', 'Варіант A', 'Варіант B', 'Варіант C', 'Варіант D', 'Правильна відповідь (A/B/C/D)', 'Пояснення', 'Складність (1/2/3)', 'Рік джерела'],
    example: ['Хто був першим президентом України?', 'Л. Кравчук', 'Л. Кучма', 'В. Ющенко', 'П. Порошенко', 'A', 'Леонід Кравчук став першим президентом у 1991 році', '1', '2020'],
    parse: (row) => ({
      question_text: row['Текст питання'],
      options: [row['Варіант A'], row['Варіант B'], row['Варіант C'], row['Варіант D']],
      correct_index: 'ABCD'.indexOf((row['Правильна відповідь (A/B/C/D)'] || 'A').toString().toUpperCase().trim()),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      source_year: parseInt(row['Рік джерела']) || null,
      format: 'single_choice',
      is_active: true,
      status: 'verified',
    }),
    validate: (item) => {
      if (!item.question_text) return 'Текст питання порожній';
      if (item.options.some(o => !o)) return 'Не всі варіанти заповнені';
      if (item.correct_index < 0 || item.correct_index > 3) return 'Невірна правильна відповідь (має бути A/B/C/D)';
      return null;
    },
  },

  blitz_questions: {
    name: 'Бліц (Так/Ні)',
    columns: ['text', 'is_true', 'explanation', 'difficulty'],
    headers: ['Твердження', 'Правильна відповідь (ТАК/НІ)', 'Пояснення', 'Складність (1/2/3)'],
    example: ['Київську Русь заснував Олег', 'ТАК', 'Олег об\'єднав Новгород і Київ у 882 році', '1'],
    parse: (row) => ({
      text: row['Твердження'],
      is_true: ['так', 'true', '1', 'yes'].includes((row['Правильна відповідь (ТАК/НІ)'] || '').toString().toLowerCase().trim()),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      is_active: true,
    }),
    validate: (item) => {
      if (!item.text) return 'Твердження порожнє';
      return null;
    },
  },

  logical_pairs_questions: {
    name: 'Логічні пари',
    columns: ['instruction', 'left_1', 'left_2', 'left_3', 'left_4', 'right_1', 'right_2', 'right_3', 'right_4', 'pair_1', 'pair_2', 'pair_3', 'pair_4', 'explanation'],
    headers: ['Інструкція', 'Ліва 1', 'Ліва 2', 'Ліва 3', 'Ліва 4', 'Права А', 'Права Б', 'Права В', 'Права Г', 'Пара 1→(А/Б/В/Г)', 'Пара 2→(А/Б/В/Г)', 'Пара 3→(А/Б/В/Г)', 'Пара 4→(А/Б/В/Г)', 'Пояснення'],
    example: ['Встановіть відповідність між датою та подією', '1648', '1654', '1667', '1709', 'Початок повстання Хмельницького', 'Переяславська рада', 'Андрусівський мир', 'Полтавська битва', 'А', 'Б', 'В', 'Г', ''],
    parse: (row) => {
      const R = ['А', 'Б', 'В', 'Г'];
      return {
        instruction: row['Інструкція'] || 'Встановіть відповідність',
        left_items: [
          { id: '1', text: row['Ліва 1'] || '' },
          { id: '2', text: row['Ліва 2'] || '' },
          { id: '3', text: row['Ліва 3'] || '' },
          { id: '4', text: row['Ліва 4'] || '' },
        ],
        right_items: [
          { id: 'А', text: row['Права А'] || '' },
          { id: 'Б', text: row['Права Б'] || '' },
          { id: 'В', text: row['Права В'] || '' },
          { id: 'Г', text: row['Права Г'] || '' },
        ],
        correct_pairs: {
          '1': (row['Пара 1→(А/Б/В/Г)'] || 'А').toString().trim(),
          '2': (row['Пара 2→(А/Б/В/Г)'] || 'Б').toString().trim(),
          '3': (row['Пара 3→(А/Б/В/Г)'] || 'В').toString().trim(),
          '4': (row['Пара 4→(А/Б/В/Г)'] || 'Г').toString().trim(),
        },
        explanation: row['Пояснення'] || '',
        difficulty: 1,
        is_active: true,
      };
    },
    validate: (item) => {
      if (item.left_items.some(i => !i.text)) return 'Не всі ліві елементи заповнені';
      if (item.right_items.some(i => !i.text)) return 'Не всі праві елементи заповнені';
      return null;
    },
  },

  gallery_questions: {
    name: 'Галерея',
    columns: ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation', 'image_url', 'image_hint', 'difficulty'],
    headers: ['Текст питання', 'Варіант A', 'Варіант B', 'Варіант C', 'Варіант D', 'Правильна відповідь (A/B/C/D)', 'Пояснення', 'URL зображення', 'Підказка зображення', 'Складність (1/2/3)'],
    example: ['Що зображено на фото?', 'Софійський собор', 'Києво-Печерська лавра', 'Золоті ворота', 'Андріївська церква', 'A', 'Софійський собор побудовано за Ярослава Мудрого', 'https://example.com/photo.jpg', 'Архітектура Києва', '2'],
    parse: (row) => ({
      question_text: row['Текст питання'],
      options: [row['Варіант A'], row['Варіант B'], row['Варіант C'], row['Варіант D']],
      correct_index: 'ABCD'.indexOf((row['Правильна відповідь (A/B/C/D)'] || 'A').toString().toUpperCase().trim()),
      explanation: row['Пояснення'] || '',
      image_url: row['URL зображення'] || null,
      image_hint: row['Підказка зображення'] || '',
      image_category: 'architecture',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      is_active: true,
    }),
    validate: (item) => {
      if (!item.question_text) return 'Текст питання порожній';
      if (item.options.some(o => !o)) return 'Не всі варіанти заповнені';
      return null;
    },
  },

  seven_questions: {
    name: 'Сімки (3 з 7)',
    columns: ['text', 'opt_1', 'opt_2', 'opt_3', 'opt_4', 'opt_5', 'opt_6', 'opt_7', 'correct_1', 'correct_2', 'correct_3', 'explanation', 'difficulty'],
    headers: ['Текст питання', 'Варіант 1', 'Варіант 2', 'Варіант 3', 'Варіант 4', 'Варіант 5', 'Варіант 6', 'Варіант 7', 'Правильний 1 (номер 1-7)', 'Правильний 2 (номер 1-7)', 'Правильний 3 (номер 1-7)', 'Пояснення', 'Складність (1/2/3)'],
    example: ['Оберіть 3 події Української революції', 'Утворення УЦР', 'Голодомор', 'Проголошення УНР', 'Полтавська битва', 'Битва під Крутами', 'Берестейський мир', 'Люблінська унія', '1', '3', '5', 'УЦР, УНР та Крути — події 1917-1918 рр.', '2'],
    parse: (row) => ({
      text: row['Текст питання'],
      options: [row['Варіант 1'], row['Варіант 2'], row['Варіант 3'], row['Варіант 4'], row['Варіант 5'], row['Варіант 6'], row['Варіант 7']],
      correct_answers: [
        parseInt(row['Правильний 1 (номер 1-7)']) - 1,
        parseInt(row['Правильний 2 (номер 1-7)']) - 1,
        parseInt(row['Правильний 3 (номер 1-7)']) - 1,
      ].filter(n => n >= 0 && n <= 6).sort(),
      explanation: row['Пояснення'] || '',
      difficulty: parseInt(row['Складність (1/2/3)']) || 1,
      is_active: true,
    }),
    validate: (item) => {
      if (!item.text) return 'Текст питання порожній';
      if (item.options.some(o => !o)) return 'Не всі 7 варіантів заповнені';
      if (item.correct_answers.length !== 3) return 'Потрібно вказати рівно 3 правильних відповіді';
      return null;
    },
  },
};

// ══════════════════════════════════════════════════════════════════════════
// GENERATE AND DOWNLOAD TEMPLATE
// ══════════════════════════════════════════════════════════════════════════
function downloadTemplate(formatTable) {
  const tmpl = TEMPLATES[formatTable];
  if (!tmpl) return;

  const wb = XLSX.utils.book_new();
  const data = [tmpl.headers, tmpl.example];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = tmpl.headers.map(h => ({ wch: Math.max(h.length + 2, 20) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Шаблон');

  // Instructions sheet
  const instrData = [
    ['Інструкція з імпорту'],
    [''],
    ['1. Заповніть дані починаючи з рядка 2 (рядок 1 — заголовки)'],
    ['2. Приклад заповнення вже є в рядку 2 — замініть його своїми даними'],
    ['3. Не змінюйте назви колонок в рядку 1'],
    ['4. Збережіть файл як .xlsx'],
    ['5. Завантажте через кнопку "Імпорт з Excel" в адмінці'],
    [''],
    ['Формат: ' + tmpl.name],
    ['Колонки: ' + tmpl.headers.join(', ')],
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
  const [preview, setPreview] = useState(null); // { valid: [], errors: [] }
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null); // { success: number, failed: number }
  const fileRef = useRef();

  if (!tmpl) return null;

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      const valid = [];
      const errors = [];

      rows.forEach((row, i) => {
        try {
          const parsed = tmpl.parse(row);
          const err = tmpl.validate(parsed);
          if (err) {
            errors.push({ row: i + 2, error: err, data: row });
          } else {
            valid.push(parsed);
          }
        } catch (ex) {
          errors.push({ row: i + 2, error: ex.message, data: row });
        }
      });

      setPreview({ valid, errors });
    };
    reader.readAsBinaryString(f);
  }

  async function handleImport() {
    if (!preview?.valid.length) return;
    setImporting(true);

    const items = preview.valid.map(item => ({
      ...item,
      subject_id: subjectId,
      topic_tag: topicTag,
      updated_at: new Date().toISOString(),
    }));

    // Batch insert in chunks of 100
    let success = 0;
    let failed = 0;
    for (let i = 0; i < items.length; i += 100) {
      const batch = items.slice(i, i + 100);
      const { error } = await supabase.from(formatTable).insert(batch);
      if (error) {
        failed += batch.length;
        console.error('Import error:', error);
      } else {
        success += batch.length;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    if (success > 0 && onImported) onImported();
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-blue-600" />
          Імпорт з Excel — {tmpl.name}
        </h3>
        <button onClick={reset} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>

      {/* Template download */}
      <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
        <Download size={16} className="text-blue-600 shrink-0" />
        <span className="text-sm text-blue-800">Спочатку завантажте шаблон, заповніть його та завантажте назад.</span>
        <button onClick={() => downloadTemplate(formatTable)} className="ml-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
          <Download size={14} /> Завантажити шаблон
        </button>
      </div>

      {/* File upload */}
      <div className="flex items-center gap-3">
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
          <Upload size={16} /> {file ? file.name : 'Обрати файл .xlsx'}
        </button>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Check size={16} className="text-emerald-600" />
              <span className="text-emerald-700 font-medium">Валідних: {preview.valid.length}</span>
            </div>
            {preview.errors.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-600 font-medium">Помилок: {preview.errors.length}</span>
              </div>
            )}
          </div>

          {/* Error details */}
          {preview.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              {preview.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-700 py-1">
                  Рядок {err.row}: {err.error}
                </div>
              ))}
            </div>
          )}

          {/* Valid items preview */}
          {preview.valid.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="text-xs text-slate-500 mb-2">Прев'ю перших {Math.min(5, preview.valid.length)} записів:</div>
              {preview.valid.slice(0, 5).map((item, i) => (
                <div key={i} className="text-xs text-slate-700 py-1 border-b border-slate-100 last:border-0 truncate">
                  {i + 1}. {item.question_text || item.text || item.instruction || JSON.stringify(item).substring(0, 100)}
                </div>
              ))}
              {preview.valid.length > 5 && <div className="text-xs text-slate-400 pt-1">...і ще {preview.valid.length - 5}</div>}
            </div>
          )}

          {/* Import button */}
          {preview.valid.length > 0 && !result && (
            <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 shadow-sm">
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {importing ? `Імпорт (${preview.valid.length})...` : `Імпортувати ${preview.valid.length} записів`}
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${result.failed ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <Check size={20} className="text-emerald-600" />
          <div>
            <div className="font-medium text-slate-800">Імпорт завершено</div>
            <div className="text-sm text-slate-600">Успішно: {result.success} | Помилок: {result.failed}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export { downloadTemplate, TEMPLATES };
