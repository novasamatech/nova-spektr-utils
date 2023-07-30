import {Chain} from '../models/Chain'

export function calculateChainDataForTable(chain: Chain) {
  const networkName = chain.name
  const assetsCount = chain.assets.length
  let explorers

  if (chain.explorers) {
    explorers = chain.explorers.map(explorer => explorer.name).join('\n');
  } else {
    explorers = `Have not been added yet`;
  }

  return {
    networkName,
    assetsCount,
    explorers
  };
}
