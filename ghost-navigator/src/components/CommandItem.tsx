import type { BuiltinCommand } from "../core";

interface CommandItemProps {
  command: BuiltinCommand;
  onClick: () => void;
}

export default function CommandItem({ command, onClick }: CommandItemProps) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="ghost-cmd-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer bg-violet-50 mb-0.5 transition-colors"
    >
      <span className="text-[15px]">{command.icon}</span>
      <span className="text-[13px] font-medium text-violet-600">{command.label}</span>
      <span className="ml-auto text-[10px] text-violet-400 bg-violet-100 px-1.5 rounded">
        command
      </span>
    </div>
  );
}
