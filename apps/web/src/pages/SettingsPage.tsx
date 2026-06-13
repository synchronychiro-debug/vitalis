import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "../lib/api";

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string | null;
  timezone: string;
  schedulingMode: string;
  defaultAppointmentDuration: number;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: clinic, isLoading } = useQuery({
    queryKey: ["clinic"],
    queryFn: () => apiGet<Clinic>("/clinics/current"),
  });

  const [form, setForm] = useState<Partial<Clinic>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (clinic) setForm(clinic);
  }, [clinic]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Clinic>) => apiPatch("/clinics/current", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { id, ...rest } = form;
    mutation.mutate(rest);
  }

  function field(
    label: string,
    key: keyof Clinic,
    type = "text",
  ) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          type={type}
          value={(form[key] as string) ?? ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  }

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Clinic Settings</h2>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-lg border border-gray-200 bg-white p-6"
      >
        {field("Clinic Name", "name")}
        {field("Address", "address")}
        <div className="grid grid-cols-3 gap-3">
          {field("City", "city")}
          {field("State", "state")}
          {field("Zip Code", "zipCode")}
        </div>
        {field("Phone", "phone")}
        {field("Email", "email", "email")}
        {field("Website", "website", "url")}
        {field("Timezone", "timezone")}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Scheduling Mode
          </label>
          <select
            value={form.schedulingMode ?? ""}
            onChange={(e) =>
              setForm({ ...form, schedulingMode: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="OFFICE">Office (direct booking)</option>
            <option value="MOBILE">Mobile (request only)</option>
            <option value="HYBRID">Hybrid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Default Appointment Duration (minutes)
          </label>
          <input
            type="number"
            min={5}
            max={240}
            value={form.defaultAppointmentDuration ?? 30}
            onChange={(e) =>
              setForm({
                ...form,
                defaultAppointmentDuration: parseInt(e.target.value, 10),
              })
            }
            className="mt-1 block w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-sm text-green-600">Saved!</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-red-600">
              {(mutation.error as Error).message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
