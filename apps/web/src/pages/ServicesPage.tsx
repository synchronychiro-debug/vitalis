import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isActive: boolean;
}

export function ServicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => apiGet<Service[]>("/services?includeInactive=true"),
  });

  const services = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Services</h2>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.description ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">${(s.price / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.duration} min</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {s.isActive ? "Active" : "Inactive"}
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
