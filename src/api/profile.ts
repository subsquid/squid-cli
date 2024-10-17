import { api, ApiError } from './api';
import { HttpResponse, Organization, OrganizationRequest, Squid } from './types';

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
  const { body } = await api<HttpResponse<Organization[]>>({
    method: 'get',
    path: `/orgs`,
  });

  return body.payload;
}

export async function getOrganization({ organization }: OrganizationRequest) {
  const { body } = await api<HttpResponse<Organization>>({
    method: 'get',
    path: `/orgs/${organization.code}`,
  });

  return body.payload;
}

export async function listUserSquids({ name }: { name?: string }) {
  const { body } = await api<HttpResponse<Squid[]>>({
    method: 'get',
    path: `/user/squids`,
    query: {
      name: name,
    },
  });

  return body.payload;
}
