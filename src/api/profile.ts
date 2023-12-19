import { api, ApiError } from './api';
import { HttpResponse } from './types';

export type Profile = {
  username?: string;
  email: string;
  organizations?: {
    code: string;
    name: string;
  }[];
};

export async function profile({
  auth,
}: {
  auth?: { apiUrl: string; credentials: string };
} = {}): Promise<Profile> {
  const { body } = await api<HttpResponse<Profile>>({
    method: 'get',
    auth,
    path: `/profile`,
  });

  if (!body.payload) {
    throw new ApiError(401, { error: 'username is missing' });
  }

  return body.payload;
}

export async function listOrganizations() {
  const { organizations, ...rest } = await profile();

  return organizations || [];
}
