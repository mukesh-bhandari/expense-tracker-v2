function UnsavedChangesDialog({ onLeave, onStay }) {
  return (
    <>
      <div className="fixed inset-0 modal-backdrop z-40" />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-xl z-50 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Unsaved Changes</h2>
        <p className="text-muted-foreground mb-6">
          You have unsaved changes. If you leave now, they will be lost.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onStay}
            className="flex-1 px-4 py-2 btn-secondary-expense font-medium"
          >
            Stay
          </button>
          <button
            onClick={onLeave}
            className="flex-1 px-4 py-2 btn-danger-expense font-medium"
          >
            Leave
          </button>
        </div>
      </div>
    </>
  );
}

export default UnsavedChangesDialog;
