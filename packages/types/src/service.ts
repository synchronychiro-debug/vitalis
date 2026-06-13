export interface Service {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  price: number;
  duration: number;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

export interface Package {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  price: number;
  expirationDays?: number;
  isActive: boolean;
  items: PackageItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageItem {
  id: string;
  packageId: string;
  serviceId: string;
  quantity: number;
}

export interface CreatePackageInput {
  name: string;
  description?: string;
  price: number;
  expirationDays?: number;
  items: { serviceId: string; quantity: number }[];
}
