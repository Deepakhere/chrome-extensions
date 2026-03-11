export default function Footer() {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span>↑↓ navigate</span>
        <span>↵ go</span>
        <span>⇥ preview</span>
        <span>esc close</span>
      </div>

      <div className="flex items-center gap-2 shrink-0 text-slate-500">
        <span>Open search bar</span>
        <kbd className="text-xs font-semibold text-violet-500 shrink-0">
          Alt+G
        </kbd>
      </div>
    </div>
  );
}
