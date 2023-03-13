import queryString from 'query-string';

import { api } from './api';
import { DeployResponse, HttpResponse } from './types';

export async function getDeploy(id: string): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'get',
    path: `/deploys/${id}`,
  });

  return body.payload;
}

export async function getDeploys(query: { versionId: number }): Promise<DeployResponse[]> {
  const { body } = await api<HttpResponse<DeployResponse[]>>({
    method: 'get',
    path: `/deploys/?${queryString.stringify(query)}`,
  });

  return body.payload;
}
