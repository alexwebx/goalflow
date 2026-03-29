import { useEffect, useMemo, useRef, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CommandPalette } from '../components/CommandPalette';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskCard } from '../components/TaskCard';
import { useHotkeys } from '../hooks/useHotkeys';
import { downloadJson, formatMinutes } from '../lib/utils';
import {
  filterTasks,
  selectGoalMinutes,
  selectGoalProgress,
  selectProjectMinutes,
  selectTaskGoalId,
  selectTaskMinutes,
  useGoalFlowStore,
} from '../store/useGoalFlowStore';
import type { AppSnapshot, TaskFilter } from '../types/models';

const FILTERS: Array<{ id: TaskFilter; label: string }> = [
  { id: 'all', label: 'All tasks' },
  { id: 'no_goal', label: 'No goal' },
  { id: 'over_4h', label: 'Over 4h' },
  { id: 'week', label: 'This week' },
];

const Dashboard = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [quickTask, setQuickTask] = useState('');
  const [commandSearch, setCommandSearch] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectGoalId, setProjectGoalId] = useState('');
  const [liveNow, setLiveNow] = useState(Date.now());

  const {
    hydrated,
    goals,
    projects,
    tasks,
    timeEntries,
    activeTimer,
    filter,
    search,
    commandPaletteOpen,
    createTaskOpen,
    timerWarning,
    hydrate,
    setFilter,
    setSearch,
    setCommandPaletteOpen,
    setCreateTaskOpen,
    addGoal,
    addProject,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
    startTimer,
    stopTimer,
    addManualTime,
    exportJson,
    importJson,
    dismissTimerWarning,
  } = useGoalFlowStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!activeTimer) return;
    const id = window.setInterval(() => setLiveNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  useHotkeys({
    n: () => setCreateTaskOpen(true),
    'mod+k': () => setCommandPaletteOpen(true),
    'mod+f': () => {
      const next = document.getElementById('task-search') as HTMLInputElement | null;
      next?.focus();
    },
  });

  const visibleTasks = useMemo(
    () => filterTasks(tasks, filter, timeEntries, search, projects),
    [filter, projects, search, tasks, timeEntries],
  );

  const runningTaskExtraMinutes = activeTimer
    ? Math.max(
        0,
        Math.round((liveNow - new Date(activeTimer.startedAt).getTime()) / 60000),
      )
    : 0;

  const inboxCount = tasks.filter(
    (task) => !selectTaskGoalId(task, projects) && !task.projectId,
  ).length;
  const totalTrackedMinutes =
    timeEntries.reduce((total, entry) => total + entry.durationMinutes, 0) +
    runningTaskExtraMinutes;

  const commands = [
    {
      id: 'new-task',
      label: 'Create task',
      shortcut: 'N',
      onRun: () => setCreateTaskOpen(true),
    },
    {
      id: 'search',
      label: 'Focus search',
      shortcut: 'Cmd/Ctrl+F',
      onRun: () => {
        const next = document.getElementById('task-search') as HTMLInputElement | null;
        next?.focus();
      },
    },
    {
      id: 'export',
      label: 'Export JSON',
      onRun: () => {
        downloadJson('goalflow-export.json', exportJson());
      },
    },
    {
      id: 'import',
      label: 'Import JSON',
      onRun: () => fileInputRef.current?.click(),
    },
    {
      id: 'stop-timer',
      label: 'Stop active timer',
      onRun: () => {
        void stopTimer();
      },
    },
  ];

  if (!hydrated) {
    return <div className="loading-screen">Loading GoalFlow...</div>;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Goal-driven work tracker</div>
          <h1>GoalFlow</h1>
          <p>
            Tasks stay connected to goals, projects and actual time spent. No split
            between planning and tracking.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>Total tracked</span>
            <strong>{formatMinutes(totalTrackedMinutes)}</strong>
          </div>
          <div className="stat-card">
            <span>Inbox tasks</span>
            <strong>{inboxCount}</strong>
          </div>
          <div className="stat-card">
            <span>Running timer</span>
            <strong>
              {activeTimer
                ? formatMinutes(runningTaskExtraMinutes)
                : 'idle'}
            </strong>
          </div>
        </div>
      </header>

      {timerWarning ? (
        <div className="banner warning-banner">
          <span>{timerWarning}</span>
          <button className="ghost-button" onClick={dismissTimerWarning}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="top-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Quick capture</h2>
              <p>Use `N` or add a task inline.</p>
            </div>
            <button className="primary-button" onClick={() => setCreateTaskOpen(true)}>
              New task
            </button>
          </div>
          <form
            className="quick-task-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!quickTask.trim()) return;
              await addTask({ title: quickTask.trim() });
              setQuickTask('');
            }}
          >
            <input
              className="input quick-task-input"
              value={quickTask}
              onChange={(event) => setQuickTask(event.target.value)}
              placeholder="Quick task input"
            />
            <button className="ghost-button" type="submit">
              Add
            </button>
          </form>
          <div className="shortcut-row">
            <button className="ghost-button" onClick={() => setCommandPaletteOpen(true)}>
              Command palette
            </button>
            <button
              className="ghost-button"
              onClick={() => downloadJson('goalflow-export.json', exportJson())}
            >
              Export JSON
            </button>
            <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
              Import JSON
            </button>
          </div>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const json = JSON.parse(text) as AppSnapshot;
              await importJson(json);
              event.target.value = '';
            }}
          />
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Goals</h2>
              <p>Progress is aggregated from connected tasks.</p>
            </div>
          </div>
          <form
            className="inline-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!goalTitle.trim()) return;
              await addGoal({ title: goalTitle });
              setGoalTitle('');
            }}
          >
            <input
              className="input"
              value={goalTitle}
              onChange={(event) => setGoalTitle(event.target.value)}
              placeholder="Launch MVP"
            />
            <button className="ghost-button" type="submit">
              Add goal
            </button>
          </form>
          <div className="stack-list">
            {goals.length === 0 ? (
              <div className="empty-state">No goals yet.</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="entity-row">
                  <div>
                    <strong>{goal.title}</strong>
                    <p>
                      {selectGoalProgress(goal.id, tasks, projects)}% complete ·{' '}
                      {formatMinutes(selectGoalMinutes(goal.id, tasks, projects, timeEntries))}
                    </p>
                  </div>
                  <div className="progress-bar">
                    <span
                      style={{
                        width: `${selectGoalProgress(goal.id, tasks, projects)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Projects</h2>
              <p>Nested under goals, optional for every task.</p>
            </div>
          </div>
          <form
            className="inline-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!projectTitle.trim()) return;
              await addProject({ title: projectTitle, goalId: projectGoalId || undefined });
              setProjectTitle('');
              setProjectGoalId('');
            }}
          >
            <input
              className="input"
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              placeholder="Marketing site"
            />
            <select
              className="input"
              value={projectGoalId}
              onChange={(event) => setProjectGoalId(event.target.value)}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <button className="ghost-button" type="submit">
              Add project
            </button>
          </form>
          <div className="stack-list">
            {projects.length === 0 ? (
              <div className="empty-state">No projects yet.</div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="entity-row">
                  <div>
                    <strong>{project.title}</strong>
                    <p>
                      {goals.find((goal) => goal.id === project.goalId)?.title ?? 'No goal'} ·{' '}
                      {formatMinutes(selectProjectMinutes(project.id, tasks, timeEntries))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="panel task-section">
        <div className="section-header">
          <div>
            <h2>Tasks</h2>
            <p>Filter by focus, effort and this week.</p>
          </div>
          <div className="task-toolbar">
            <input
              id="task-search"
              className="input search-input"
              placeholder="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="filter-row">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  className={filter === item.id ? 'filter-chip active' : 'filter-chip'}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="task-list">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">No tasks match the current filter.</div>
          ) : (
            visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                goals={goals}
                projects={projects}
                trackedMinutes={selectTaskMinutes(task.id, timeEntries)}
                isTimerRunning={activeTimer?.taskId === task.id}
                elapsedLiveMinutes={
                  activeTimer?.taskId === task.id ? runningTaskExtraMinutes : 0
                }
                onStartTimer={startTimer}
                onStopTimer={stopTimer}
                onDelete={deleteTask}
                onStatusChange={updateTaskStatus}
                onAddManualTime={addManualTime}
                onUpdateTask={updateTask}
              />
            ))
          )}
        </div>
      </section>

      <CommandPalette
        open={commandPaletteOpen}
        search={commandSearch}
        onSearchChange={setCommandSearch}
        onClose={() => {
          setCommandPaletteOpen(false);
          setCommandSearch('');
        }}
        commands={commands}
      />

      <CreateTaskModal
        open={createTaskOpen}
        goals={goals}
        projects={projects}
        onClose={() => setCreateTaskOpen(false)}
        onSubmit={addTask}
      />
    </div>
  );
};

export const App = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
  </Routes>
);
