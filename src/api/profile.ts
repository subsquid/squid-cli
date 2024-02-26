import { client } from './client';
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
  apiUrl,
  credentials,
}: {
  apiUrl?: string;
  credentials?: string;
} = {}): Promise<Profile> {
  const { data } = await client.request<HttpResponse<Profile>>({
    method: 'get',
    baseURL: apiUrl ? apiUrl : client.defaults.baseURL,
    url: `/profile`,
    headers: {
      authorization: credentials ? `token ${credentials}` : client.defaults.headers.authorization,
    },
  });

  return data.payload;
}

export async function listOrganizations() {
  const { organizations, ...rest } = await profile();

  return organizations || [];
}
