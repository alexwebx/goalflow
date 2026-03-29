import { useEffect, useState } from 'react';
import { formatMinutes, toInputDate } from '../lib/utils';
import type { Goal, Project, Task } from '../types/models';

type Props = {
  task: Task;
  goals: Goal[];
  projects: Project[];
  trackedMinutes: number;
  isTimerRunning: boolean;
  elapsedLiveMinutes: number;
  onStartTimer: (taskId: string) => Promise<void>;
  onStopTimer: () => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onStatusChange: (taskId: string, status: Task['status']) => Promise<void>;
  onAddManualTime: (taskId: string, minutes: number) => Promise<void>;
  onUpdateTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
};

export const TaskCard = ({
  task,
  goals,
  projects,
  trackedMinutes,
  isTimerRunning,
  elapsedLiveMinutes,
  onStartTimer,
  onStopTimer,
  onDelete,
  onStatusChange,
  onAddManualTime,
  onUpdateTask,
}: Props) => {
  const [manualMinutes, setManualMinutes] = useState('30');
  const [isExpanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [deadline, setDeadline] = useState(toInputDate(task.deadline));
  const [tags, setTags] = useState(task.tags.join(', '));
  const project = projects.find((item) => item.id === task.projectId);
  const goal =
    goals.find((item) => item.id === task.goalId) ??
    goals.find((item) => item.id === project?.goalId);
  const totalMinutes = trackedMinutes + elapsedLiveMinutes;

  useEffect(() => {
    setTitle(task.title);
    setDeadline(toInputDate(task.deadline));
    setTags(task.tags.join(', '));
  }, [task.deadline, task.tags, task.title]);

  return (
    <article className={`task-card ${isTimerRunning ? 'task-card-running' : ''}`}>
      <div className="task-main">
        <div className="task-title-row">
          <button
            className={`status-pill status-${task.status}`}
            onClick={() =>
              onStatusChange(
                task.id,
                task.status === 'todo'
                  ? 'in_progress'
                  : task.status === 'in_progress'
                    ? 'done'
                    : 'todo',
              )
            }
          >
            {task.status.replace('_', ' ')}
          </button>
          <h3>{task.title}</h3>
        </div>
        <div className="task-meta">
          <span>{goal?.title ?? 'No goal'}</span>
          <span>{project?.title ?? 'No project'}</span>
          <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
          <span>{formatMinutes(totalMinutes)}</span>
        </div>
        {task.tags.length > 0 ? (
          <div className="tag-list">
            {task.tags.map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="task-actions">
        <button
          className={isTimerRunning ? 'danger-button' : 'primary-button'}
          onClick={() => (isTimerRunning ? onStopTimer() : onStartTimer(task.id))}
        >
          {isTimerRunning ? 'Stop timer' : 'Start timer'}
        </button>
        <button className="ghost-button" onClick={() => setExpanded((value) => !value)}>
          {isExpanded ? 'Hide' : 'Details'}
        </button>
        <button className="ghost-button" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>

      {isExpanded ? (
        <div className="task-expanded">
          <div className="inline-grid">
            <label className="field">
              <span>Title</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => onUpdateTask(task.id, { title: title.trim() || task.title })}
              />
            </label>
            <label className="field">
              <span>Deadline</span>
              <input
                className="input"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                onBlur={() =>
                  onUpdateTask(task.id, {
                    deadline: deadline ? new Date(`${deadline}T12:00:00`).toISOString() : undefined,
                  })
                }
              />
            </label>
            <label className="field field-wide">
              <span>Tags</span>
              <input
                className="input"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                onBlur={() =>
                  onUpdateTask(task.id, {
                    tags: tags
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </div>
          <div className="manual-time">
            <input
              className="input"
              type="number"
              min="1"
              max="720"
              value={manualMinutes}
              onChange={(event) => setManualMinutes(event.target.value)}
            />
            <button
              className="ghost-button"
              onClick={() => onAddManualTime(task.id, Number(manualMinutes))}
            >
              Add manual time
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
};
