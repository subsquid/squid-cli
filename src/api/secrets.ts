import { api } from './api';
import { HttpResponse, SecretsListResponse } from './types';

export async function listSecrets({ orgCode }: { orgCode: string }): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'get',
    path: `/orgs/${orgCode}/secrets`,
  });
  return body.payload;
}

export async function removeSecret({ name, orgCode }: { name: string; orgCode: string }): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/orgs/${orgCode}/secrets`,
    data: {
      secrets: [{ action: 'DELETE', name }],
    },
  });

  return body.payload;
}

export async function setSecret({
  name,
  value,
  orgCode,
}: {
  name: string;
  value: string;
  orgCode: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/orgs/${orgCode}/secrets`,
    data: {
      secrets: [{ action: 'UPDATE', name, value }],
    },
  });

  return body.payload;
}
