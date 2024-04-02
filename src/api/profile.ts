import { api, ApiError } from './api';
import { HttpResponse, SquidResponse } from './types';

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
    path: `/user`,
  });

  if (!body.payload) {
    throw new ApiError(
      {
        status: 401,
        method: 'get',
        url: '/user',
      },
      { error: 'Credentials are missing or invalid' },
    );
  }

  return body.payload;
}

export async function listOrganizations() {
  const { organizations, ...rest } = await profile();

  return organizations || [];
}

export async function listSquids({ squidName }: { squidName?: string }) {
  const { body } = await api<HttpResponse<SquidResponse[]>>({
    method: 'get',
    path: `/user/squids`,
    query: {
      name: squidName,
    },
  });

  return body.payload;
}
