import { TodoStatus } from './entities';

function statusToProgressValue(status: TodoStatus): number {
  switch (status) {
    case 'DONE':
      return 1;
    case 'IN_PROGRESS':
      return 0.5;
    default:
      return 0;
  }
}

export function calculateProgressFromStatuses(statuses: TodoStatus[]): number {
  if (statuses.length === 0) {
    return 0;
  }

  const total = statuses.reduce((acc, status) => acc + statusToProgressValue(status), 0);
  return Math.round((total / statuses.length) * 100);
}

export function progressFromStatus(status: TodoStatus): number {
  return Math.round(statusToProgressValue(status) * 100);
}

export function combineProgress(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / values.length);
}
