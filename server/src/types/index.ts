import { Request } from 'express';

export type UserRole = 'SUPER_ADMIN' | 'RESTAURANT_OWNER' | 'RESTAURANT_STAFF';

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string | null;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
  tenantId?: string;
}
