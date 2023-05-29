import inquirer from 'inquirer';

import { api, ApiError } from './api';
import { HttpResponse } from './types';

export type Profile = {
  username?: string;
  email: string;
  organizations?: {
    code: string;
    name: string;
  }[];
};

export async function profile({
  auth,
}: {
  auth?: { apiUrl: string; credentials: string };
} = {}): Promise<Profile> {
  const { body } = await api<HttpResponse<Profile>>({
    method: 'get',
    auth,
    path: `/profile`,
  });

  if (!body.payload) {
    throw new ApiError(401, { error: 'username is missing' });
  }

  return body.payload;
}

export async function listOrganizations() {
  const { organizations, ...rest } = await profile();

  return organizations || [];
}

export async function promptOrganization(organizationCode?: string) {
  if (organizationCode) return organizationCode;

  const organizations = await listOrganizations();

  if (organizations.length === 0) return;
  else if (organizations.length === 1) return organizations[0].code;

  const { organization } = await inquirer.prompt([
    {
      name: 'organization',
      type: 'list',
      message: `Please choose an organization:`,
      choices: organizations.map((o) => {
        return {
          name: o.name ? `${o.name} (${o.code})` : o.code,
          value: o.code,
        };
      }),
    },
  ]);

  return organization;
}
