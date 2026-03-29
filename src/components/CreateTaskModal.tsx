import { useState } from 'react';
import { toInputDate } from '../lib/utils';
import type { Goal, Project } from '../types/models';

type Props = {
  open: boolean;
  goals: Goal[];
  projects: Project[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    goalId?: string;
    projectId?: string;
    tags?: string[];
    deadline?: string;
  }) => Promise<void>;
};

export const CreateTaskModal = ({
  open,
  goals,
  projects,
  onClose,
  onSubmit,
}: Props) => {
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');
  const [deadline, setDeadline] = useState('');

  if (!open) return null;

  const filteredProjects = goalId
    ? projects.filter((project) => project.goalId === goalId)
    : projects;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel modal" onClick={(event) => event.stopPropagation()}>
        <div className="section-header">
          <div>
            <h3>New task</h3>
            <p>Quick input with goal and time context.</p>
          </div>
          <button className="ghost-button" onClick={onClose}>
            Close
          </button>
        </div>
        <form
          className="form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!title.trim()) return;
            await onSubmit({
              title,
              goalId: goalId || undefined,
              projectId: projectId || undefined,
              tags: tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              deadline: deadline || undefined,
            });
            setTitle('');
            setGoalId('');
            setProjectId('');
            setTags('');
            setDeadline(toInputDate(undefined));
          }}
        >
          <label className="field">
            <span>Title</span>
            <input
              autoFocus
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Prepare weekly sprint review"
            />
          </label>
          <label className="field">
            <span>Goal</span>
            <select
              className="input"
              value={goalId}
              onChange={(event) => {
                setGoalId(event.target.value);
                setProjectId('');
              }}
            >
              <option value="">No goal</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Project</span>
            <select
              className="input"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              <option value="">No project</option>
              {filteredProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Deadline</span>
            <input
              className="input"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
          <label className="field field-wide">
            <span>Tags</span>
            <input
              className="input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="design, mvp, client"
            />
          </label>
          <button className="primary-button field-wide" type="submit">
            Create task
          </button>
        </form>
      </div>
    </div>
  );
};
