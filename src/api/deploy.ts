import { api } from './api';
import { DeployResponse, HttpResponse } from './types';

export async function getDeploy(id: string): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'get',
    path: `/deploys/${id}`,
  });

  return body.payload;
}
