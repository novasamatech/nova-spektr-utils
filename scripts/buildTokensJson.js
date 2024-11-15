const path = require('path');
const {writeFile, readFile} = require('fs/promises');

const EXCEPTIONAL_CHAINS = require("./data/exceptionalChains.json");

const SPEKTR_CONFIG_PATH = './chains';
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;

const CONFIG_PATH = `tokens/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

// That assets will be taken as an unique asset, despite priceId
const UNIQUE_ASSET_LIST = ['EQD', 'iBTC', 'kBTC', 'RING'];

async function getDataFromFile(filePath) {
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

function transformChainsToTokens(chains) {
  const obj = {};
  const chainOptionsMap = new Map();

  chains.forEach((chain) => {
    chainOptionsMap.set(chain.chainId, chain.options);
    chain.assets.forEach((asset) => {
      if (!asset) return; // Westmint has no assets

      const normalizedSymbol = normalizeSymbol(asset.symbol);
      const uniqueAsset = containsUniqueAsset(asset.symbol);
      const baseKey = uniqueAsset || asset.priceId || normalizedSymbol;
      const key = `${baseKey}_${asset.precision}`;

      const updateObj = obj[key] || {
        name: asset.name,
        precision: asset.precision,
        priceId: asset.priceId,
        icon: asset.icon,
        symbol: asset.symbol,
        isTestToken: false,
        chains: [],
      };

      if (asset.symbol.length < updateObj.symbol.length) {
        updateObj.symbol = asset.symbol;
      }

      const chainData = {
        chainId: chain.chainId,
        name: chain.name,
        assetId: asset.assetId,
        assetSymbol: asset.symbol,
        type: asset.type,
        typeExtras: asset.typeExtras,
      };


      obj[key] = {
        ...updateObj,
        chains: [...updateObj.chains, chainData],
      };
    });
  });

  return Object.values(obj).map((token) => ({
      ...token,
      isTestToken: token.chains.every((chain) => chainOptionsMap.get(chain.chainId)?.includes('testnet')),
    })
  );
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
  const requests = CHAINS_ENV.map((chain) => {
    return getDataFromFile(`${SPEKTR_CONFIG_PATH}/${SPEKTR_CONFIG_VERSION}/${chain}`).then(transformChainsToTokens);
  });

  const [dev, prod] = await Promise.allSettled(requests);

  if (prod.status === 'rejected' || dev.status === 'rejected') {
    console.log(prod.reason || dev.reason);
    throw new Error('️🔴 Error preparing DEV or PROD file');
  }

  const toProd = dev.value.filter(chain => EXCEPTIONAL_CHAINS.prod[chain.chainId]);
  prod.value.push(...toProd);

  await saveNewFile(dev.value, CHAINS_ENV[0].replace('chains', 'tokens'));
  await saveNewFile(prod.value, CHAINS_ENV[1].replace('chains', 'tokens'));
  console.log('❇️ Successfully generated TOKENS for DEV & PROD');
  console.log('⚠️ Exceptional PROD chains - ', toProd.map(c => c.name));
}

buildFullTokensJSON().catch((error) => {
  console.error(error);
  process.exit(1);
});

