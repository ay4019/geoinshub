"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
  label = "Search",
}: SearchInputProps) {
  return (
    <div className="w-full">
      <label htmlFor="search" className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id="search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-500"
      />
    </div>
  );
}
