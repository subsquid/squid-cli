import { api } from './api';
import { Deploy, DeployRequest, HttpResponse, OrganizationRequest } from './types';

export async function getDeploy({ organization, deploy }: DeployRequest): Promise<Deploy> {
  const { body } = await api<HttpResponse<Deploy>>({
    method: 'get',
    path: `/orgs/${organization.code}/deploys/${deploy.id}`,
  });

  return body.payload;
}

export async function getDeploys({ organization }: OrganizationRequest): Promise<Deploy[]> {
  const { body } = await api<HttpResponse<Deploy[]>>({
    method: 'get',
    path: `/orgs/${organization.code}/deploys`,
  });

  return body.payload;
}
