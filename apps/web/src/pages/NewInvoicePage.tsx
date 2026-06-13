import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface LineItem {
  key: number;
  serviceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

let nextKey = 1;

function emptyItem(): LineItem {
  return { key: nextKey++, serviceId: "", description: "", quantity: 1, unitPrice: 0 };
}

export function NewInvoicePage() {
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [taxDollars, setTaxDollars] = useState("");
  const [error, setError] = useState("");

  const { data: clientsData } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => apiGet<Client[]>("/clients?limit=100"),
  });

  const { data: servicesData } = useQuery({
    queryKey: ["services-active"],
    queryFn: () => apiGet<Service[]>("/services"),
  });

  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData as { data?: Client[] } | undefined)?.data ?? [];
  const services = Array.isArray(servicesData)
    ? servicesData
    : (servicesData as { data?: Service[] } | undefined)?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data: { clientId: string; items: { serviceId?: string; description: string; quantity: number; unitPrice: number }[]; taxAmount: number }) =>
      apiPost<{ data: { id: string } }>("/invoices", data),
    onSuccess: (data) => {
      navigate(`/invoices/${data.data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  function updateItem(key: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function handleServiceSelect(key: number, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      updateItem(key, { serviceId, description: svc.name, unitPrice: svc.price });
    } else {
      updateItem(key, { serviceId: "" });
    }
  }

  function removeItem(key: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev));
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const taxAmount = Math.round(parseFloat(taxDollars || "0") * 100);
  const total = subtotal + taxAmount;

  function handleSubmit() {
    if (!clientId) { setError("Select a client"); return; }
    if (items.some((i) => !i.description || i.unitPrice <= 0)) {
      setError("All items need a description and price");
      return;
    }
    setError("");
    mutation.mutate({
      clientId,
      items: items.map((i) => ({
        ...(i.serviceId ? { serviceId: i.serviceId } : {}),
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      taxAmount,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">New Invoice</h2>

      <div className="max-w-3xl space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        {/* Client selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Line items */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <select
                  value={item.serviceId}
                  onChange={(e) => handleServiceSelect(item.key, e.target.value)}
                  className="w-48 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Custom item</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ${(s.price / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(item.key, { description: e.target.value })}
                  placeholder="Description"
                  className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-16 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(item.unitPrice / 100).toFixed(2)}
                    onChange={(e) => updateItem(item.key, { unitPrice: Math.round(parseFloat(e.target.value || "0") * 100) })}
                    className="w-24 rounded-md border border-gray-300 pl-6 pr-2 py-1.5 text-sm text-right"
                  />
                </div>
                <span className="w-20 text-right text-sm font-medium text-gray-700">
                  ${((item.unitPrice * item.quantity) / 100).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem(item.key)}
                  className="text-gray-400 hover:text-red-500 text-sm px-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="mt-2 text-sm text-indigo-600 hover:underline"
          >
            + Add item
          </button>
        </div>

        {/* Tax */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Tax ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={taxDollars}
            onChange={(e) => setTaxDollars(e.target.value)}
            placeholder="0.00"
            className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>${(taxAmount / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating..." : "Create Invoice"}
          </button>
          <button
            onClick={() => navigate("/invoices")}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}
