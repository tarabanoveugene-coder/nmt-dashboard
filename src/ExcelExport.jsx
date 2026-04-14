import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';

const TABLES = ['questions', 'blitz_questions', 'logical_pairs_questions', 'gallery_questions', 'seven_questions'];

/**
 * Export questions to Excel file.
 * @param {string} subjectId
 * @param {string|null} topicTag - null = all topics
 * @param {string|null} formatTable - null = all formats, or specific table name
 */
export async function exportQuestions(subjectId, topicTag = null, formatTable = null) {
  const wb = XLSX.utils.book_new();
  const tables = formatTable ? [formatTable] : TABLES;

  for (const table of tables) {
    let query = supabase.from(table).select('*').eq('subject_id', subjectId).eq('is_active', true);
    if (topicTag) query = query.eq('topic_tag', topicTag);
    const { data } = await query;
    if (!data || data.length === 0) continue;

    let rows = [];
    const sheetName = {
      questions: 'Тест',
      blitz_questions: 'Бліц',
      logical_pairs_questions: 'Пари',
      gallery_questions: 'Галерея',
      seven_questions: 'Сімка',
    }[table] || table;

    if (table === 'questions') {
      rows = data.map(q => ({
        'Тема': q.topic_tag || '',
        'Текст питання': q.question_text || '',
        'Варіант A': q.options?.[0] || '',
        'Варіант B': q.options?.[1] || '',
        'Варіант C': q.options?.[2] || '',
        'Варіант D': q.options?.[3] || '',
        'Правильна відповідь': String.fromCharCode(65 + (q.correct_index || 0)),
        'Пояснення': q.explanation || '',
        'Складність': q.difficulty || 1,
        'Рік': q.source_year || '',
        'URL зображення': q.image_url || '',
        'Статус': q.publish_status || 'published',
      }));
    } else if (table === 'blitz_questions') {
      rows = data.map(q => ({
        'Тема': q.topic_tag || '',
        'Твердження': q.text || '',
        'Відповідь': q.is_true ? 'ТАК' : 'НІ',
        'Пояснення': q.explanation || '',
        'Складність': q.difficulty || 1,
        'URL зображення': q.image_url || '',
        'Статус': q.publish_status || 'published',
      }));
    } else if (table === 'logical_pairs_questions') {
      rows = data.map(q => {
        const left = q.left_items || [];
        const right = q.right_items || [];
        const pairs = q.correct_pairs || {};
        return {
          'Тема': q.topic_tag || '',
          'Інструкція': q.instruction || '',
          'Ліва 1': left[0]?.text || '', 'Ліва 2': left[1]?.text || '',
          'Ліва 3': left[2]?.text || '', 'Ліва 4': left[3]?.text || '',
          'Права А': right[0]?.text || '', 'Права Б': right[1]?.text || '',
          'Права В': right[2]?.text || '', 'Права Г': right[3]?.text || '',
          'Права Д': right[4]?.text || '',
          'Пара 1': pairs['1'] || '', 'Пара 2': pairs['2'] || '',
          'Пара 3': pairs['3'] || '', 'Пара 4': pairs['4'] || '',
          'Пояснення': q.explanation || '',
          'URL зображення': q.image_url || '',
          'Статус': q.publish_status || 'published',
        };
      });
    } else if (table === 'gallery_questions') {
      rows = data.map(q => ({
        'Тема': q.topic_tag || '',
        'Текст питання': q.question_text || '',
        'Варіант A': q.options?.[0] || '', 'Варіант B': q.options?.[1] || '',
        'Варіант C': q.options?.[2] || '', 'Варіант D': q.options?.[3] || '',
        'Правильна відповідь': String.fromCharCode(65 + (q.correct_index || 0)),
        'Пояснення': q.explanation || '',
        'URL зображення': q.image_url || '',
        'Категорія': q.image_category || '',
        'Складність': q.difficulty || 1,
        'Статус': q.publish_status || 'published',
      }));
    } else if (table === 'seven_questions') {
      rows = data.map(q => ({
        'Тема': q.topic_tag || '',
        'Текст питання': q.text || '',
        'Варіант 1': q.options?.[0] || '', 'Варіант 2': q.options?.[1] || '',
        'Варіант 3': q.options?.[2] || '', 'Варіант 4': q.options?.[3] || '',
        'Варіант 5': q.options?.[4] || '', 'Варіант 6': q.options?.[5] || '',
        'Варіант 7': q.options?.[6] || '',
        'Правильний 1': ((q.correct_answers?.[0] ?? -1) + 1) || '',
        'Правильний 2': ((q.correct_answers?.[1] ?? -1) + 1) || '',
        'Правильний 3': ((q.correct_answers?.[2] ?? -1) + 1) || '',
        'Пояснення': q.explanation || '',
        'URL зображення': q.image_url || '',
        'Складність': q.difficulty || 1,
        'Статус': q.publish_status || 'published',
      }));
    }

    if (rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length + 2, 15) }));
      XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
    }
  }

  const topicSuffix = topicTag ? `_${topicTag}` : '_all';
  const formatSuffix = formatTable ? `_${formatTable.replace('_questions', '')}` : '';
  XLSX.writeFile(wb, `export${formatSuffix}${topicSuffix}.xlsx`);
}
