export default function Field({ label, textarea = false, className = '', ...props }) {
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <label className={`flex flex-col gap-2 text-left ${className}`}>
      <span className="text-xs uppercase tracking-wide-caps text-mist">{label}</span>
      <Tag
        {...props}
        className="border border-line-strong bg-transparent px-4 py-3 text-sm text-paper outline-none transition placeholder:text-mist-dim focus:border-signal"
      />
    </label>
  );
}
