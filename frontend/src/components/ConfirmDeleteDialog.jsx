function ConfirmDeleteDialog({ isOpen, itemName, isLoading, onConfirm, onCancel }) {
  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 modal-backdrop z-40"
        onClick={onCancel}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-border rounded-xl z-50 shadow-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Delete Expense?</h2>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete "<strong>{itemName}</strong>"? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 btn-secondary-expense font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 btn-danger-expense font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </>
  );
}

export default ConfirmDeleteDialog;
