import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";



function BalanceSheet({ 
  netTransactions,   
  onClose,           
  onTransactionComplete 
}) {
  

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 modal-backdrop z-40 duration-300"
        onClick={onClose} // ===== CALLBACK TO PARENT =====
      />
      
      {/* Sheet */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border z-50 transform transition-transform duration-300 ease-out translate-x-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-warning" />
              Outstanding Balances
            </h3>
            <button
              onClick={onClose} // ===== CALLBACK TO PARENT =====
              className="p-2 hover:bg-secondary rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {Object.entries(netTransactions).length > 0 ? (
              <div className="space-y-0">
                {Object.entries(netTransactions).map(([key, amount]) => {
                  const [from, to] = key.split("->");
                  
                  return (
                    <div key={key} className="bg-card border-b border-border-light p-4 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center">
                            <FontAwesomeIcon icon={faUser} className="text-primary text-sm" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium capitalize text-foreground">{from}</span> owes{' '}
                              <span className="font-medium capitalize text-foreground">{to}</span>
                            </p>
                            <p className="font-semibold amount-negative">
                              NPR {amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <button
                          className="btn-primary-expense px-3 py-1.5 text-xs font-medium"
                          onClick={() => onTransactionComplete([from, to])} // ===== CALLBACK TO PARENT =====
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <p>No outstanding balances</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default BalanceSheet;