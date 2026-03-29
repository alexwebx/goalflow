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
  { id: 'all', label: 'Все задачи' },
  { id: 'no_goal', label: 'Без цели' },
  { id: 'over_4h', label: 'Больше 4 ч' },
  { id: 'week', label: 'На этой неделе' },
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
      label: 'Создать задачу',
      shortcut: 'N',
      onRun: () => setCreateTaskOpen(true),
    },
    {
      id: 'search',
      label: 'Перейти к поиску',
      shortcut: 'Cmd/Ctrl+F',
      onRun: () => {
        const next = document.getElementById('task-search') as HTMLInputElement | null;
        next?.focus();
      },
    },
    {
      id: 'export',
      label: 'Экспорт JSON',
      onRun: () => {
        downloadJson('goalflow-export.json', exportJson());
      },
    },
    {
      id: 'import',
      label: 'Импорт JSON',
      onRun: () => fileInputRef.current?.click(),
    },
    {
      id: 'stop-timer',
      label: 'Остановить активный таймер',
      onRun: () => {
        void stopTimer();
      },
    },
  ];

  if (!hydrated) {
    return <div className="loading-screen">Загрузка GoalFlow...</div>;
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Планирование через цели</div>
          <h1>GoalFlow</h1>
          <p>
            Задачи связаны с целями, проектами и фактическим временем. Планирование
            и трекинг собраны в одном приложении.
          </p>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span>Всего учтено</span>
            <strong>{formatMinutes(totalTrackedMinutes)}</strong>
          </div>
          <div className="stat-card">
            <span>Входящие задачи</span>
            <strong>{inboxCount}</strong>
          </div>
          <div className="stat-card">
            <span>Активный таймер</span>
            <strong>
              {activeTimer
                ? formatMinutes(runningTaskExtraMinutes)
                : 'нет'}
            </strong>
          </div>
        </div>
      </header>

      {timerWarning ? (
        <div className="banner warning-banner">
          <span>{timerWarning}</span>
          <button className="ghost-button" onClick={dismissTimerWarning}>
            Скрыть
          </button>
        </div>
      ) : null}

      <section className="top-grid">
        <div className="panel">
          <div className="section-header">
            <div>
              <h2>Быстрый ввод</h2>
              <p>Нажми `N` или добавь задачу сразу в поле.</p>
            </div>
            <button className="primary-button" onClick={() => setCreateTaskOpen(true)}>
              Новая задача
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
              placeholder="Быстро добавить задачу"
            />
            <button className="ghost-button" type="submit">
              Добавить
            </button>
          </form>
          <div className="shortcut-row">
            <button className="ghost-button" onClick={() => setCommandPaletteOpen(true)}>
              Палитра команд
            </button>
            <button
              className="ghost-button"
              onClick={() => downloadJson('goalflow-export.json', exportJson())}
            >
              Экспорт JSON
            </button>
            <button className="ghost-button" onClick={() => fileInputRef.current?.click()}>
              Импорт JSON
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
              <h2>Цели</h2>
              <p>Прогресс считается автоматически по связанным задачам.</p>
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
              placeholder="Запустить MVP"
            />
            <button className="ghost-button" type="submit">
              Добавить цель
            </button>
          </form>
          <div className="stack-list">
            {goals.length === 0 ? (
              <div className="empty-state">Целей пока нет.</div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="entity-row">
                  <div>
                    <strong>{goal.title}</strong>
                    <p>
                      Готово {selectGoalProgress(goal.id, tasks, projects)}% ·{' '}
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
              <h2>Проекты</h2>
              <p>Располагаются внутри целей и необязательны для задач.</p>
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
              placeholder="Маркетинговый сайт"
            />
            <select
              className="input"
              value={projectGoalId}
              onChange={(event) => setProjectGoalId(event.target.value)}
            >
              <option value="">Без цели</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <button className="ghost-button" type="submit">
              Добавить проект
            </button>
          </form>
          <div className="stack-list">
            {projects.length === 0 ? (
              <div className="empty-state">Проектов пока нет.</div>
            ) : (
              projects.map((project) => (
                <div key={project.id} className="entity-row">
                  <div>
                    <strong>{project.title}</strong>
                    <p>
                      {goals.find((goal) => goal.id === project.goalId)?.title ?? 'Без цели'} ·{' '}
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
            <h2>Задачи</h2>
            <p>Фильтруй список по фокусу, времени и текущей неделе.</p>
          </div>
          <div className="task-toolbar">
            <input
              id="task-search"
              className="input search-input"
              placeholder="Поиск задач"
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
            <div className="empty-state">Нет задач под выбранный фильтр.</div>
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
