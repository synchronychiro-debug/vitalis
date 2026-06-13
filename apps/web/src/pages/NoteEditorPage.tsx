import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "../lib/api";

interface Macro {
  id: string;
  title: string;
  soapSection: string;
  body: string;
  variables: { placeholder: string; type: string; options?: string[]; defaultValue?: string }[];
}

interface Addendum {
  id: string;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

interface Note {
  id: string;
  status: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  chiefComplaintUpdate: string | null;
  signedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  provider: { id: string; firstName: string; lastName: string };
  patient: { id: string; name: string; species: string; chiefComplaint: string | null; chiefComplaintStatus: string | null };
  appointment: { id: string; scheduledAt: string; type: string };
  addendums: Addendum[];
  saltSourceNoteId: string | null;
}

interface SaltNote {
  id: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  createdAt: string;
  provider: { firstName: string; lastName: string };
  appointment: { scheduledAt: string; type: string };
}

const SOAP_TABS = ["subjective", "objective", "assessment", "plan"] as const;
type SoapTab = (typeof SOAP_TABS)[number];

const SOAP_SECTION_MAP: Record<SoapTab, string> = {
  subjective: "SUBJECTIVE",
  objective: "OBJECTIVE",
  assessment: "ASSESSMENT",
  plan: "PLAN",
};

const CC_OPTIONS = ["RESOLVED", "IMPROVED", "UNCHANGED", "DECLINED", "WORSENED"];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SIGNED: "bg-blue-100 text-blue-700",
  LOCKED: "bg-green-100 text-green-700",
  VOIDED: "bg-red-100 text-red-700",
};

export function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const appointmentId = searchParams.get("appointmentId");
  const patientId = searchParams.get("patientId");
  const isNew = id === "new";

  const [activeTab, setActiveTab] = useState<SoapTab>("subjective");
  const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [ccUpdate, setCcUpdate] = useState("");
  const [saltSourceId, setSaltSourceId] = useState<string | null>(null);
  const [showSalt, setShowSalt] = useState(false);
  const [addendumText, setAddendumText] = useState("");

  // Existing note
  const { data: note, isLoading } = useQuery({
    queryKey: ["notes", id],
    queryFn: () => apiGet<Note>(`/notes/${id}`),
    enabled: !isNew && !!id,
  });

  // Macros for current SOAP section
  const { data: macrosData } = useQuery({
    queryKey: ["macros", SOAP_SECTION_MAP[activeTab]],
    queryFn: () => apiGet<Macro[]>(`/macros?soapSection=${SOAP_SECTION_MAP[activeTab]}`),
  });
  const macros = Array.isArray(macrosData) ? macrosData : (macrosData as { data?: Macro[] } | undefined)?.data ?? [];

  // SALT notes
  const { data: saltData } = useQuery({
    queryKey: ["salt", patientId ?? note?.patient?.id],
    queryFn: () => apiGet<SaltNote[]>(`/notes/salt/${patientId ?? note?.patient?.id}`),
    enabled: showSalt && !!(patientId ?? note?.patient?.id),
  });
  const saltNotes = Array.isArray(saltData) ? saltData : (saltData as { data?: SaltNote[] } | undefined)?.data ?? [];

  useEffect(() => {
    if (note) {
      setForm({
        subjective: note.subjective ?? "",
        objective: note.objective ?? "",
        assessment: note.assessment ?? "",
        plan: note.plan ?? "",
      });
      setCcUpdate(note.chiefComplaintUpdate ?? "");
    }
  }, [note]);

  // Create note
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPost<{ data: { id: string } }>("/notes", data),
    onSuccess: (res) => navigate(`/notes/${res.data.id}`, { replace: true }),
  });

  // Update note
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiPatch(`/notes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", id] }),
  });

  // Sign
  const signMutation = useMutation({
    mutationFn: () => apiPost(`/notes/${id}/sign`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", id] }),
  });

  // Lock
  const lockMutation = useMutation({
    mutationFn: () => apiPost(`/notes/${id}/lock`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes", id] }),
  });

  // Addendum
  const addendumMutation = useMutation({
    mutationFn: (content: string) => apiPost(`/notes/${id}/addendums`, { content }),
    onSuccess: () => {
      setAddendumText("");
      queryClient.invalidateQueries({ queryKey: ["notes", id] });
    },
  });

  function handleSave() {
    const payload: Record<string, unknown> = { ...form };
    if (ccUpdate) payload.chiefComplaintUpdate = ccUpdate;

    if (isNew) {
      payload.appointmentId = appointmentId;
      if (saltSourceId) payload.saltSourceNoteId = saltSourceId;
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  }

  function handleSaltSelect(saltNote: SaltNote) {
    setForm({
      subjective: saltNote.subjective ?? "",
      objective: saltNote.objective ?? "",
      assessment: saltNote.assessment ?? "",
      plan: saltNote.plan ?? "",
    });
    setSaltSourceId(saltNote.id);
    setShowSalt(false);
  }

  function insertMacro(macro: Macro) {
    let text = macro.body;
    for (const v of macro.variables) {
      const replacement = v.defaultValue ?? `[${v.placeholder}]`;
      text = text.replace(`{{${v.placeholder}}}`, replacement);
    }
    setForm((prev) => ({
      ...prev,
      [activeTab]: prev[activeTab] ? `${prev[activeTab]}\n${text}` : text,
    }));
  }

  const isDraft = isNew || note?.status === "DRAFT";
  const isSigned = note?.status === "SIGNED";
  const isLocked = note?.status === "LOCKED";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link to={note ? `/patients/${note.patient.id}` : "/appointments"} className="text-sm text-indigo-600 hover:underline">
          &larr; Back
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            {isNew ? "New Clinical Note" : `Note — ${note?.patient.name}`}
          </h2>
          {note && (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[note.status]}`}>
              {note.status}
            </span>
          )}
        </div>
        {note && (
          <p className="mt-1 text-sm text-gray-500">
            {new Date(note.appointment.scheduledAt).toLocaleDateString()} &middot;{" "}
            {note.appointment.type.replace(/_/g, " ")} &middot; Dr. {note.provider.firstName} {note.provider.lastName}
          </p>
        )}
      </div>

      {/* Chief Complaint */}
      {(note?.patient.chiefComplaint || isDraft) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Chief Complaint</h3>
          {note?.patient.chiefComplaint && (
            <p className="text-sm text-gray-800 mb-2">{note.patient.chiefComplaint}</p>
          )}
          {isDraft && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Status update:</label>
              <select
                value={ccUpdate}
                onChange={(e) => setCcUpdate(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="">No change</option>
                {CC_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* SOAP Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200">
          <div className="flex">
            {SOAP_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* Macro buttons */}
          {isDraft && macros.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {macros.map((m) => (
                <button
                  key={m.id}
                  onClick={() => insertMacro(m)}
                  className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {m.title}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={form[activeTab]}
            onChange={(e) => setForm((prev) => ({ ...prev, [activeTab]: e.target.value }))}
            disabled={!isDraft}
            rows={10}
            placeholder={`Enter ${activeTab} notes...`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {isDraft && (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : isNew ? "Create Note" : "Save Draft"}
            </button>
            {!isNew && (
              <button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Sign Note
              </button>
            )}
            {isNew && (
              <button
                onClick={() => setShowSalt(!showSalt)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                SALT
              </button>
            )}
          </>
        )}
        {isSigned && (
          <button
            onClick={() => lockMutation.mutate()}
            disabled={lockMutation.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Lock Note
          </button>
        )}
        {(createMutation.isError || updateMutation.isError) && (
          <span className="text-sm text-red-600">
            {((createMutation.error ?? updateMutation.error) as Error)?.message}
          </span>
        )}
        {updateMutation.isSuccess && <span className="text-sm text-green-600">Saved</span>}
      </div>

      {/* SALT Modal */}
      {showSalt && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-indigo-800">
            Same As Last Treatment — Select a prior note to copy
          </h3>
          {saltNotes.length === 0 ? (
            <p className="text-sm text-gray-500">No prior notes for this patient.</p>
          ) : (
            <div className="space-y-2">
              {saltNotes.map((sn) => (
                <button
                  key={sn.id}
                  onClick={() => handleSaltSelect(sn)}
                  className="w-full text-left rounded-md border border-gray-200 bg-white p-3 hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {new Date(sn.appointment.scheduledAt).toLocaleDateString()} — {sn.appointment.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-500">
                      Dr. {sn.provider.firstName} {sn.provider.lastName}
                    </span>
                  </div>
                  {sn.subjective && (
                    <p className="mt-1 text-xs text-gray-600 truncate">S: {sn.subjective}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Addendums */}
      {note && note.addendums.length > 0 && (
        <div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800">Addendums</h3>
          <div className="space-y-2">
            {note.addendums.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{a.author.firstName} {a.author.lastName}</span>
                  <span>{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add addendum form */}
      {note && (note.status === "SIGNED" || note.status === "LOCKED") && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Add Addendum</h3>
          <textarea
            value={addendumText}
            onChange={(e) => setAddendumText(e.target.value)}
            rows={3}
            placeholder="Enter addendum text..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => addendumText && addendumMutation.mutate(addendumText)}
            disabled={!addendumText || addendumMutation.isPending}
            className="mt-2 rounded-md bg-gray-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            {addendumMutation.isPending ? "Adding..." : "Add Addendum"}
          </button>
        </div>
      )}
    </div>
  );
}
