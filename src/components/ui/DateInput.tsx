interface Props {
  value: string;
  onChange: (value: string) => void;
  /** true while the field shows a date that is only partly typed in */
  onIncompleteChange: (incomplete: boolean) => void;
  min?: string;
  className?: string;
}

/**
 * Native date field that also reports a partly typed date.
 *
 * When only one part is typed (e.g. the month), the browser keeps the value
 * empty and fires no change event, while greyed-out hints (taken from `min`)
 * make the date look complete. The only trace is `validity.badInput`, which we
 * read on blur and on key presses.
 */
export function DateInput({ value, onChange, onIncompleteChange, min, className = '' }: Props) {
  const check = (el: HTMLInputElement) => onIncompleteChange(el.validity.badInput);

  return (
    <input
      type="date"
      value={value}
      min={min}
      onChange={(e) => {
        onChange(e.target.value);
        check(e.target);
      }}
      onBlur={(e) => check(e.currentTarget)}
      onKeyUp={(e) => check(e.currentTarget)}
      className={className}
    />
  );
}

export const INCOMPLETE_DATE_MESSAGE =
  'Date incomplète : saisissez le jour, le mois et l\'année. Les chiffres en gris ne sont que des suggestions.';
