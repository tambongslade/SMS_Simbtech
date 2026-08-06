import apiService, { ApiError } from './apiService';

// ---------------------------------------------------------------------------
// Personnel search — GET /users/personnel/search
//
// Server-side search across staff, replacing the old habit of pulling a large
// page of /users and filtering in the browser. Parents are excluded unless
// `includeParents` is set.
//
// Allowed roles: SUPER_MANAGER, MANAGER, PRINCIPAL, VICE_PRINCIPAL, BURSAR,
// SECRETARY, DEAN_OF_STUDIES, DEAN_OF_DISCIPLINE, HOD.
// ---------------------------------------------------------------------------

export type PersonnelGender = 'Male' | 'Female';
export type PersonnelStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type PersonnelSortBy =
  | 'id'
  | 'name'
  | 'email'
  | 'matricule'
  | 'phone'
  | 'gender'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
  | 'dateOfBirth'
  | 'lastSeenAt';

export interface PersonnelUserRole {
  id: number;
  role: string;
  academicYearId: number | null;
}

export interface PersonnelUser {
  id: number;
  name: string;
  email?: string;
  matricule?: string;
  phone?: string;
  gender?: string;
  status?: PersonnelStatus | string;
  dateOfBirth?: string;
  address?: string;
  createdAt?: string;
  userRoles?: PersonnelUserRole[];
  subjects?: { id: number; name?: string }[];
}

export interface SearchPersonnelParams {
  // Full-text across name / email / matricule / phone.
  q?: string;
  // Narrower contains-filters, if you want to target one field.
  name?: string;
  email?: string;
  matricule?: string;
  phone?: string;
  // One role, or several — sent as a CSV `role` param.
  role?: string | string[];
  gender?: PersonnelGender;
  status?: PersonnelStatus;
  // Scopes the role match; the API defaults to the current year.
  academicYearId?: number;
  // Off by default server-side — parents are not personnel.
  includeParents?: boolean;
  page?: number;
  limit?: number; // max 100
  sortBy?: PersonnelSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface PersonnelSearchResult {
  data: PersonnelUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const MAX_PERSONNEL_LIMIT = 100;

/** Builds the query string, omitting anything the caller left blank. */
export const buildPersonnelSearchQuery = (params: SearchPersonnelParams = {}): string => {
  const qs = new URLSearchParams();
  const text = (key: string, value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) qs.append(key, trimmed);
  };

  text('q', params.q);
  text('name', params.name);
  text('email', params.email);
  text('matricule', params.matricule);
  text('phone', params.phone);

  const role = Array.isArray(params.role) ? params.role.filter(Boolean).join(',') : params.role;
  text('role', role);

  if (params.gender) qs.append('gender', params.gender);
  if (params.status) qs.append('status', params.status);
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  if (params.includeParents) qs.append('includeParents', 'true');
  if (params.sortBy) qs.append('sortBy', params.sortBy);
  if (params.sortOrder) qs.append('sortOrder', params.sortOrder);

  qs.append('page', String(params.page ?? 1));
  // The API caps limit at 100 and silently clamps; clamp here so the page size
  // we ask for is the page size we paginate against.
  qs.append('limit', String(Math.min(params.limit ?? 20, MAX_PERSONNEL_LIMIT)));

  return qs.toString();
};

export const personnelSearchPath = (params: SearchPersonnelParams = {}): string =>
  `/users/personnel/search?${buildPersonnelSearchQuery(params)}`;

/**
 * The endpoint this replaced. Kept as a fallback so the app keeps working
 * against an API that hasn't deployed /users/personnel/search yet — drop this,
 * and `legacyUsersPath`, once every environment has the new route.
 */
export const legacyUsersPath = (params: SearchPersonnelParams = {}): string => {
  const qs = new URLSearchParams();
  qs.append('page', String(params.page ?? 1));
  qs.append('limit', String(Math.min(params.limit ?? 20, MAX_PERSONNEL_LIMIT)));
  const role = Array.isArray(params.role) ? params.role[0] : params.role;
  if (role) qs.append('role', role);
  const search = params.q?.trim() || params.name?.trim();
  if (search) qs.append('search', search);
  if (params.academicYearId) qs.append('academicYearId', String(params.academicYearId));
  return `/users?${qs.toString()}`;
};

// Remembered for the session so we only pay for the failed probe once.
let personnelSearchAvailable: boolean | null = null;

const normalize = (
  res: { data?: PersonnelUser[]; meta?: Partial<PersonnelSearchResult['meta']> },
  params: SearchPersonnelParams,
): PersonnelSearchResult => {
  const limit = Math.min(params.limit ?? 20, MAX_PERSONNEL_LIMIT);
  const total = res.meta?.total ?? 0;
  return {
    data: res.data || [],
    meta: {
      total,
      page: res.meta?.page ?? params.page ?? 1,
      limit: res.meta?.limit ?? limit,
      totalPages: res.meta?.totalPages ?? Math.ceil(total / limit),
    },
  };
};

export const searchPersonnel = async (
  params: SearchPersonnelParams = {},
): Promise<PersonnelSearchResult> => {
  if (personnelSearchAvailable !== false) {
    try {
      const res = await apiService.get<PersonnelSearchResult>(
        personnelSearchPath(params),
        // Silent: a 404 here is expected on older APIs and we recover below.
        personnelSearchAvailable === null ? { silent: true } : undefined,
      );
      personnelSearchAvailable = true;
      return normalize(res, params);
    } catch (error) {
      const missing = error instanceof ApiError && error.status === 404;
      if (!missing) throw error;
      personnelSearchAvailable = false;
      console.warn(
        '[personnelApi] /users/personnel/search is not available on this API — falling back to /users.',
      );
    }
  }

  const res = await apiService.get<PersonnelSearchResult>(legacyUsersPath(params));
  return normalize(res, params);
};

/** The roles on a user, flattened to plain strings. */
export const rolesOf = (user: PersonnelUser): string[] =>
  (user.userRoles || []).map((r) => r.role).filter(Boolean);
