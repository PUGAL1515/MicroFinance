
import { X, Printer, CheckCircle2 } from "lucide-react";

const ReceiptModal = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
      <div className="collection-modal-enter max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold text-slate-900">
            Payment Receipt
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div id="collection-receipt" className="text-center">
          <CheckCircle2 className="mx-auto text-emerald-500" size={45} />
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            Payment Successful
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            SMLNEXGEN Microfinance
          </p>

          <div className="my-5 border-t border-dashed border-slate-300" />

          <div className="flex justify-between gap-3 text-sm">
            <span className="text-slate-500">Receipt Number</span>
            <span className="break-all font-bold text-slate-800">
              {receipt.receipt_number || `#${receipt.id}`}
            </span>
          </div>

          <div className="mt-4 flex justify-between gap-3 text-sm">
            <span className="text-slate-500">Date</span>
            <span className="font-semibold text-slate-800">
              {receipt.payment_date || "-"}
            </span>
          </div>

          <div className="mt-4 flex justify-between gap-3 text-sm">
            <span className="text-slate-500">Payment Method</span>
            <span className="font-semibold capitalize text-slate-800">
              {receipt.payment_method || "-"}
            </span>
          </div>

          <div className="mt-4 flex justify-between gap-3 text-sm">
            <span className="text-slate-500">Group</span>
            <span className="font-semibold text-slate-800">
              {receipt.group_name || "-"}
            </span>
          </div>

          <div className="my-5 border-t border-dashed border-slate-300" />

          <p className="text-sm text-slate-500">Amount Received</p>
          <h2 className="mt-2 text-3xl font-extrabold text-emerald-600">
            ₹{Number(receipt.amount || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </h2>

          <p className="mt-5 text-xs text-slate-400">
            Thank you for your payment.
          </p>
        </div>

        <button
          onClick={printReceipt}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 print:hidden"
        >
          <Printer size={17} />
          Print Receipt
        </button>
      </div>
    </div>
  );
};

export default ReceiptModal;
