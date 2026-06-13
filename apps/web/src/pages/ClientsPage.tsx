import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isActive: boolean;
  creditBalance: number;
  _count: { patients: number };
}

export function ClientsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page), limit: "25" });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["clients", page, search],
    queryFn: () => apiGet<Client[]>(`/clients?${params}`),
  });

  const clients = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Clients</h2>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-gray-500">No clients found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pets</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      to={`/clients/${c.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c._count.patients}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {c.creditBalance > 0
                      ? `$${(c.creditBalance / 100).toFixed(2)}`
                      : "—"}
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
