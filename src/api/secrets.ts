import { api } from './api';
import { HttpResponse, SecretsListResponse } from './types';

export async function listSecrets({ organization }: { organization?: string }): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'get',
    query: organization
      ? {
          organization,
        }
      : undefined,
    path: `/secrets`,
  });
  return body.payload;
}

export async function removeSecret({
  name,
  organization,
}: {
  name: string;
  organization?: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/secrets`,
    data: {
      organization,
      secrets: [{ action: 'DELETE', name }],
    },
  });

  return body.payload;
}

export async function setSecret({
  name,
  value,
  organization,
}: {
  name: string;
  value: string;
  organization?: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/secrets`,
    data: {
      organization,
      secrets: [{ action: 'UPDATE', name, value }],
    },
  });

  return body.payload;
}
