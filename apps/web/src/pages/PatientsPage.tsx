import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "../lib/api";

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  status: string;
  totalVisits: number;
  client: { firstName: string; lastName: string };
}

const SPECIES_ICON: Record<string, string> = {
  CANINE: "🐕",
  FELINE: "🐈",
  EQUINE: "🐎",
  OTHER: "🐾",
};

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [species, setSpecies] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "25");
  if (search) params.set("search", search);
  if (species) params.set("species", species);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", page, search, species],
    queryFn: () => apiGet<Patient[]>(`/patients?${params}`),
  });

  const patients = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={species}
          onChange={(e) => {
            setSpecies(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All species</option>
          <option value="CANINE">Canine</option>
          <option value="FELINE">Feline</option>
          <option value="EQUINE">Equine</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : patients.length === 0 ? (
        <p className="text-sm text-gray-500">No patients found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Species / Breed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Visits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      to={`/patients/${p.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {SPECIES_ICON[p.species] ?? "🐾"} {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.species.charAt(0) + p.species.slice(1).toLowerCase()}
                    {p.breed && ` — ${p.breed}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.client.firstName} {p.client.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {p.totalVisits}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
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
  );
}
