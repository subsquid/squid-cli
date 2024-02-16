import { api } from './api';
import { HttpResponse, SquidResponse } from './types';

export async function setProduction({
  orgCode,
  squidName,
  versionName,
}: {
  orgCode: string;
  squidName: string;
  versionName: string;
}): Promise<SquidResponse> {
  const { body } = await api<HttpResponse<SquidResponse>>({
    method: 'put',
    path: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/prod`,
  });

  return body.payload;
}
