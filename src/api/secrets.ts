import { api } from './api';
import { HttpResponse, SecretsListResponse } from './types';

export async function listSecrets({ projectCode }: { projectCode?: string }): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'get',
    query: {
      projectCode,
    },
    path: `/secrets`,
  });
  return body.payload;
}

export async function removeSecret({
  name,
  projectCode,
}: {
  name: string;
  projectCode?: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/secrets`,
    data: {
      projectCode,
      secrets: [{ action: 'DELETE', name }],
    },
  });

  return body.payload;
}

export async function setSecret({
  name,
  value,
  projectCode,
}: {
  name: string;
  value: string;
  projectCode?: string;
}): Promise<SecretsListResponse> {
  const { body } = await api<HttpResponse<SecretsListResponse>>({
    method: 'put',
    path: `/secrets`,
    data: {
      projectCode,
      secrets: [{ action: 'UPDATE', name, value }],
    },
  });

  return body.payload;
}
