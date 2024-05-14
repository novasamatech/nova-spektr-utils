const path = require('path');
const { writeFile, readFile } = require('fs/promises');
const axios = require('axios');

const NOVA_CONFIG_VERSION = process.env.NOVA_CONFIG_VERSION;
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;
const CONFIG_PATH = `tokens/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

async function getDataViaHttp(url, filePath) {
  try {
    const response = await axios.get(url + filePath);
    return response.data;
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaHttp failed');
  }
}

function transformChainstoTokens(chains) {
  const obj = {};
  chains.forEach((i) => {
    i.assets.forEach((asset) => {
      const key = asset.priceId || asset.symbol;
      const updateObj = obj[key] || {
        name: asset.name,
        precision: asset.precision,
        priceId: asset.priceId,
        icon: asset.icon,
        symbol: asset.symbol,
        chains: [],
      };

      obj[key] = {
        ...updateObj,
        chains: [
          ...updateObj.chains,
          {
            chainId: i.chainId,
            name: i.name,
            assetId: asset.assetId,
            assetSymbol: asset.symbol,
            type: asset.type,
            typeExtras: asset.typeExtras,
          },
        ],
      };
    });
  });

  return Object.values(obj);
}

async function saveNewFile(newJson, file_name) {
  try {
    const filePath = path.resolve(CONFIG_PATH, file_name);
    await writeFile(filePath, JSON.stringify(newJson, null, 4));
    console.log('Successfully saved file: ' + file_name);
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullTokensJSON() {
  const requests = CHAINS_ENV.map(async (chain) => {
    try {
      const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
      const tokensData = transformChainstoTokens(novaChainsConfig);
      await saveNewFile(tokensData, chain.replace('chains', 'tokens'));
      console.log('❇️ Successfully generated for: ' + chain);
    } catch (e) {
      console.error('️🔴 Error for: ', chain, e);
      process.exit(1);
    }
  });

  await Promise.allSettled(requests);
}

buildFullTokensJSON()
  .then(() => console.log('🏁 buildFullTokensJSON finished'))
  .catch(e => {
    console.error('🔴 Error in buildFullTokensJSON: ', e);
    process.exit(1);
  });