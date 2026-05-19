import { AuditLog } from '../models/index.js'

/**
 * createAuditLog — call inside controllers after DB mutations
 */
export async function createAuditLog({ userId, action, tableName, recordId, oldValues, newValues, req }) {
  try {
    await AuditLog.create({
      user_id:    userId,
      action,
      table_name: tableName,
      record_id:  recordId,
      old_values: oldValues || null,
      new_values: newValues || null,
      ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      user_agent: req?.headers?.['user-agent'] || null,
    })
  } catch (err) {
    console.error('Audit log error:', err.message)
    // Never block the main flow
  }
}
