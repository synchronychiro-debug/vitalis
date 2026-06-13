import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";

interface Patient {
  id: string;
  name: string;
  species: string;
  client: { id: string; firstName: string; lastName: string };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

const APPOINTMENT_TYPES = [
  { value: "ROUTINE_ADJUSTMENT", label: "Routine Adjustment" },
  { value: "INITIAL_EVAL", label: "Initial Evaluation" },
  { value: "LASER_SESSION", label: "Laser Session" },
  { value: "REEXAM", label: "Re-exam" },
  { value: "SOFT_TISSUE", label: "Soft Tissue" },
  { value: "KINESIO_TAPE", label: "Kinesio Tape" },
  { value: "TELEHEALTH", label: "Telehealth" },
  { value: "OTHER", label: "Other" },
];

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") ?? "";

  const [patientId, setPatientId] = useState(preselectedPatientId);
  const [providerId, setProviderId] = useState("");
  const [type, setType] = useState("ROUTINE_ADJUSTMENT");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { data: patientsData } = useQuery({
    queryKey: ["patients-list"],
    queryFn: () => apiGet<Patient[]>("/patients?limit=100"),
  });

  const { data: providersData } = useQuery({
    queryKey: ["users", "providers"],
    queryFn: () => apiGet<User[]>("/users?role=PROVIDER"),
  });

  const patients = Array.isArray(patientsData)
    ? patientsData
    : (patientsData as { data?: Patient[] } | undefined)?.data ?? [];
  const providers = Array.isArray(providersData)
    ? providersData
    : (providersData as { data?: User[] } | undefined)?.data ?? [];

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiPost("/appointments", data),
    onSuccess: () => navigate("/appointments"),
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setError("Select a patient"); return; }
    if (!providerId) { setError("Select a provider"); return; }
    setError("");

    mutation.mutate({
      patientId,
      providerId,
      type,
      scheduledAt: `${date}T${time}:00`,
      duration,
      ...(location ? { location } : {}),
      ...(notes ? { notes } : {}),
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">New Appointment</h2>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        {/* Patient */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient</label>
          {preselectedPatientId ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {patients.find((p) => p.id === preselectedPatientId)
                  ? `${patients.find((p) => p.id === preselectedPatientId)!.name} (${patients.find((p) => p.id === preselectedPatientId)!.species.toLowerCase()})`
                  : "Loading..."}
              </span>
              <button
                type="button"
                onClick={() => { setPatientId(""); navigate("/appointments/new", { replace: true }); }}
                className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
              >
                Change
              </button>
            </div>
          ) : (
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a patient...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.species.toLowerCase()}) — {p.client.firstName} {p.client.lastName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Provider</label>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Select a provider...</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
          <input
            type="number"
            min={5}
            max={240}
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 30)}
            className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Location (optional)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Room 2, Barn, Field"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Scheduling..." : "Schedule Appointment"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>
    </div>
  );
}
