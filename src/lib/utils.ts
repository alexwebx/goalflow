import type { EntityId } from '../types/models';

export const createId = (): EntityId =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const nowIso = () => new Date().toISOString();

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const minutesBetween = (startedAt: string, endedAt: string) => {
  const diff = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(diff / 60000));
};

export const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
};

export const isSameWeek = (value?: string) => {
  if (!value) return false;

  const target = new Date(value);
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - day);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return target >= weekStart && target < weekEnd;
};

export const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const toInputDate = (iso?: string) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : '';

export const fromInputDate = (value?: string) =>
  value ? new Date(`${value}T12:00:00`).toISOString() : undefined;
