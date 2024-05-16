import { Chain } from '../models/Chain';

export function calculateChainDataForTable(chain: Chain) {
  return {
    networkName: chain.name,
    assetsCount: chain.assets.length,
    explorers: chain.explorers?.map(explorer => explorer.name).join(' ') || 'Have not been added yet'
  };
}

export function calculateProxyDataForTable(chain: Chain) {
  return {
    networkName: chain.name,
    regular: chain.options?.includes('regular_proxy') || false,
    pure: chain.options?.includes('pure_proxy') || false
  };
}
