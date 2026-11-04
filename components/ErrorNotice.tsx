// One way to show a failure anywhere on the page: the reason, and a way out.
export function ErrorNotice({ message, onRetry, compact = false }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div
      role="alert"
      className={compact ? 'mt-4 text-center text-sm text-[#7a6045]' : 'mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]'}
      style={{ fontFamily: '"Inter", sans-serif' }}
    >
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline text-[#8b5e3c]">Try again</button>
      )}
    </div>
  );
}
