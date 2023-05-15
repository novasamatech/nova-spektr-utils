const path = require('path');
const { writeFile } = require('fs/promises');
const fs = require('fs');
const axios = require('axios');

const tokenNames = require('./data/assetsNameMap.json');

const NOVA_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v11';
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION || 'v1';
const CONFIG_PATH = `chains/${SPEKTR_CONFIG_VERSION}/`;
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

const defaultAssets = ['SHIBATALES', 'SIRI', 'PILT', 'cDOT-6/13', 'cDOT-7/14', 'cDOT-8/15', 'cDOT-9/16', 'cDOT-10/17', 'TZERO', 'UNIT', 'Unit', 'tEDG']

async function getDataViaHttp(url, filePath) {
  try {
    const response = await axios.get(url + filePath);

    return response.data;
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaHttp failed');
  }
}

function getTransformedData(rawData) {
  return rawData
    .filter(chain => !chain.options?.includes('ethereumBased'))
    .map(chain => {
      const externalApi = filterObjectByKeys(chain.externalApi, ['staking', 'history'])
      const updatedChain = {
        chainId: `0x${chain.chainId}`,
        parentId: chain.parentId ? `0x${chain.parentId}` : undefined,
        name: chain.name,
        assets: chain.assets.map(asset => ({
          assetId: asset.assetId,
          symbol: asset.symbol,
          precision: asset.precision,
          type: asset.type,
          priceId: asset.priceId,
          staking: asset.staking,
          icon: replaceUrl(asset.icon, 'asset', asset.symbol),
          name: tokenNames[asset.symbol] || 'Should be included in scripts/data/assetsNameMap',
        })),
        nodes: chain.nodes,
        explorers: chain.explorers?.map(explorer => {
          if (explorer.name === 'Subscan') {
            const accountParam = explorer.account;
            const domain = accountParam.substring(0, accountParam.indexOf('account'));
            return {
              ...explorer,
              multisig: `${domain}multisig_extrinsic/{index}?call_hash={callHash}`
            };
          }
          return explorer;
        }),
        icon: replaceUrl(chain.icon, 'chain'),
        addressPrefix: chain.addressPrefix
      };

      if (externalApi) {
        updatedChain['externalApi'] = externalApi
      }

      return updatedChain;
    });
}

function replaceUrl(url, type, name=undefined) {
  let changedUrl

  const changedBaseUrl = url.replace("nova-utils/master", "nova-spektr-utils/main");
  const lastPartOfUrl = url.split("/").pop()
  
  switch(type) {
    case "chain":
      changedUrl = changedBaseUrl.replace(
        /\/icons\/.*/,
        `/icons/${SPEKTR_CONFIG_VERSION}/chains/${lastPartOfUrl}`
      );
      break;
    case "asset":
      const relativePath = findFileByTicker(name, "icons/v1/assets/white")
      changedUrl = changedBaseUrl.replace(
        /\/icons\/.*/,
        `/${relativePath}`
      );
      changedUrl = changedUrl.replace(/ /g, '%20'); // Replace spaces
      break;
    default:
      throw new Error("Unknown type: " + type);
  }

  return changedUrl;
}

function findFileByTicker(ticker, dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    // Loop through files to find match based on ticker pattern
    for (let i = 0; i < files.length; i++) {
      const filePath = path.join(dirPath, files[i]);

      if (defaultAssets.includes(ticker)) {
        return filePath + 'Default.svg' // Set default icon for some assets
      }

      // Check if file satisfies ticker pattern
      if (files[i].match(new RegExp(`^${ticker}.svg\\b|\\(${ticker}\\)\\.`, 'i'))) {
        return filePath;
      }
    }

    if (ticker.split('-').length > 1) {
      return findFileByTicker(ticker.split('-')[0], dirPath)
    }

    // No match found
    throw new Error("Can't find file for: " + ticker + " in: " + dirPath);
  } catch (error) {
    throw new Error(error);
  }
}

function filterObjectByKeys(obj, keys) {
  if (obj == null) return null
  const entries = Object.entries(obj);
  const filteredEntries = entries.reduce((acc, [key, value]) => {
    if (keys.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
  return filteredEntries;
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(path.resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 4));
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullChainsJSON() {
  CHAINS_ENV.forEach(async (chain) => {
    const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
    const modifiedData = await getTransformedData(novaChainsConfig);
    await saveNewFile(modifiedData, chain);
    console.log('Was successfuly generated for: ' + chain);
  });
}

buildFullChainsJSON();
