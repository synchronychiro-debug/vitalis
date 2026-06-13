export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  timezone: string;
  schedulingMode: SchedulingMode;
  defaultAppointmentDuration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SchedulingMode = "mobile" | "office" | "hybrid";

export interface CreateClinicInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string;
  schedulingMode?: SchedulingMode;
  defaultAppointmentDuration?: number;
}

export interface UpdateClinicInput extends Partial<CreateClinicInput> {
  logoUrl?: string;
  isActive?: boolean;
}
