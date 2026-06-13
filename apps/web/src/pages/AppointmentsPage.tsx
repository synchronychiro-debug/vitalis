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

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

type ViewMode = "day" | "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REQUESTED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateRange(anchor: Date, view: ViewMode): { from: string; to: string } {
  const from = new Date(anchor);
  const to = new Date(anchor);

  if (view === "day") {
    // single day
  } else if (view === "week") {
    const dow = from.getDay();
    from.setDate(from.getDate() - dow);
    to.setDate(from.getDate() + 6);
  } else {
    from.setDate(1);
    to.setMonth(to.getMonth() + 1, 0);
  }

  return { from: toLocalDate(from), to: toLocalDate(to) };
}

function navigateAnchor(anchor: Date, view: ViewMode, direction: -1 | 1): Date {
  const d = new Date(anchor);
  if (view === "day") d.setDate(d.getDate() + direction);
  else if (view === "week") d.setDate(d.getDate() + 7 * direction);
  else d.setMonth(d.getMonth() + direction);
  return d;
}

function formatRangeLabel(anchor: Date, view: ViewMode): string {
  if (view === "day") {
    return anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  const { from, to } = getDateRange(anchor, view);
  const f = new Date(from + "T00:00:00");
  const t = new Date(to + "T00:00:00");
  if (view === "week") {
    return `${f.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${t.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatType(type: string) {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [providerId, setProviderId] = useState<string>("");

  const dateRange = getDateRange(anchor, view);

  const { data: providers } = useQuery({
    queryKey: ["users", "providers"],
    queryFn: () => apiGet<User[]>("/users?role=PROVIDER"),
  });

  const params = new URLSearchParams({
    from: `${dateRange.from}T00:00:00Z`,
    to: `${dateRange.to}T23:59:59Z`,
    limit: "200",
  });
  if (providerId) params.set("providerId", providerId);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", dateRange, providerId],
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
  const providerList = Array.isArray(providers) ? providers : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>

      <div className="flex flex-wrap items-center gap-4">
        {/* View mode toggle */}
        <div className="inline-flex rounded-md border border-gray-300 bg-white">
          {(["day", "week", "month"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setView(m)}
              className={`px-3 py-1.5 text-sm font-medium first:rounded-l-md last:rounded-r-md ${
                view === m
                  ? "bg-indigo-600 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor((a) => navigateAnchor(a, view, -1))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            &larr;
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => setAnchor((a) => navigateAnchor(a, view, 1))}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            &rarr;
          </button>
          <span className="ml-1 text-sm font-medium text-gray-800">
            {formatRangeLabel(anchor, view)}
          </span>
        </div>

        {/* Provider filter */}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Provider</label>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All Providers</option>
            {providerList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>
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
                {view !== "day" && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                {!providerId && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Provider</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  {view !== "day" && (
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{formatDate(apt.scheduledAt)}</td>
                  )}
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
                  {!providerId && (
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {apt.provider.firstName} {apt.provider.lastName}
                    </td>
                  )}
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
