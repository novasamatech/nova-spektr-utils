const path = require('path');
const { writeFile, readFile } = require('fs/promises');
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
  '55b88a59dded27563391d619d805572dd6b6b89d302b0dd792d01b3c41cfe5b1': 'Singular testnet', // testnet
  '23fc729c2cdb7bd6770a4e8c58748387cc715fcf338f1f74a16833d90383f4b0': 'Acala Mandala',
  'c9824829d23066e7dd92b80cfef52559c7692866fcfc3530e737e3fe01410eef': 'GIANT testnet',
  '9b86ea7366584c5ddf67de243433fcc05732864933258de9467db46eb9bef8b5': 'VARA testnet'
}

const TYPE_EXTRAS_REPLACEMENTS = {
    'baf5aabe40646d11f0ee8abbdc64f4a4b7674925cba08e4a05ff9ebed6e2126b':   'AcalaPrimitivesCurrencyCurrencyId',
    'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c':   'AcalaPrimitivesCurrencyCurrencyId',
    '262e1b2ad728475fd6fe88e62d34c200abe6fd693931ddad144059b1eb884e5b':   'BifrostPrimitivesCurrencyCurrencyId',
    '9f28c6a68e0fc9646eff64935684f6eeeece527e37bbe1f213d22caa1d9d6bed':   'BifrostPrimitivesCurrencyCurrencyId',
    'f22b7850cdd5a7657bbfd90ac86441275bbc57ace3d2698a740c7b0ec4de5ec3':   'BitCountryPrimitivesFungibleTokenId',
    'bf88efe70e9e0e916416e8bed61f2b45717f517d7f3523e33c7b001e5ffcbc72':   'InterbtcPrimitivesCurrencyId',
    '3a5a5cd27eb15fd26c37315a0f0b938733bb798c897428448efac5e6150cad06':   'InterbtcPrimitivesCurrencyId',
    '418ae94c9fce02b1ab3b5bc211cd2f2133426f2861d97482bbdfdac1bbb0fb92':   'InterbtcPrimitivesCurrencyId',
    '9af9a64e6e4da8e3073901c3ff0cc4c3aad9563786d89daf6ad820b6e14a0b8b':   'InterbtcPrimitivesCurrencyId',
    'cceae7f3b9947cdb67369c026ef78efa5f34a08fe5808d373c04421ecf4f1aaf':   'SpacewalkPrimitivesCurrencyId',
    '5d3c298622d5634ed019bf61ea4b71655030015bde9beb0d6a24743714462c86':   'SpacewalkPrimitivesCurrencyId'
}
const STAKING_ALLOWED_ARRAY = ['Polkadot', 'Kusama', 'Westend', 'Polkadex', 'Ternoa', 'Novasama Testnet - Kusama']

const DEFAULT_ASSETS = ['SHIBATALES', 'DEV', 'SIRI', 'PILT', 'cDOT-6/13', 'cDOT-7/14', 'cDOT-8/15', 'cDOT-9/16', 'cDOT-10/17', 'TZERO', 'UNIT', 'Unit', 'tEDG','JOE', 'HOP'];

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
      typeExtras: replaceTypeExtras(asset.typeExtras, chain.chainId),
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
      let options;
      if (chain.options?.includes('testnet')) {
        options = ['testnet'];
      }
      if (multisigMap[chain.name]) {
        options = [...(options || []), 'multisig'];
      }

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
        console.error(`Can't find file for: ${name} in: ${ASSET_ICONS_DIR}`);
        return changedBaseUrl.replace(/\/icons\/.*/, `/${TICKER_NAMES[name]}`);
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
        mergedData[existingItemIndex] = { ...mergedData[existingItemIndex], ...newItem };
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

