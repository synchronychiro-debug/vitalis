export type Species = "canine" | "equine" | "feline" | "other";
export type PatientStatus = "active" | "deceased" | "transferred" | "inactive";
export type Sex = "male_intact" | "male_neutered" | "female_intact" | "female_spayed";

export interface Patient {
  id: string;
  clinicId: string;
  clientId: string;
  name: string;
  species: Species;
  breed?: string;
  dateOfBirth?: Date;
  sex?: Sex;
  color?: string;
  currentWeight?: number;
  microchipId?: string;
  status: PatientStatus;
  deceasedDate?: Date;
  primaryVetName?: string;
  primaryVetClinic?: string;
  primaryVetPhone?: string;
  primaryVetEmail?: string;
  shareNotesWithVet: boolean;
  treatmentGoals?: string;
  totalVisits: number;
  estimatedTotalVisits?: number;
  chiefComplaint?: string;
  chiefComplaintStatus?: ChiefComplaintStatus;
  allergies?: string;
  medications?: string;
  priorConditions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChiefComplaintStatus =
  | "resolved"
  | "improved"
  | "unchanged"
  | "declined"
  | "worsened";

export interface CreatePatientInput {
  clientId: string;
  name: string;
  species: Species;
  breed?: string;
  dateOfBirth?: string;
  sex?: Sex;
  color?: string;
  currentWeight?: number;
  microchipId?: string;
  primaryVetName?: string;
  primaryVetClinic?: string;
  primaryVetPhone?: string;
  primaryVetEmail?: string;
  shareNotesWithVet?: boolean;
  treatmentGoals?: string;
  estimatedTotalVisits?: number;
  chiefComplaint?: string;
  allergies?: string;
  medications?: string;
  priorConditions?: string;
}

export interface UpdatePatientInput extends Partial<Omit<CreatePatientInput, "clientId">> {
  status?: PatientStatus;
  deceasedDate?: string;
  chiefComplaintStatus?: ChiefComplaintStatus;
}
