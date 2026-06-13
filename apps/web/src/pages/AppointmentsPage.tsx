import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet, apiPatch } from "../lib/api";

interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  location: string | null;
  notes: string | null;
  patient: { id: string; name: string; species: string };
  client: { id: string; firstName: string; lastName: string };
  provider: { id: string; firstName: string; lastName: string };
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REQUESTED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatType(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 1);
    const to = new Date(today);
    to.setDate(to.getDate() + 14);
    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    };
  });

  const params = new URLSearchParams({
    from: `${dateRange.from}T00:00:00Z`,
    to: `${dateRange.to}T23:59:59Z`,
    limit: "100",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", dateRange],
    queryFn: () => apiGet<Appointment[]>(`/appointments?${params}`),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/appointments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const appointments = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>

      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-600">From</label>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <label className="text-sm text-gray-600">To</label>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <p className="text-sm text-gray-500">No appointments in this range.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{formatDate(apt.scheduledAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{formatTime(apt.scheduledAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link to={`/patients/${apt.patient.id}`} className="text-indigo-600 hover:underline">
                      {apt.patient.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {apt.client.firstName} {apt.client.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatType(apt.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {apt.provider.firstName} {apt.provider.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[apt.status] ?? "bg-gray-100"}`}>
                      {apt.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {apt.status === "CONFIRMED" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => statusMutation.mutate({ id: apt.id, status: "COMPLETED" })}
                          className="rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: apt.id, status: "NO_SHOW" })}
                          className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          No-show
                        </button>
                        <button
                          onClick={() => statusMutation.mutate({ id: apt.id, status: "CANCELLED" })}
                          className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {apt.status === "REQUESTED" && (
                      <button
                        onClick={() => statusMutation.mutate({ id: apt.id, status: "CONFIRMED" })}
                        className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        Confirm
                      </button>
                    )}
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
