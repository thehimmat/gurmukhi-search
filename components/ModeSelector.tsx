'use client';

type Mode = 'contains' | 'first_letter' | 'pattern';

type Props = {
  value: Mode;
  onChange: (m: Mode) => void;
};

const MODES: { id: Mode; label: string; desc: string }[] = [
  {
    id: 'contains',
    label: 'Contains',
    desc: 'Find lines containing this substring or Gurmukhi text',
  },
  {
    id: 'first_letter',
    label: 'First Letter',
    desc: 'Anagram search — match first letter of each word (like igurbani)',
  },
  {
    id: 'pattern',
    label: 'Pattern',
    desc: 'Wildcard search: _, *, {nasal}, {bilabial}, etc.',
  },
];

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 bg-[#f0e4d0] rounded-lg p-1" role="tablist">
      {MODES.map(m => (
        <button
          key={m.id}
          role="tab"
          aria-selected={value === m.id}
          title={m.desc}
          onClick={() => onChange(m.id)}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === m.id
              ? 'bg-[#8b5e3c] text-[#fdf6ec] shadow-sm'
              : 'text-[#5c3d1e] hover:bg-[#e0d0b8]'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
