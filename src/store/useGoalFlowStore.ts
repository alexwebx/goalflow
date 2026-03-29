import { create } from 'zustand';
import { database } from '../db/database';
import { clamp, createId, fromInputDate, isSameWeek, minutesBetween, nowIso } from '../lib/utils';
import type {
  ActiveTimer,
  AppSnapshot,
  Goal,
  Project,
  Task,
  TaskFilter,
  TaskStatus,
  TimeEntry,
} from '../types/models';

const AUTO_STOP_LIMIT_MINUTES = 12 * 60;

type TaskDraft = {
  title: string;
  goalId?: string;
  projectId?: string;
  tags?: string[];
  deadline?: string;
};

type ProjectDraft = {
  title: string;
  goalId?: string;
  description?: string;
};

type GoalDraft = {
  title: string;
  description?: string;
};

type StoreState = {
  hydrated: boolean;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  activeTimer: ActiveTimer | null;
  filter: TaskFilter;
  search: string;
  commandPaletteOpen: boolean;
  createTaskOpen: boolean;
  timerWarning: string | null;
  hydrate: () => Promise<void>;
  setFilter: (filter: TaskFilter) => void;
  setSearch: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setCreateTaskOpen: (open: boolean) => void;
  addGoal: (draft: GoalDraft) => Promise<void>;
  addProject: (draft: ProjectDraft) => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  addManualTime: (taskId: string, minutes: number) => Promise<void>;
  exportJson: () => AppSnapshot;
  importJson: (snapshot: AppSnapshot) => Promise<void>;
  dismissTimerWarning: () => void;
};

const sortByCreated = <T extends { createdAt?: string; startedAt?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = a.createdAt ?? a.startedAt ?? '';
    const right = b.createdAt ?? b.startedAt ?? '';
    return right.localeCompare(left);
  });

const normalizeSnapshot = (snapshot: AppSnapshot): AppSnapshot => ({
  version: 1,
  goals: sortByCreated(snapshot.goals),
  projects: sortByCreated(snapshot.projects),
  tasks: sortByCreated(snapshot.tasks),
  timeEntries: sortByCreated(snapshot.timeEntries),
});

export const useGoalFlowStore = create<StoreState>((set, get) => ({
  hydrated: false,
  goals: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  activeTimer: null,
  filter: 'all',
  search: '',
  commandPaletteOpen: false,
  createTaskOpen: false,
  timerWarning: null,

  async hydrate() {
    if (get().hydrated) return;

    const snapshot = await database.readSnapshot();
    let activeTimer = snapshot.activeTimer;
    let timerWarning: string | null = null;

    if (activeTimer) {
      const elapsed = minutesBetween(activeTimer.startedAt, nowIso());
      if (elapsed > AUTO_STOP_LIMIT_MINUTES) {
        const entry: TimeEntry = {
          id: createId(),
          taskId: activeTimer.taskId,
          startedAt: activeTimer.startedAt,
          endedAt: new Date(
            new Date(activeTimer.startedAt).getTime() +
              AUTO_STOP_LIMIT_MINUTES * 60000,
          ).toISOString(),
          durationMinutes: AUTO_STOP_LIMIT_MINUTES,
          source: 'auto_stop',
        };
        snapshot.timeEntries.push(entry);
        await database.saveTimeEntry(entry);
        await database.saveActiveTimer(null);
        activeTimer = null;
        timerWarning = 'Активный таймер был автоматически остановлен через 12 часов.';
      }
    }

    const normalized = normalizeSnapshot(snapshot);
    set({
      hydrated: true,
      goals: normalized.goals,
      projects: normalized.projects,
      tasks: normalized.tasks,
      timeEntries: normalized.timeEntries,
      activeTimer,
      timerWarning,
    });
  },

  setFilter(filter) {
    set({ filter });
  },

  setSearch(search) {
    set({ search });
  },

  setCommandPaletteOpen(commandPaletteOpen) {
    set({ commandPaletteOpen });
  },

  setCreateTaskOpen(createTaskOpen) {
    set({ createTaskOpen });
  },

  async addGoal(draft) {
    const goal: Goal = {
      id: createId(),
      title: draft.title.trim(),
      description: draft.description?.trim() || undefined,
      createdAt: nowIso(),
      archived: false,
    };
    await database.saveGoal(goal);
    set((state) => ({ goals: sortByCreated([goal, ...state.goals]) }));
  },

  async addProject(draft) {
    const project: Project = {
      id: createId(),
      title: draft.title.trim(),
      goalId: draft.goalId || undefined,
      description: draft.description?.trim() || undefined,
      createdAt: nowIso(),
      archived: false,
    };
    await database.saveProject(project);
    set((state) => ({ projects: sortByCreated([project, ...state.projects]) }));
  },

  async addTask(draft) {
    const task: Task = {
      id: createId(),
      title: draft.title.trim(),
      goalId: draft.goalId || undefined,
      projectId: draft.projectId || undefined,
      status: 'todo',
      tags: draft.tags ?? [],
      deadline: fromInputDate(draft.deadline),
      createdAt: nowIso(),
    };
    await database.saveTask(task);
    set((state) => ({
      tasks: sortByCreated([task, ...state.tasks]),
      createTaskOpen: false,
    }));
  },

  async updateTaskStatus(taskId, status) {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task) return;

    const updated: Task = {
      ...task,
      status,
      completedAt: status === 'done' ? nowIso() : undefined,
    };
    await database.saveTask(updated);
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updated : item)),
    }));
  },

  async updateTask(taskId, patch) {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task) return;

    const updated: Task = { ...task, ...patch };
    await database.saveTask(updated);
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updated : item)),
    }));
  },

  async deleteTask(taskId) {
    const activeTimer = get().activeTimer;
    if (activeTimer?.taskId === taskId) {
      await get().stopTimer();
    }

    await database.deleteTask(taskId);
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== taskId),
      timeEntries: state.timeEntries.filter((entry) => entry.taskId !== taskId),
    }));
  },

  async startTimer(taskId) {
    const { activeTimer } = get();
    if (activeTimer?.taskId === taskId) return;
    if (activeTimer) {
      await get().stopTimer();
    }

    const nextTimer: ActiveTimer = {
      taskId,
      startedAt: nowIso(),
    };
    await database.saveActiveTimer(nextTimer);
    set({ activeTimer: nextTimer });
  },

  async stopTimer() {
    const activeTimer = get().activeTimer;
    if (!activeTimer) return;

    const endedAt = nowIso();
    const durationMinutes = clamp(
      minutesBetween(activeTimer.startedAt, endedAt),
      1,
      AUTO_STOP_LIMIT_MINUTES,
    );
    const entry: TimeEntry = {
      id: createId(),
      taskId: activeTimer.taskId,
      startedAt: activeTimer.startedAt,
      endedAt,
      durationMinutes,
      source: 'timer',
    };

    await Promise.all([
      database.saveTimeEntry(entry),
      database.saveActiveTimer(null),
    ]);

    set((state) => ({
      activeTimer: null,
      timeEntries: sortByCreated([entry, ...state.timeEntries]),
    }));
  },

  async addManualTime(taskId, minutes) {
    const durationMinutes = clamp(Math.round(minutes), 1, AUTO_STOP_LIMIT_MINUTES);
    const endedAt = nowIso();
    const startedAt = new Date(
      new Date(endedAt).getTime() - durationMinutes * 60000,
    ).toISOString();
    const entry: TimeEntry = {
      id: createId(),
      taskId,
      startedAt,
      endedAt,
      durationMinutes,
      source: 'manual',
    };
    await database.saveTimeEntry(entry);
    set((state) => ({
      timeEntries: sortByCreated([entry, ...state.timeEntries]),
    }));
  },

  exportJson() {
    const { goals, projects, tasks, timeEntries } = get();
    return {
      version: 1,
      goals,
      projects,
      tasks,
      timeEntries,
    };
  },

  async importJson(snapshot) {
    const normalized = normalizeSnapshot(snapshot);
    await database.replaceAll(normalized);
    await database.saveActiveTimer(null);
    set({
      goals: normalized.goals,
      projects: normalized.projects,
      tasks: normalized.tasks,
      timeEntries: normalized.timeEntries,
      activeTimer: null,
      timerWarning: null,
    });
  },

  dismissTimerWarning() {
    set({ timerWarning: null });
  },
}));

export const selectTaskMinutes = (taskId: string, timeEntries: TimeEntry[]) =>
  timeEntries
    .filter((entry) => entry.taskId === taskId)
    .reduce((total, entry) => total + entry.durationMinutes, 0);

export const selectTaskGoalId = (task: Task, projects: Project[]) =>
  task.goalId ??
  projects.find((project) => project.id === task.projectId)?.goalId;

export const selectProjectMinutes = (
  projectId: string,
  tasks: Task[],
  timeEntries: TimeEntry[],
) =>
  tasks
    .filter((task) => task.projectId === projectId)
    .reduce((total, task) => total + selectTaskMinutes(task.id, timeEntries), 0);

export const selectGoalMinutes = (
  goalId: string,
  tasks: Task[],
  projects: Project[],
  timeEntries: TimeEntry[],
) =>
  tasks
    .filter(
      (task) =>
        task.goalId === goalId ||
        (!!task.projectId &&
          projects.some(
            (project) => project.id === task.projectId && project.goalId === goalId,
          )),
    )
    .reduce((total, task) => total + selectTaskMinutes(task.id, timeEntries), 0);

export const selectGoalProgress = (
  goalId: string,
  tasks: Task[],
  projects: Project[],
) => {
  const relatedTasks = tasks.filter(
    (task) =>
      task.goalId === goalId ||
      (!!task.projectId &&
        projects.some(
          (project) => project.id === task.projectId && project.goalId === goalId,
        )),
  );
  if (relatedTasks.length === 0) return 0;
  const completed = relatedTasks.filter((task) => task.status === 'done').length;
  return Math.round((completed / relatedTasks.length) * 100);
};

export const filterTasks = (
  tasks: Task[],
  filter: TaskFilter,
  timeEntries: TimeEntry[],
  search: string,
  projects: Project[],
) => {
  const query = search.trim().toLowerCase();

  return tasks.filter((task) => {
    const minutes = selectTaskMinutes(task.id, timeEntries);
    const effectiveGoalId = selectTaskGoalId(task, projects);
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'no_goal'
          ? !effectiveGoalId
          : filter === 'over_4h'
            ? minutes > 240
            : isSameWeek(task.deadline);

    if (!matchesFilter) return false;
    if (!query) return true;

    return [task.title, task.tags.join(' '), task.status]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
};
