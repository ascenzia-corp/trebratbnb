import { useEffect, useRef, useState, type Ref } from 'react';

interface Props {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** lets the parent focus the field from within a tap (needed on iOS) */
  inputRef?: Ref<HTMLTextAreaElement>;
}

const SAVE_DELAY_MS = 800;

/**
 * Textarea that saves on its own while typing (debounced) and on blur, so
 * nothing is lost if the phone locks mid-sentence. While focused it keeps the
 * user's text even if fresher data arrives from the server.
 */
export function AutoSaveTextarea({ value, onSave, placeholder, rows = 2, className = '', inputRef }: Props) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);
  const lastSaved = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Take newer data from outside, unless the user is typing in this field.
  if (!focused && value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  const save = (text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (text !== lastSaved.current) {
      lastSaved.current = text;
      onSave(text);
    }
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <textarea
      ref={inputRef}
      value={draft}
      rows={rows}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        save(draft);
      }}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => save(text), SAVE_DELAY_MS);
      }}
      className={`w-full bg-white rounded-xl px-3 py-2.5 text-sm text-gray-900 border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] ${className}`}
    />
  );
}
