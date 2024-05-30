const fs = require('fs');
const path = require('path');
const axios = require('axios');

const allowedChainsPath = path.resolve(__dirname, 'data/allowedChains.json');
const NOVA_CONFIG_URL = 'https://raw.githubusercontent.com/novasamatech/nova-utils/master/chains/v20/chains_dev.json';

async function fetchChainsDev() {
  try {
    const response = await axios.get(NOVA_CONFIG_URL);
    return response.data;
  } catch (error) {
    console.error('Error fetching chains_dev.json:', error);
    process.exit(1);
  }
}

async function createAllowedChains() {
  const chainsDev = await fetchChainsDev();

  const allowedChains = chainsDev.reduce((acc, chain) => {
    const chainId = chain.chainId.startsWith('0x') ? chain.chainId.slice(2) : chain.chainId;
    acc.push({ chainId, name: chain.name });
    return acc;
  }, []);

  allowedChains.sort((a, b) => a.name.localeCompare(b.name));

  const sortedAllowedChains = allowedChains.reduce((acc, chain) => {
    acc[chain.chainId] = chain.name;
    return acc;
  }, {});

  fs.writeFileSync(allowedChainsPath, JSON.stringify(sortedAllowedChains, null, 2));

  console.log('allowedChains.json has been created and sorted.');
}

createAllowedChains();