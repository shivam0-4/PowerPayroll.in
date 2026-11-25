import React from 'react';
import { Modal } from '../common/Modal';
import { PaymentReceiptData } from '../../types';
import { Printer, Download, CheckCircle2, ShieldCheck, Building2, User, FileText } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: PaymentReceiptData | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Payment Settlement Voucher"
      subtitle={`Official Proof of Disbursal - Ref: ${receipt.transaction_ref}`}
      maxWidth="lg"
    >
      <div className="space-y-5 text-slate-800">
        {/* Printable Voucher Sheet */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-xs printable-voucher">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-900 text-gold-400 font-black text-sm flex items-center justify-center">
                    GP
                  </span>
                  <div>
                    <h2 className="text-base font-black text-brand-950 tracking-tight">
                      {receipt.company.name}
                    </h2>
                    <p className="text-[11px] text-slate-500">{receipt.company.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-500 font-mono">
                  {receipt.company.gst_no && <span>GSTIN: <strong>{receipt.company.gst_no}</strong></span>}
                  {receipt.company.pan_no && <span>PAN: <strong>{receipt.company.pan_no}</strong></span>}
                  {receipt.company.pf_code && <span>EPFO Est: <strong>{receipt.company.pf_code}</strong></span>}
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  CONFIRMED SETTLEMENT
                </span>
                <div className="text-xs font-mono font-bold text-slate-700 mt-2">
                  {receipt.receipt_number}
                </div>
                <div className="text-[10px] text-slate-400">{receipt.payment_date}</div>
              </div>
            </div>
          </div>

          {/* Amount Hero Box */}
          <div className="bg-gradient-to-r from-brand-950 to-brand-900 text-white rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400 block">
                  Amount Disbursed & Settled
                </span>
                <div className="text-2xl font-black tracking-tight text-white mt-0.5">
                  ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-300 block">Payout Rail</span>
                <span className="text-xs font-bold text-gold-400 bg-brand-800/80 px-2.5 py-1 rounded-lg border border-brand-700 inline-block mt-0.5">
                  {receipt.payment_mode}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-brand-800/80 text-[11px] text-brand-200 italic">
              Amount in words: <span className="font-semibold text-white">{receipt.amount_in_words}</span>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-5">
            {/* Beneficiary Details */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="font-bold text-slate-900 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
                <User className="w-3.5 h-3.5 text-brand-800" />
                <span>Beneficiary Worker</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Name:</span>
                <span className="col-span-2 font-bold text-slate-900">{receipt.employee.full_name}</span>

                <span className="text-slate-500">Emp Code:</span>
                <span className="col-span-2 font-mono font-bold text-brand-900">{receipt.employee.emp_code}</span>

                <span className="text-slate-500">Department:</span>
                <span className="col-span-2 text-slate-700">{receipt.employee.department}</span>

                <span className="text-slate-500">Bank:</span>
                <span className="col-span-2 text-slate-700">{receipt.employee.bank_name}</span>

                <span className="text-slate-500">A/C (Masked):</span>
                <span className="col-span-2 font-mono font-bold text-slate-800">{receipt.employee.bank_account_masked}</span>

                <span className="text-slate-500">IFSC Code:</span>
                <span className="col-span-2 font-mono font-bold text-slate-800">{receipt.employee.bank_ifsc}</span>
              </div>
            </div>

            {/* Transaction & Salary Period */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
              <div className="font-bold text-slate-900 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-800" />
                <span>Disbursal & Audit Ledger</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <span className="text-slate-500">Cycle / Month:</span>
                <span className="col-span-2 font-bold text-slate-900">{receipt.payroll_details.period_label || receipt.payroll_details.salary_month}</span>

                <span className="text-slate-500">Net Payable:</span>
                <span className="col-span-2 font-bold text-slate-900">
                  ₹{receipt.payroll_details.net_payable_salary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>

                <span className="text-slate-500">Settled Total:</span>
                <span className="col-span-2 font-bold text-emerald-700">
                  ₹{receipt.payroll_details.total_paid_so_far.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>

                <span className="text-slate-500">Remaining Due:</span>
                <span className="col-span-2 font-bold text-amber-700">
                  ₹{receipt.payroll_details.remaining_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>

                <span className="text-slate-500">UTR / Ref:</span>
                <span className="col-span-2 font-mono text-[11px] font-bold text-slate-900 break-all">
                  {receipt.transaction_ref}
                </span>

                {receipt.provider_tx_id && (
                  <>
                    <span className="text-slate-500">Gateway ID:</span>
                    <span className="col-span-2 font-mono text-[10px] text-slate-600 break-all">
                      {receipt.provider_tx_id}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Verification Footer */}
          <div className="pt-3 border-t border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold mb-2 sm:mb-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Digital Banking Audit Trail Verified • Immutable Transaction Record</span>
            </div>
            <div>
              Settled by: <strong className="text-slate-700">{receipt.settled_by}</strong>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-2 pt-2 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-brand-800 hover:bg-brand-900 text-gold-400 font-bold rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
