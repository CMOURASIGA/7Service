'use client';

export function UploadDocumentForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        type="file"
        name="file"
        accept="application/pdf"
        required
        className="text-muted file:border-border text-xs file:mr-2 file:rounded-md file:border file:bg-white file:px-2 file:py-1 file:text-xs"
      />
      <button
        type="submit"
        className="border-border rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
      >
        Anexar PDF
      </button>
    </form>
  );
}
