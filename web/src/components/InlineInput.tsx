import { useEffect, useState } from 'react';

interface InlineInputProps {
  value?: string;
  type?: 'text' | 'date';
  placeholder?: string;
  className?: string;
  onSave: (next: string) => Promise<void> | void;
}

export function InlineInput({ value, type = 'text', placeholder, className, onSave }: InlineInputProps) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  async function commit() {
    if (draft === value) return;
    try {
      setSaving(true);
      await onSave(draft);
    } catch (err) {
      console.error(err);
      alert('更新に失敗しました');
      setDraft(value ?? '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      value={draft}
      type={type}
      placeholder={placeholder}
      disabled={saving}
      className={`inline-input ${className ?? ''}`.trim()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          setDraft(value ?? '');
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
