const path = require('path');
const { writeFile, readFile } = require('fs/promises');

const SPEKTR_CONFIG_PATH = './chains';
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;

const CONFIG_PATH = `tokens/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

async function getDataViaFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaFile failed');
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
      const localChainsConfig = await getDataViaFile(`${SPEKTR_CONFIG_PATH}/${SPEKTR_CONFIG_VERSION}/${chain}`);
      const tokensData = transformChainstoTokens(localChainsConfig);
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