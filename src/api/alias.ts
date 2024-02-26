import { client } from './client';
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
  const { data } = await client.request<HttpResponse<SquidResponse>>({
    method: 'put',
    url: `/orgs/${orgCode}/squids/${squidName}/versions/${versionName}/prod`,
  });

  return data.payload;
}
