import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiPost } from "../lib/api";

interface InvoiceItem {
  id: string;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  service: { id: string; name: string } | null;
}

interface Invoice {
  id: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  creditApplied: number;
  totalDue: number;
  paidAmount: number;
  createdAt: string;
  issuedAt: string | null;
  paidAt: string | null;
  client: { id: string; firstName: string; lastName: string; email: string; creditBalance: number };
  items: InvoiceItem[];
  appointment: { id: string; scheduledAt: string; type: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  VOID: "bg-red-100 text-red-700",
};

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [payAmount, setPayAmount] = useState("");
  const [applyCredit, setApplyCredit] = useState("");
  const [payError, setPayError] = useState("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => apiGet<Invoice>(`/invoices/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiPatch(`/invoices/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices", id] }),
  });

  const payMutation = useMutation({
    mutationFn: (data: { amount: number; applyCredit: number }) =>
      apiPost(`/invoices/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      setPayAmount("");
      setApplyCredit("");
      setPayError("");
    },
    onError: (err: Error) => setPayError(err.message),
  });

  function handlePay() {
    const amountCents = Math.round(parseFloat(payAmount || "0") * 100);
    const creditCents = Math.round(parseFloat(applyCredit || "0") * 100);
    if (amountCents <= 0 && creditCents <= 0) {
      setPayError("Enter a payment amount");
      return;
    }
    payMutation.mutate({ amount: amountCents, applyCredit: creditCents });
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!invoice) return <p className="text-red-600">Invoice not found</p>;

  const balanceRemaining = invoice.totalDue - invoice.creditApplied - invoice.paidAmount;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/invoices" className="text-sm text-indigo-600 hover:underline">
          &larr; Invoices
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice #{invoice.id.slice(0, 8)}
          </h2>
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Subtotal" value={dollars(invoice.subtotal)} />
        <StatCard label="Tax" value={dollars(invoice.taxAmount)} />
        <StatCard label="Total Due" value={dollars(invoice.totalDue)} />
        <StatCard
          label="Balance"
          value={dollars(balanceRemaining)}
          highlight={balanceRemaining > 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Client info */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Client</h3>
          <p className="text-sm">
            <Link to={`/clients/${invoice.client.id}`} className="font-medium text-indigo-600 hover:underline">
              {invoice.client.firstName} {invoice.client.lastName}
            </Link>
          </p>
          <p className="text-sm text-gray-600">{invoice.client.email}</p>
          <p className="mt-1 text-sm text-gray-600">
            Credit balance: {dollars(invoice.client.creditBalance)}
          </p>
        </div>

        {/* Dates */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Details</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd>{new Date(invoice.createdAt).toLocaleDateString()}</dd>
            </div>
            {invoice.issuedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Issued</dt>
                <dd>{new Date(invoice.issuedAt).toLocaleDateString()}</dd>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid</dt>
                <dd>{new Date(invoice.paidAt).toLocaleDateString()}</dd>
              </div>
            )}
            {invoice.creditApplied > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Credit Applied</dt>
                <dd>{dollars(invoice.creditApplied)}</dd>
              </div>
            )}
            {invoice.paidAmount > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Paid Amount</dt>
                <dd>{dollars(invoice.paidAmount)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Line items */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Line Items</h3>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Unit Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.service?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{dollars(item.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{dollars(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium text-gray-700">Subtotal</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">{dollars(invoice.subtotal)}</td>
              </tr>
              {invoice.taxAmount > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Tax</td>
                  <td className="px-4 py-2 text-right text-sm text-gray-700">{dollars(invoice.taxAmount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold text-gray-900">Total Due</td>
                <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">{dollars(invoice.totalDue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-6">
        {/* Status actions */}
        {invoice.status !== "VOID" && invoice.status !== "PAID" && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Actions</h3>
            <div className="flex gap-2">
              {invoice.status === "DRAFT" && (
                <button
                  onClick={() => statusMutation.mutate("ISSUED")}
                  disabled={statusMutation.isPending}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Issue Invoice
                </button>
              )}
              {invoice.status !== "DRAFT" && (
                <button
                  onClick={() => statusMutation.mutate("VOID")}
                  disabled={statusMutation.isPending}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Void
                </button>
              )}
            </div>
          </div>
        )}

        {/* Payment form */}
        {(invoice.status === "ISSUED" || invoice.status === "PARTIAL") && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Record Payment</h3>
            <div className="flex items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  placeholder="0.00"
                />
              </div>
              {invoice.client.creditBalance > 0 && (
                <div>
                  <label className="block text-xs text-gray-500">
                    Apply Credit (max {dollars(invoice.client.creditBalance)})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={invoice.client.creditBalance / 100}
                    value={applyCredit}
                    onChange={(e) => setApplyCredit(e.target.value)}
                    className="mt-1 w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="0.00"
                  />
                </div>
              )}
              <button
                onClick={handlePay}
                disabled={payMutation.isPending}
                className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {payMutation.isPending ? "Processing..." : "Pay"}
              </button>
            </div>
            {payError && <p className="mt-2 text-sm text-red-600">{payError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
