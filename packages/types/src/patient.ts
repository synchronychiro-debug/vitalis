export type Species = "CANINE" | "EQUINE" | "FELINE" | "OTHER";
export type PatientStatus = "ACTIVE" | "DECEASED" | "TRANSFERRED" | "INACTIVE";
export type Sex =
  | "MALE_INTACT"
  | "MALE_NEUTERED"
  | "FEMALE_INTACT"
  | "FEMALE_SPAYED";

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
  | "RESOLVED"
  | "IMPROVED"
  | "UNCHANGED"
  | "DECLINED"
  | "WORSENED";

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
