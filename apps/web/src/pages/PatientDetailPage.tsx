import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  dateOfBirth: string | null;
  sex: string | null;
  color: string | null;
  currentWeight: string | null;
  microchipId: string | null;
  status: string;
  chiefComplaint: string | null;
  chiefComplaintStatus: string | null;
  totalVisits: number;
  estimatedTotalVisits: number | null;
  treatmentGoals: string | null;
  allergies: string | null;
  medications: string | null;
  priorConditions: string | null;
  primaryVetName: string | null;
  primaryVetClinic: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  weightHistory: { weight: string; recordedAt: string }[];
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patients", id],
    queryFn: () => apiGet<Patient>(`/patients/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!patient) return <p className="text-red-600">Patient not found</p>;

  const progress =
    patient.estimatedTotalVisits && patient.estimatedTotalVisits > 0
      ? Math.min(
          100,
          Math.round(
            (patient.totalVisits / patient.estimatedTotalVisits) * 100,
          ),
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/patients"
            className="text-sm text-indigo-600 hover:underline"
          >
            &larr; Patients
          </Link>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            {patient.name}
          </h2>
          <p className="text-sm text-gray-500">
            {patient.species.toLowerCase()} — owned by{" "}
            <Link
              to={`/clients/${patient.client.id}`}
              className="text-indigo-600 hover:underline"
            >
              {patient.client.firstName} {patient.client.lastName}
            </Link>
          </p>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
            patient.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : patient.status === "DECEASED"
                ? "bg-gray-200 text-gray-600"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {patient.status}
        </span>
      </div>

      {/* Visit progress bar */}
      {progress !== null && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Visit Progress</span>
            <span className="text-gray-500">
              {patient.totalVisits} of {patient.estimatedTotalVisits} visits
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Chief complaint */}
      {patient.chiefComplaint && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Chief Complaint
          </h3>
          <p className="mt-1 text-sm text-gray-900">
            {patient.chiefComplaint}
          </p>
          {patient.chiefComplaintStatus && (
            <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {patient.chiefComplaintStatus.replace("_", " ")}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Demographics
          </h3>
          <dl className="space-y-2">
            <Detail label="Breed" value={patient.breed} />
            <Detail
              label="Date of Birth"
              value={
                patient.dateOfBirth
                  ? new Date(patient.dateOfBirth).toLocaleDateString()
                  : null
              }
            />
            <Detail label="Sex" value={patient.sex?.replace("_", " ")} />
            <Detail label="Color" value={patient.color} />
            <Detail
              label="Weight"
              value={
                patient.currentWeight
                  ? `${patient.currentWeight} lbs`
                  : null
              }
            />
            <Detail label="Microchip" value={patient.microchipId} />
          </dl>
        </div>

        {/* Medical */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Medical Info
          </h3>
          <dl className="space-y-2">
            <Detail label="Treatment Goals" value={patient.treatmentGoals} />
            <Detail label="Allergies" value={patient.allergies} />
            <Detail label="Medications" value={patient.medications} />
            <Detail label="Prior Conditions" value={patient.priorConditions} />
            <Detail label="Primary Vet" value={patient.primaryVetName} />
            <Detail label="Vet Clinic" value={patient.primaryVetClinic} />
          </dl>
        </div>
      </div>

      {/* Owner info */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Owner</h3>
        <p className="text-sm text-gray-900">
          {patient.client.firstName} {patient.client.lastName}
        </p>
        <p className="text-sm text-gray-500">{patient.client.email}</p>
        <p className="text-sm text-gray-500">{patient.client.phone}</p>
      </div>
    </div>
  );
}
