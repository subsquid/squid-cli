import fs from 'fs';

import FormData from 'form-data';
import fetch from 'node-fetch';

import { ApiError } from './api';
import { getUploadUrl } from './squids';

export async function uploadFile(orgCode: string, path: string): Promise<{ error: string | null; fileUrl?: string }> {
  const { uploadFields, uploadUrl, maxUploadBytes, fileUrl } = await getUploadUrl({ orgCode });

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

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...body.getHeaders(),
    },
    body,
  });

  if (res.status !== 204) {
    throw new ApiError(400, {
      error: await res.text(),
    });
  }

  return { error: null, fileUrl };
}
