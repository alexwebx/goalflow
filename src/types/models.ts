export type EntityId = string;

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Goal {
  id: EntityId;
  title: string;
  description?: string;
  createdAt: string;
  archived: boolean;
}

export interface Project {
  id: EntityId;
  goalId?: EntityId;
  title: string;
  description?: string;
  createdAt: string;
  archived: boolean;
}

export interface Task {
  id: EntityId;
  goalId?: EntityId;
  projectId?: EntityId;
  title: string;
  status: TaskStatus;
  tags: string[];
  deadline?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TimeEntry {
  id: EntityId;
  taskId: EntityId;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  source: 'timer' | 'manual' | 'auto_stop';
}

export interface ActiveTimer {
  taskId: EntityId;
  startedAt: string;
}

export interface AppSnapshot {
  version: 1;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
}

export type TaskFilter = 'all' | 'no_goal' | 'over_4h' | 'week';
