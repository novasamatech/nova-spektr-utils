const path = require('path');
const { writeFile } = require('fs/promises');
const fs = require('fs');
const axios = require('axios');

const tokenNames = require('./data/assetsNameMap.json');

const NOVA_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v11';
const CONFIG_PATH = 'chains/';
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION || 'v1';

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

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
      const updatedChain = {
        chainId: `0x${chain.chainId}`,
        parentId: chain.parentId ? `0x${chain.parentId}` : undefined,
        name: chain.name,
        assets: chain.assets.map(asset => ({
          ...asset,
          name: tokenNames[asset.symbol] || 'Should be included in scripts/data/assetsNameMap',
          icon: replaceUrl(asset.icon, 'asset', asset.symbol)
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
        addressPrefix: chain.addressPrefix,
        externalApi: chain.externalApi
      };
      return updatedChain;
    });
}

function replaceUrl(url, type, name=undefined) {
  let changedUrl
  
  const assetUrlPath = "/assets/white/"
  const chainsUrlPath = "/chains/"

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
        `/icons/${SPEKTR_CONFIG_VERSION}/assets/white/${relativePath}`
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
      // Check if file satisfies ticker pattern
      if (files[i].match(new RegExp(`^${ticker}.svg\\b|\\(${ticker}\\)\\.`, 'i'))) {
        return filePath;
      }
    }
    // No match found
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(path.resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 2));
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
