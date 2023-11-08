const path = require('path');
const { writeFile } = require('fs/promises');
const fs = require('fs');
const axios = require('axios');

const TOKEN_NAMES = require('./data/assetsNameMap.json');
const TICKER_NAMES = require('./data/assetTickerMap.json');

const NOVA_CONFIG_VERSION = process.env.NOVA_CONFIG_VERSION;
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;
const CONFIG_PATH = `chains/${SPEKTR_CONFIG_VERSION}/`;
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;
const ASSET_ICONS_DIR = `icons/v1/assets/white`

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];
const EXCLUDED_CHAINS = {
  '89d3ec46d2fb43ef5a9713833373d5ea666b092fa8fd68fbc34596036571b907': 'Equilibrium', // Custom logic
}

const TYPE_EXTRAS_REPLACEMENTS = [
    'acala_primitives.currency.CurrencyId',   'AcalaPrimitivesCurrencyCurrencyId',
    'node_primitives.currency.CurrencyId',    'NodePrimitivesCurrencyCurrencyId',
    'bit_country_primitives.FungibleTokenId', 'BitCountryPrimitivesFungibleTokenId',
    'interbtc_primitives.CurrencyId',         'InterbtcPrimitivesCurrencyId',
    'gm_chain_runtime.Coooooins',             'GmChainRuntimeCoooooins',
    'pendulum_runtime.currency.CurrencyId',   'PendulumRuntimeCurrencyCurrencyId',
    'spacewalk_primitives.CurrencyId',        'SpacewalkPrimitivesCurrencyId'
]
const STAKING_ALLOWED_ARRAY = ['Polkadot', 'Kusama', 'Westend', 'Polkadex', 'Ternoa', 'Novasama Testnet - Kusama']

const DEFAULT_ASSETS = ['SHIBATALES', 'DEV', 'SIRI', 'PILT', 'cDOT-6/13', 'cDOT-7/14', 'cDOT-8/15', 'cDOT-9/16', 'cDOT-10/17', 'TZERO', 'UNIT', 'Unit', 'tEDG'];

async function getDataViaHttp(url, filePath) {
  try {
    const response = await axios.get(url + filePath);

    return response.data;
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaHttp failed');
  }
}

function getStakingValue(staking, chainName) {
  if (STAKING_ALLOWED_ARRAY.includes(chainName)) {
    return Array.isArray(staking) ? staking[0] : typeof staking === 'string' ? staking : undefined;
  }
  return undefined;
}

function fillAssetData(chain) {
  const assetsList = [];
  chain.assets.map(asset => {
    // Temp remove, waiting for "AssetManagement pallet support. It's used by Zeitgeist." https://app.clickup.com/t/85ztgpy7n
    if (chain.name === 'Zeitgeist' && asset.symbol === 'DOT') {
      return;
    }
    assetsList.push({
      assetId: asset.assetId,
      symbol: asset.symbol,
      precision: asset.precision,
      type: asset.type,
      priceId: asset.priceId,
      staking: getStakingValue(asset.staking, chain.name),
      icon: replaceUrl(asset.icon, 'asset', asset.symbol),
      typeExtras: replaceTypeExtras(asset.typeExtras),
      name: TOKEN_NAMES[asset.symbol] || 'Should be included in scripts/data/assetsNameMap',
    });
  });
  return assetsList;
}


function getTransformedData(rawData) {
  const filteredData = rawData.filter(chain => {
    const isEthereumBased = chain.options?.includes('ethereumBased');
    const isExcludedChain = chain.chainId in EXCLUDED_CHAINS;
    const isPausedChain = chain.name.includes('PAUSE');


    return !isEthereumBased && !isExcludedChain && !isPausedChain;
  });

  return filteredData.map(chain => {
      const externalApi = filterObjectByKeys(chain.externalApi, ['staking', 'history']);
      const options = chain.options?.includes('testnet') ? ['testnet'] : undefined;

      const explorers = chain.explorers?.map(explorer => {
        if (explorer.name === 'Subscan') {
          const accountParam = explorer.account;
          const domain = accountParam.substring(0, accountParam.indexOf('account'));
          return {
            ...explorer,
            multisig: `${domain}multisig_extrinsic/{index}?call_hash={callHash}`
          };
        }

        return explorer;
      });

      const assets = fillAssetData(chain)

      const updatedChain = {
        name: chain.name,
        addressPrefix: chain.addressPrefix,
        chainId: `0x${chain.chainId}`,
        parentId: chain.parentId ? `0x${chain.parentId}` : undefined,
        icon: replaceUrl(chain.icon, 'chain'),
        options,
        nodes: chain.nodes,
        assets,
        explorers,
      };

      if (externalApi) {
        updatedChain['externalApi'] = externalApi
      }

      return updatedChain;
    });
}

function replaceUrl(url, type, name = undefined) {
  const changedBaseUrl = url.replace("nova-utils/master", "nova-spektr-utils/main");
  const lastPartOfUrl = url.split("/").pop()

  switch (type) {
    case "chain":
      return changedBaseUrl.replace(
        /\/icons\/.*/,
        `/icons/${SPEKTR_CONFIG_VERSION}/chains/${lastPartOfUrl}`
      );
    case "asset":
      const tickerNames = [name, name.split("-")[0], TICKER_NAMES[name]];
      const relativePath = findFileByTicker(tickerNames, ASSET_ICONS_DIR);
      if (!relativePath) {
        throw new Error(`Can't find file for: ${name} in: ${ASSET_ICONS_DIR}`);
      }

      return changedBaseUrl.replace(/\/icons\/.*/, `/${relativePath}`);
    default:
      throw new Error("Unknown type: " + type);
  }
}

function replaceTypeExtras(typeExtras) {
  if (typeExtras && typeExtras.currencyIdType) {
    const replacementIndex = TYPE_EXTRAS_REPLACEMENTS.indexOf(typeExtras.currencyIdType);
    if (replacementIndex >= 0) {
      typeExtras.currencyIdType = TYPE_EXTRAS_REPLACEMENTS[replacementIndex + 1];
    }
  }

  return typeExtras;
}

function findFileByTicker(tickers, dirPath) {
  const [fullName, shortName, mappedName] = tickers;

  try {
    const files = fs.readdirSync(dirPath);
    // Loop through files to find match based on ticker pattern
    for (let i = 0; i < files.length; i++) {
      if (DEFAULT_ASSETS.includes(fullName)) {
        return dirPath + '/Default.svg' // Set default icon for some assets
      }

      // Check if file satisfies ticker pattern
      const currentFile = files[i];

      const byFullName = new RegExp(`^${fullName}.svg\\b|\\(${fullName}\\)\\.svg`, "i");
      const byShortName = new RegExp(`^${shortName}.svg\\b|\\(${shortName}\\)\\.svg`, "i");
      const byMappedName = new RegExp(`^${mappedName}.svg\\b|\\(${mappedName}\\)\\.svg`, "i");

      if (
          currentFile.match(byFullName)
          || currentFile.match(byShortName)
          || currentFile.match(byMappedName)
      ) {
        return path.join(dirPath, currentFile);
      }
    }
  } catch (error) {
    throw new Error(error);
  }
}

function filterObjectByKeys(obj, keys) {
  if (obj == null) return null;

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (keys.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(path.resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 4));
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullChainsJSON() {
  const requests = CHAINS_ENV.map(async (chain) => {
    try {
      const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
      const modifiedData = await getTransformedData(novaChainsConfig);
      await saveNewFile(modifiedData, chain);
      console.log('❇️ Successfully generated for: ' + chain);
    } catch (e) {
      console.error('️🔴 Error for: ', chain, e);
      process.exit(1);
    }
  });

  await Promise.allSettled(requests);
}

buildFullChainsJSON()
  .then(() => console.log('🏁 buildFullChainsJSON finished'))
  .catch(e => {
    console.error('🔴 Error in buildFullChainsJSON: ', e);
    process.exit(1);
  });

