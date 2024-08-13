import fs from 'fs';

import FormData from 'form-data';

import { api } from './api';
import { getUploadUrl } from './squids';
import { OrganizationRequest } from './types';

export async function uploadFile({ organization, path }: OrganizationRequest & { path: string }): Promise<{
  error: string | null;
  fileUrl?: string;
}> {
  const { uploadFields, uploadUrl, maxUploadBytes, fileUrl } = await getUploadUrl({ organization });

  const fileStream = fs.createReadStream(path);
  const { size } = fs.statSync(path);

  if (size > maxUploadBytes) {
    return {
      error: `The squid archive size is too large (${size} bytes), exceeding the limit of ${Math.round(
        maxUploadBytes / 1_000_000,
      ).toFixed(1)}M.`,
    };
  }

  const body = new FormData();
  Object.entries(uploadFields).forEach(([k, v]) => {
    body.append(k, v);
  });

  body.append('file', fileStream, { knownLength: size });

  await api({
    path: uploadUrl,
    method: 'post',
    headers: {
      ...body.getHeaders(),
    },
    data: body,
  });

  return { error: null, fileUrl };
}
