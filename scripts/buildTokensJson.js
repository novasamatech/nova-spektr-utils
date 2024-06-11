const path = require('path');
const { writeFile, readFile } = require('fs/promises');

const SPEKTR_CONFIG_PATH = './chains';
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;

const CONFIG_PATH = `tokens/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

// That assets will be taken as an unique asset, despite priceId
const UNIQUE_ASSET_LIST = ['EQD', 'iBTC', 'kBTC', 'RING'];

async function getDataViaFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');

    return JSON.parse(data);
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaFile failed');
  }
}

function containsUniqueAsset(symbol) {
  return UNIQUE_ASSET_LIST.find(uniqueAsset => symbol.includes(uniqueAsset));
}

function normalizeSymbol(symbol) {
  return symbol.startsWith('xc') ? symbol.slice(2) : symbol;
}

function transformChainstoTokens(chains) {
  const obj = {};
  const chainOptionsMap = new Map();
  chains.forEach((i) => {
    chainOptionsMap.set(i.chainId, i.options);
    i.assets.forEach((asset) => {
      const normalizedSymbol = normalizeSymbol(asset.symbol);
      const key = asset.priceId || normalizedSymbol;
      const updateObj = obj[key] || {
        name: asset.name,
        precision: asset.precision,
        priceId: asset.priceId,
        icon: asset.icon,
        symbol: asset.symbol,
        isTestToken: false,
        chains: [],
      };

      const chainData = {
        chainId: i.chainId,
        name: i.name,
        assetId: asset.assetId,
        assetSymbol: asset.symbol,
        type: asset.type,
        typeExtras: asset.typeExtras,
      };

      const uniqueAsset = containsUniqueAsset(asset.symbol);
      if (uniqueAsset) {
        const uniqueKey = uniqueAsset;
        obj[uniqueKey] = {
          ...updateObj,
          name: asset.name,
          symbol: uniqueAsset,
          chains: [...(obj[uniqueKey]?.chains || []), chainData],
        };
      } else {
        obj[key] = {
          ...updateObj,
          chains: [...updateObj.chains, chainData],
        };
      }
    });
  });

  const tokens = Object.values(obj).map((token) => {
    token.isTestToken = token.chains.every((chain) => chainOptionsMap.get(chain.chainId)?.includes('testnet'));
    return token;
  });

  return tokens;
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