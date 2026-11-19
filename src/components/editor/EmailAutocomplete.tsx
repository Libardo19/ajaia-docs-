"use client";

import { useId, useState } from "react";
import { Avatar } from "../Avatar";

type Person = { id: string; name: string; email: string; color: string };

/**
 * Email input with Gmail-style suggestions: the list opens on focus, filters as you type,
 * and picking one fills the field. Free-typed emails still work (the server validates them).
 */
export function EmailAutocomplete({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (email: string) => void;
  suggestions: Person[];
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const query = value.trim().toLowerCase();
  const matches = suggestions.filter(
    (p) => !query || p.email.toLowerCase().includes(query) || p.name.toLowerCase().includes(query),
  );
  const showList = open && matches.length > 0;

  function pick(p: Person) {
    onChange(p.email);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && matches[active] && matches[active].email !== value) {
      e.preventDefault(); // first Enter picks the suggestion; the next one submits the form
      pick(matches[active]);
    } else if (e.key === "Escape") {
      e.preventDefault(); // close the list, not the whole dialog
      setOpen(false);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="email"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Add people by email"
        aria-label="Email"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <li className="px-3 pb-1 pt-0.5 text-xs font-medium text-gray-400">Suggested</li>
          {matches.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-blue-50" : ""}`}
            >
              <Avatar name={p.name} color={p.color} size="sm" />
              <span className="min-w-0 text-sm">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-gray-500">{p.email}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
