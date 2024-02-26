import { client } from './client';
import { HttpResponse, SecretsListResponse } from './types';

export async function listSecrets({ orgCode }: { orgCode: string }): Promise<SecretsListResponse> {
  const { data } = await client.request<HttpResponse<SecretsListResponse>>({
    method: 'get',
    url: `/orgs/${orgCode}/secrets`,
  });
  return data.payload;
}

export async function removeSecret({ name, orgCode }: { name: string; orgCode: string }): Promise<SecretsListResponse> {
  const { data } = await client.request<HttpResponse<SecretsListResponse>>({
    method: 'put',
    url: `/orgs/${orgCode}/secrets`,
    headers: {
      'content-type': 'application/json',
    },
    data: {
      secrets: [{ action: 'DELETE', name }],
    },
  });

  return data.payload;
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
  const { data } = await client.request<HttpResponse<SecretsListResponse>>({
    method: 'put',
    url: `/orgs/${orgCode}/secrets`,
    headers: {
      'content-type': 'application/json',
    },
    data: {
      secrets: [{ action: 'UPDATE', name, value }],
    },
  });

  return data.payload;
}
