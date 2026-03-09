interface BadgeProps {
  label: string;
  color: string;
  bg: string;
}

export function Badge({ label, color, bg }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${bg}`}>
      {label}
    </span>
  );
}
