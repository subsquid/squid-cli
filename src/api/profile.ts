import { api, ApiError } from './api';
import { HttpResponse } from './types';

export type Profile = {
  username?: string;
  email: string;
  projects?: {
    code: string;
    name: string;
  }[];
};

export async function profile({
  withProjects,
  auth,
}: {
  auth?: { apiUrl: string; credentials: string };
  withProjects?: boolean;
} = {}): Promise<Profile> {
  const { body } = await api<HttpResponse<Profile>>({
    method: 'get',
    auth,
    path: `/profile`,
    query: withProjects
      ? {
          withProjects,
        }
      : undefined,
  });

  if (!body.payload) {
    throw new ApiError(401, { error: 'username is missing' });
  }

  return body.payload;
}

export async function listProjects() {
  const { projects, ...rest } = await profile({ withProjects: true });

  return projects || [];
}
