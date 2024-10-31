const path = require('path');
const {writeFile, readFile} = require('fs/promises');
const fs = require('fs');

const TOKEN_NAMES = require('./data/assetsNameMap.json');
const TICKER_NAMES = require('./data/assetTickerMap.json');
const PROXY_LIST = require('./data/proxyList.json');

const EXCEPTIONAL_CHAINS = require('./data/exceptionalChains.json');
const ALLOWED_CHAINS = require('./data/allowedChains.json');

const NOVA_CONFIG_VERSION = process.env.NOVA_CONFIG_VERSION;
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;
const CONFIG_PATH = `chains/${SPEKTR_CONFIG_VERSION}/`;
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;
const ASSET_ICONS_DIR = `icons/v1/assets/white`

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

const TYPE_EXTRAS_REPLACEMENTS = {
  'baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b': 'AcalaPrimitivesCurrencyCurrencyId',
  'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c': 'AcalaPrimitivesCurrencyCurrencyId',
  '262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b': 'BifrostPrimitivesCurrencyCurrencyId',
  '9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed': 'BifrostPrimitivesCurrencyCurrencyId',
  'f22b7850cdd5a7657bbfd90ac86441275bbc57ace3d2698a740c7b0ec4de5ec3': 'BitCountryPrimitivesFungibleTokenId',
  'bf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72': 'InterbtcPrimitivesCurrencyId',
  '3a5a5cd27eb15fd26c37315a0f0b938733bb798c897428448efac5e6150cad06': 'InterbtcPrimitivesCurrencyId',
  '418ae94c9fce02b1ab3b5bc211cd2f2133426f2861d97482bbdfdac1bbb0fb92': 'InterbtcPrimitivesCurrencyId',
  '9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b': 'InterbtcPrimitivesCurrencyId',
  'cceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf': 'SpacewalkPrimitivesCurrencyId',
  '5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86': 'SpacewalkPrimitivesCurrencyId'
}
const STAKING_ALLOWED_ARRAY = ['Polkadot', 'Kusama', 'Westend', 'Polkadex', 'Ternoa', 'Novasama Testnet - Governance']

const GOV_ALLOWED_ARRAY = ['Polkadot', 'Kusama', 'Westend', 'Rococo', 'Novasama Testnet - Governance'];

const DEFAULT_ASSETS = ['SHIBATALES', 'DEV', 'SIRI', 'PILT', 'cDOT-6/13', 'cDOT-7/14', 'cDOT-8/15', 'cDOT-9/16', 'cDOT-10/17', 'TZERO', 'UNIT', 'Unit', 'tEDG', 'JOE', 'HOP', 'PAS'];

const readmeContent = fs.readFileSync('chains/v1/README.md', 'utf8');
const multisigSection = readmeContent.split('# List of Networks where we are support Multisig pallet')[1].split('## The list of supported networks')[0];
const multisigLines = multisigSection.split('\n').slice(3); // Skip the table header

const multisigMap = {};
multisigLines.forEach(line => {
  const cells = line.split('|').map(cell => cell.trim());
  const network = cells[2];
  const multisigVersion = cells[3];
  if (network && multisigVersion) {
    multisigMap[network] = multisigVersion;
  }
});

const evmChains = [
  "0xfe58ea77779b7abda7da4ec526d14db9b1e9cd40a217c34892af80a9b332b76d", // Moonbeam
  "0x401a1f9dca3da46f5c4091016c8a2f26dcea05865116b286f60f668207d1474b", // Moonriver
  "0x91bc6e169807aaa54802737e1c504b2577d4fafedd5a02c10293b1cd60e39527", // Moonbase alpha
]

function getDataFromUrl(url, filePath) {
  return fetch(url + filePath, {method: 'GET'})
    .then(response => response.json())
    .catch(error => console.log('Error: ', error?.message || 'getDataViaHttp failed'));
}

function getStakingValue(staking, chainName) {
  if (!STAKING_ALLOWED_ARRAY.includes(chainName)) {
    return undefined;
  }

  return Array.isArray(staking) ? staking[0] : typeof staking === 'string' ? staking : undefined;
}

function fillAssetData(chain) {
  return chain.assets.map(asset => {
    // Skip assets with typeExtras.palletName: "ForeignAssets"
    if (asset.typeExtras?.palletName === "ForeignAssets") return;
    // Temp remove, waiting for "AssetManagement pallet support. It's used by Zeitgeist." https://app.clickup.com/t/85ztgpy7n
    if (chain.name === 'Zeitgeist' && asset.symbol === 'DOT') return;
    if (asset.symbol.endsWith('.s')) return;
    // Remove Pool tokens
    if (asset.symbol.includes('Pool')) return;
    // Remove LP tokens
    if (asset.symbol.startsWith('LP ')) return;
    // Remove Special DOT tokens
    if (asset.symbol.startsWith('cDOT')) return;
    // Remove Snowbridge tokens
    if (asset.symbol.endsWith('-Snowbridge')) return;

    const symbol = asset.symbol.replace(/[_ ]+\(old\)/gi, '')

    return {
      name: TOKEN_NAMES[symbol] || 'Should be included in scripts/data/assetsNameMap',
      assetId: asset.assetId,
      symbol,
      precision: asset.precision,
      type: asset.type || 'native',
      priceId: asset.priceId,
      staking: getStakingValue(asset.staking, chain.name),
      icon: replaceUrl(asset.icon, 'asset', symbol),
      typeExtras: replaceTypeExtras(asset.typeExtras, chain.chainId),
    };
  });
}

function getPreparedChains(rawData) {
  const filteredData = rawData.filter(chain => chain.chainId in ALLOWED_CHAINS);

  return filteredData.map(chain => {
    const options = [];

    if (chain.options?.includes('testnet')) {
      options.push('testnet');
    }
    if (multisigMap[chain.name]) {
      options.push('multisig');
    }
    if (chain.options?.includes("ethereumBased")) {
      options.push('ethereum_based');
    }
    if (GOV_ALLOWED_ARRAY.includes(chain.name)) {
      options.push('governance');
    }
    const proxyData = PROXY_LIST.find(p => p.chainId.includes(chain.chainId));
    if (proxyData) {
      options.push(...proxyData.options)
    }
    let externalApi = filterObjectByKeys(chain.externalApi, ['staking', 'history', 'governance-delegations']);
    if (proxyData?.externalApi) {
      externalApi = {...externalApi, ...proxyData.externalApi}
    }

    const explorers = chain.explorers?.map(explorer => {
      if (explorer.name !== 'Subscan') return explorer

      const accountParam = explorer.account;
      const domain = accountParam.substring(0, accountParam.indexOf('account'));

      return {
        ...explorer,
        multisig: `${domain}multisig_extrinsic/{index}?call_hash={callHash}`
      };
    });

    const assets = fillAssetData(chain)
    const nodes = chain.nodes.filter(node => !node.url.includes('{')).map(node => ({
      url: node.url,
      name: node.name
    }));

    const updatedChain = {
      name: chain.name,
      addressPrefix: chain.addressPrefix,
      chainId: `0x${chain.chainId}`,
      parentId: chain.parentId ? `0x${chain.parentId}` : undefined,
      icon: replaceUrl(chain.icon, 'chain'),
      options,
      nodes,
      assets,
      explorers,
    };

    if (chain.additional?.identityChain) {
      updatedChain['additional'] = {identityChain: `0x${chain.additional.identityChain}`};
    }

    if (externalApi) {
      updatedChain['externalApi'] = externalApi
    }

    return updatedChain;
  });
}

function replaceUrl(url, type, name = undefined) {
  const changedBaseUrl = url.replace("nova-utils/master", "nova-spektr-utils/main");
  const lastPartOfUrl = url.split("/").pop();

  const customAssetMappings = {
    'aSEEDk': 'aSEED-Kusama',
    'aSEEDp': 'aSEED-Polkadot'
  };

  // handling for 'xc' prefixed token names
  const processedName = name ? name.replace(/^xc/, '') : name;

  switch (type) {
    case "chain":
      const chainName = lastPartOfUrl.split('.')[0];
      const correctedChainName = chainName.charAt(0).toUpperCase() + chainName.slice(1);
      return changedBaseUrl.replace(
        /\/icons\/.*/,
        `/icons/${SPEKTR_CONFIG_VERSION}/chains/${correctedChainName}.svg`
      );
    case "asset":
      const tickerNames = [processedName, processedName.split("-")[0], TICKER_NAMES[processedName]];
      const relativePath = findFileByTicker(tickerNames, ASSET_ICONS_DIR);
      if (!relativePath) {
        console.warn(`Can't find file for: ${processedName} in: ${ASSET_ICONS_DIR}. Trying fallback with customAssetMappings`);
        // Fallback to TICKER_NAMES using original name if processedName fails
        const mappedName = customAssetMappings[processedName] || TICKER_NAMES[name] || processedName;
        return changedBaseUrl.replace(/\/icons\/.*/, `/icons/v1/assets/white/${mappedName}.svg`);
      }

      return changedBaseUrl.replace(/\/icons\/.*/, `/${relativePath}`);
    default:
      throw new Error("Unknown type: " + type);
  }
}

function replaceTypeExtras(typeExtras, chainId) {
  if (typeExtras && typeExtras.currencyIdType) {
    const replacement = TYPE_EXTRAS_REPLACEMENTS[chainId];

    if (replacement) {
      typeExtras.currencyIdType = replacement;
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
    const filePath = path.resolve(CONFIG_PATH, file_name);
    let existingData = [];

    if (fs.existsSync(filePath)) {
      const existingFileContent = await readFile(filePath, 'utf8');
      existingData = JSON.parse(existingFileContent);
    }

    const newItemsMap = newJson.reduce((map, item) => {
      map[item.chainId] = item;
      return map;
    }, {});

    const filteredExistingData = existingData.filter(item => newItemsMap.hasOwnProperty(item.chainId));

    // Merge existing data with new data
    const mergedData = [...filteredExistingData];

    newJson.forEach(newItem => {
      const existingItemIndex = filteredExistingData.findIndex(
        item => item.chainId === newItem.chainId
      );

      if (existingItemIndex >= 0) {
        // If item already exists, update it
        mergedData[existingItemIndex] = {...mergedData[existingItemIndex], ...newItem};
      } else {
        // If item doesn't exist, add it
        mergedData.push(newItem);
      }
    });

    await writeFile(filePath, JSON.stringify(mergedData, null, 4));
    console.log('Successfully saved file: ' + file_name);
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullChainsJSON() {
  const requests = CHAINS_ENV.map((fileName) => {
    return getDataFromUrl(NOVA_CONFIG_URL, fileName).then(getPreparedChains);
  });

  const [dev, prod] = await Promise.allSettled(requests);

  if (prod.status === 'rejected' || dev.status === 'rejected') {
    console.log(prod.reason || dev.reason);
    throw new Error('️🔴 Error preparing DEV or PROD file');
  }

  const toProd = dev.value.filter(chain => EXCEPTIONAL_CHAINS.prod[chain.chainId]);
  prod.value.push(...toProd);

  await saveNewFile(dev.value, CHAINS_ENV[0]);
  await saveNewFile(prod.value, CHAINS_ENV[1]);
  console.log('❇️ Successfully generated CHAINS for DEV & PROD');
  console.log('⚠️ Exceptional PROD chains - ', toProd.map(c => c.name));
}

buildFullChainsJSON().catch((error) => {
  console.error(error);
  process.exit(1);
});

