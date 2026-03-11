interface StatusBarProps {
  message: string;
}

export default function StatusBar({ message }: StatusBarProps) {
  if (!message) return null;

  return (
    <div className="border-t border-slate-100 px-4 py-2 text-xs text-violet-500 font-medium">
      {message}
    </div>
  );
}
