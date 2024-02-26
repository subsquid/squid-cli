import fs from 'fs';

import axios from 'axios';
import FormData from 'form-data';

import { ApiError } from './client';
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

  const res = await axios.request({
    url: uploadUrl,
    method: 'POST',
    headers: {
      ...body.getHeaders(),
    },
    data: body,
  });

  if (res.status !== 204) {
    throw new ApiError(400, res.data);
  }

  return { error: null, fileUrl };
}
