import { api } from './api';

export type Provider = {
  provider: string;
  dataSourceUrl: string;
  release: string;
};

export type Gateway = {
  network: string;
  providers: Provider[];
};

export type GatewaysResponse = {
  archives: Gateway[];
};

export async function getSubstrateGateways() {
  const { body } = await api<GatewaysResponse>({
    method: 'get',
    path: 'https://cdn.subsquid.io/archives/substrate.json',
  });

  return body.archives;
}

export async function getEvmGateways() {
  const { body } = await api<GatewaysResponse>({
    method: 'get',
    path: 'https://cdn.subsquid.io/archives/evm.json',
  });

  return body.archives;
}
