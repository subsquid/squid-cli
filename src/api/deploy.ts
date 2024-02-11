import qs from 'qs';

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
    path: `/deploys/?${qs.stringify(query)}`,
  });

  return body.payload;
}
