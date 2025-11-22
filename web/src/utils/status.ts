import type { TodoStatus } from '../types';

export function deriveStatusFromActual(
  actualStart?: string | null,
  actualEnd?: string | null,
): TodoStatus {
  const hasStart = Boolean(actualStart);
  const hasEnd = Boolean(actualEnd);
  if (hasEnd) return 'DONE';
  if (hasStart) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}
