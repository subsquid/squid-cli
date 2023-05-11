import { api, ApiError } from './api';

export async function me(auth?: { apiUrl: string; credentials: string }): Promise<{ username: string }> {
  const { body } = await api<{ username: string }>({
    method: 'get',
    auth,
    path: `/client/me`,
  });

  if (!body) {
    throw new ApiError(401, { error: 'username is missing' });
  }

  return body;
}
