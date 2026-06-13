import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  status: string;
  totalVisits: number;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  creditBalance: number;
  notes: string | null;
  patients: Patient[];
  _count: { invoices: number };
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: client, isLoading } = useQuery({
    queryKey: ["clients", id],
    queryFn: () => apiGet<Client>(`/clients/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!client) return <p className="text-red-600">Client not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/clients" className="text-sm text-indigo-600 hover:underline">
          &larr; Clients
        </Link>
        <h2 className="mt-1 text-2xl font-bold text-gray-900">
          {client.firstName} {client.lastName}
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pets" value={String(client.patients.length)} />
        <StatCard label="Invoices" value={String(client._count.invoices)} />
        <StatCard
          label="Credit Balance"
          value={`$${(client.creditBalance / 100).toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Contact Info
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs uppercase text-gray-500">Email</dt>
              <dd>{client.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-gray-500">Phone</dt>
              <dd>{client.phone}</dd>
            </div>
            {client.address && (
              <div>
                <dt className="text-xs uppercase text-gray-500">Address</dt>
                <dd>
                  {client.address}
                  {client.city && `, ${client.city}`}
                  {client.state && `, ${client.state}`}
                  {client.zipCode && ` ${client.zipCode}`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {client.notes && (
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Notes</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">Pets</h3>
        {client.patients.length === 0 ? (
          <p className="text-sm text-gray-500">No pets registered.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Species</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Breed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Visits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {client.patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link to={`/patients/${p.id}`} className="font-medium text-indigo-600 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {p.species.charAt(0) + p.species.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.breed ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.totalVisits}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
