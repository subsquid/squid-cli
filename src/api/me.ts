import { api } from './api';

export async function me(): Promise<{ username: string }> {
  const { body } = await api<{ username: string }>({
    method: 'get',
    path: `/client/me`,
  });

  return body;
}
