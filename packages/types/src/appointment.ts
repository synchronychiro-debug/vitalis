export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export type AppointmentType =
  | "initial_eval"
  | "routine_adjustment"
  | "laser_session"
  | "reexam"
  | "soft_tissue"
  | "kinesio_tape"
  | "telehealth"
  | "other";

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  clientId: string;
  providerId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: Date;
  duration: number;
  location?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentInput {
  patientId: string;
  clientId: string;
  providerId: string;
  type: AppointmentType;
  scheduledAt: string;
  duration?: number;
  location?: string;
  notes?: string;
}

export interface UpdateAppointmentInput {
  providerId?: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  notes?: string;
  cancellationReason?: string;
}
