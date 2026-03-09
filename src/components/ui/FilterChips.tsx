interface FilterChip<T extends string> {
  value: T;
  label: string;
}

interface FilterChipsProps<T extends string> {
  chips: FilterChip<T>[];
  selected: T;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({ chips, selected, onChange }: FilterChipsProps<T>) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onChange(chip.value)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === chip.value
              ? 'bg-[#007AFF] text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
