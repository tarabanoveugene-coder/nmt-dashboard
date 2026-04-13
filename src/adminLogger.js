import { supabase } from './lib/supabase';

/**
 * Logs an admin action to the admin_logs table.
 * Call this after every CRUD operation in the admin panel.
 *
 * @param {Object} user - current admin user { id, name, email }
 * @param {string} action - 'create' | 'update' | 'delete' | 'deactivate' | 'move' | 'import' | 'login' | 'logout' | 'status_change'
 * @param {string} entityType - 'question' | 'blitz' | 'pairs' | 'gallery' | 'seven' | 'exam' | 'topic' | 'admin_user' | 'support_request' | 'folder'
 * @param {string|null} entityId - ID of the affected entity
 * @param {Object} details - extra info { question_text, topic_tag, from_format, to_format, count, etc. }
 */
export async function logAction(user, action, entityType, entityId = null, details = {}) {
  if (!user) return;
  try {
    await supabase.from('admin_logs').insert({
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}
