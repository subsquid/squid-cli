import qs from 'qs';

import { api } from './api';
import { DeployResponse, HttpResponse } from './types';

export async function getDeploy({ orgCode, id }: { orgCode: string; id: string }): Promise<DeployResponse> {
  const { body } = await api<HttpResponse<DeployResponse>>({
    method: 'get',
    path: `/orgs/${orgCode}/deploys/${id}`,
  });

  return body.payload;
}

export async function getDeploys({
  orgCode,
  query,
}: {
  orgCode: string;
  query: { versionId: number };
}): Promise<DeployResponse[]> {
  const { body } = await api<HttpResponse<DeployResponse[]>>({
    method: 'get',
    path: `/orgs/${orgCode}/deploys/?${qs.stringify(query)}`,
  });

  return body.payload;
}
