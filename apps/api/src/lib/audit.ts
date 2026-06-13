import { prisma } from "./prisma.js";

export interface AuditParams {
  clinicId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Records an audit log entry for a data-modifying action. Best-effort: a
 * failure here is logged but never propagated, so auditing can't take down
 * the request that triggered it.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: params.clinicId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: (params.changes ?? undefined) as object | undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
