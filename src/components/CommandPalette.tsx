import { useMemo } from 'react';

type Command = {
  id: string;
  label: string;
  shortcut?: string;
  onRun: () => void;
};

type Props = {
  open: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  commands: Command[];
};

export const CommandPalette = ({
  open,
  search,
  onSearchChange,
  onClose,
  commands,
}: Props) => {
  const visibleCommands = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return commands;
    return commands.filter((command) =>
      command.label.toLowerCase().includes(query),
    );
  }, [commands, search]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel panel-command" onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          className="input command-input"
          placeholder="Command palette"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="command-list">
          {visibleCommands.map((command) => (
            <button
              key={command.id}
              className="command-item"
              onClick={() => {
                command.onRun();
                onClose();
              }}
            >
              <span>{command.label}</span>
              {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
            </button>
          ))}
          {visibleCommands.length === 0 ? (
            <div className="empty-state">No commands found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
