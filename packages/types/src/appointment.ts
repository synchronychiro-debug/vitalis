export type AppointmentStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

export type AppointmentType =
  | "INITIAL_EVAL"
  | "ROUTINE_ADJUSTMENT"
  | "LASER_SESSION"
  | "REEXAM"
  | "SOFT_TISSUE"
  | "KINESIO_TAPE"
  | "TELEHEALTH"
  | "OTHER";

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
