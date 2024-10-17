import { api } from './api';
import { Deployment, DeployRequest, HttpResponse, OrganizationRequest } from './types';

export async function getDeploy({ organization, deploy }: DeployRequest): Promise<Deployment> {
  const { body } = await api<HttpResponse<Deployment>>({
    method: 'get',
    path: `/orgs/${organization.code}/deployments/${deploy.id}`,
  });

  return body.payload;
}

export async function getDeploys({ organization }: OrganizationRequest): Promise<Deployment[]> {
  const { body } = await api<HttpResponse<Deployment[]>>({
    method: 'get',
    path: `/orgs/${organization.code}/deployments`,
  });

  return body.payload;
}
