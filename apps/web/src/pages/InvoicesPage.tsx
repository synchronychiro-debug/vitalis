import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";

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
  client: { id: string; firstName: string; lastName: string };
  items: { id: string }[];
  appointment: { id: string; scheduledAt: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  VOID: "bg-red-100 text-red-700",
};

export function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("");

  const params = new URLSearchParams({ limit: "100" });
  if (statusFilter) params.set("status", statusFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", statusFilter],
    queryFn: () => apiGet<Invoice[]>(`/invoices?${params}`),
  });

  const invoices = Array.isArray(data)
    ? data
    : (data as { data?: Invoice[] } | undefined)?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <Link
          to="/invoices/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Invoice
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-gray-500">No invoices found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:underline">
                      #{inv.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <Link to={`/clients/${inv.client.id}`} className="hover:text-indigo-600">
                      {inv.client.firstName} {inv.client.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{inv.items.length}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ${(inv.totalDue / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    ${(inv.paidAmount / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100"}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
