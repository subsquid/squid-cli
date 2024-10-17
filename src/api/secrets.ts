import { api } from './api';
import { HttpResponse, OrganizationRequest, SecretsListResponse } from './types';

export async function listSecrets({ organization }: OrganizationRequest): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'get',
    path: `/orgs/${organization.code}/secrets`,
  });
  return body.payload;
}

export async function removeSecret({
  organization,
  name,
}: OrganizationRequest & { name: string }): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/orgs/${organization.code}/secrets`,
    data: {
      secrets: [{ action: 'DELETE', name }],
    },
  });

  return body.payload;
}

export async function setSecret({
  organization,
  name,
  value,
}: OrganizationRequest & {
  name: string;
  value: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/orgs/${organization.code}/secrets`,
    data: {
      secrets: [{ action: 'UPDATE', name, value }],
    },
  });

  return body.payload;
}
