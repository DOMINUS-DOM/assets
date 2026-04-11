import { prisma } from '@/lib/prisma';

/**
 * Log an action to the audit trail.
 * Call this from API routes after mutations.
 */
export async function logAudit(params: {
  userId?: string | null;
  locationId?: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'status_change';
  entity: string; // Order, Employee, Task, User, etc.
  entityId: string;
  changes?: Record<string, any>;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        locationId: params.locationId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        changes: JSON.stringify(params.changes || {}),
        ip: params.ip || null,
      },
    });
  } catch {
    // Don't let audit failures break the main flow
    console.warn('[audit] Failed to log:', params.entity, params.action);
  }
}
