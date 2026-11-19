export function Avatar({
  name,
  color,
  size = "md",
}: {
  name: string;
  color: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"
      }`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}
