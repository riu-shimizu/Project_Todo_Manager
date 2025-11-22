import type { ChangeEvent } from 'react';
import type { TodoStatus } from '../types';

interface StatusSelectProps {
  value: TodoStatus;
  onChange: (status: TodoStatus) => Promise<void> | void;
}

export const statusLabels: Record<TodoStatus, string> = {
  NOT_STARTED: '未着手',
  IN_PROGRESS: '進行中',
  DONE: '完了',
};

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as TodoStatus;
    try {
      await onChange(next);
    } catch (err) {
      console.error(err);
      alert('ステータス更新に失敗しました');
    }
  }

  return (
    <select className={`status status-${value.toLowerCase()}`} value={value} onChange={handleChange}>
      {Object.entries(statusLabels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function StatusBadge({ value }: { value: TodoStatus }) {
  return <span className={`status status-${value.toLowerCase()}`}>{statusLabels[value]}</span>;
}
