import qs from 'qs';

import { client } from './client';
import { DeployResponse, HttpResponse } from './types';

export async function getDeploy({ orgCode, id }: { orgCode: string; id: string }): Promise<DeployResponse> {
  const { data } = await client.request<HttpResponse<DeployResponse>>({
    method: 'get',
    url: `/orgs/${orgCode}/deploys/${id}`,
  });

  return data.payload;
}

export async function getDeploys({
  orgCode,
  query,
}: {
  orgCode: string;
  query: { versionId: number };
}): Promise<DeployResponse[]> {
  const { data } = await client.request<HttpResponse<DeployResponse[]>>({
    method: 'get',
    url: `/orgs/${orgCode}/deploys/?${qs.stringify(query)}`,
  });

  return data.payload;
}
