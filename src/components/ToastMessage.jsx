export default function ToastMessage({ toast }) {
  if (!toast) return null;

  const toneClasses = {
    success: 'border-success/40 bg-success/15 text-green-100',
    error: 'border-danger/40 bg-danger/15 text-red-100',
    warning: 'border-warning/40 bg-warning/15 text-orange-100',
  };

  return (
    <div className="fixed right-4 top-4 z-[90] w-full max-w-sm">
      <div
        className={`rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
          toneClasses[toast.type] || toneClasses.success
        }`}
      >
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
