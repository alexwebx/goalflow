import { openDB } from 'idb';
import type {
  ActiveTimer,
  AppSnapshot,
  Goal,
  Project,
  Task,
  TimeEntry,
} from '../types/models';

type GoalFlowDB = {
  goals: Goal;
  projects: Project;
  tasks: Task;
  timeEntries: TimeEntry;
  meta: {
    key: string;
    value: ActiveTimer | null;
  };
};

const DB_NAME = 'goalflow-db';
const DB_VERSION = 1;
const ACTIVE_TIMER_KEY = 'activeTimer';

const dbPromise = openDB<GoalFlowDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore('goals', { keyPath: 'id' });
    db.createObjectStore('projects', { keyPath: 'id' });
    db.createObjectStore('tasks', { keyPath: 'id' });
    db.createObjectStore('timeEntries', { keyPath: 'id' });
    db.createObjectStore('meta', { keyPath: 'key' });
  },
});

export const database = {
  async readSnapshot(): Promise<AppSnapshot & { activeTimer: ActiveTimer | null }> {
    const db = await dbPromise;
    const [goals, projects, tasks, timeEntries, timerRecord] = await Promise.all([
      db.getAll('goals'),
      db.getAll('projects'),
      db.getAll('tasks'),
      db.getAll('timeEntries'),
      db.get('meta', ACTIVE_TIMER_KEY),
    ]);

    return {
      version: 1,
      goals,
      projects,
      tasks,
      timeEntries,
      activeTimer: timerRecord?.value ?? null,
    };
  },

  async saveGoal(goal: Goal) {
    const db = await dbPromise;
    await db.put('goals', goal);
  },

  async saveProject(project: Project) {
    const db = await dbPromise;
    await db.put('projects', project);
  },

  async saveTask(task: Task) {
    const db = await dbPromise;
    await db.put('tasks', task);
  },

  async saveTimeEntry(entry: TimeEntry) {
    const db = await dbPromise;
    await db.put('timeEntries', entry);
  },

  async deleteTask(taskId: string) {
    const db = await dbPromise;
    const tx = db.transaction(['tasks', 'timeEntries'], 'readwrite');
    await Promise.all([
      tx.objectStore('tasks').delete(taskId),
      (async () => {
        const allEntries = await tx.objectStore('timeEntries').getAll();
        await Promise.all(
          allEntries
            .filter((entry) => entry.taskId === taskId)
            .map((entry) => tx.objectStore('timeEntries').delete(entry.id)),
        );
      })(),
    ]);
    await tx.done;
  },

  async saveActiveTimer(activeTimer: ActiveTimer | null) {
    const db = await dbPromise;

    if (activeTimer) {
      await db.put('meta', { key: ACTIVE_TIMER_KEY, value: activeTimer });
      return;
    }

    await db.delete('meta', ACTIVE_TIMER_KEY);
  },

  async replaceAll(snapshot: AppSnapshot) {
    const db = await dbPromise;
    const tx = db.transaction(
      ['goals', 'projects', 'tasks', 'timeEntries'],
      'readwrite',
    );

    await Promise.all([
      tx.objectStore('goals').clear(),
      tx.objectStore('projects').clear(),
      tx.objectStore('tasks').clear(),
      tx.objectStore('timeEntries').clear(),
    ]);

    await Promise.all([
      ...snapshot.goals.map((goal) => tx.objectStore('goals').put(goal)),
      ...snapshot.projects.map((project) => tx.objectStore('projects').put(project)),
      ...snapshot.tasks.map((task) => tx.objectStore('tasks').put(task)),
      ...snapshot.timeEntries.map((entry) => tx.objectStore('timeEntries').put(entry)),
    ]);

    await tx.done;
  },
};
