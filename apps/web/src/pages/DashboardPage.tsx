import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  type: string;
  status: string;
  patient: { id: string; name: string; species: string };
  client: { id: string; firstName: string; lastName: string };
  provider: { id: string; firstName: string; lastName: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number };
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

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  REQUESTED: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

export function DashboardPage() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () =>
      apiGet<Appointment[]>(
        `/appointments?from=${today}T00:00:00Z&to=${tomorrow}T00:00:00Z&limit=50`,
      ),
  });

  const appointments = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">
          Welcome back, {user?.firstName}. Here's your day.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Today's Appointments"
          value={appointments.length}
        />
        <StatCard
          label="Completed"
          value={appointments.filter((a) => a.status === "COMPLETED").length}
        />
        <StatCard
          label="Upcoming"
          value={
            appointments.filter(
              (a) =>
                a.status === "CONFIRMED" &&
                new Date(a.scheduledAt) > new Date(),
            ).length
          }
        />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">
          Today's Schedule
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-gray-500">
            No appointments scheduled for today.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Provider
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {formatTime(apt.scheduledAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        to={`/patients/${apt.patient.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {apt.patient.name}
                      </Link>
                      <span className="ml-1 text-xs text-gray-400">
                        ({apt.patient.species.toLowerCase()})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <Link
                        to={`/clients/${apt.client.id}`}
                        className="hover:underline"
                      >
                        {apt.client.firstName} {apt.client.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatType(apt.type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {apt.provider.firstName} {apt.provider.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[apt.status] ?? "bg-gray-100"
                        }`}
                      >
                        {apt.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
