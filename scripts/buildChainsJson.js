const path = require('path');
const {writeFile, readFile} = require('fs/promises');
const fs = require('fs');

const TOKEN_NAMES = require('./data/assetsNameMap.json');
const PROXY_LIST = require('./data/proxyList.json');

const EXCEPTIONAL_CHAINS = require('./data/exceptionalChains.json');
const ALLOWED_CHAINS = require('./data/allowedChains.json');

const NOVA_CONFIG_VERSION = process.env.NOVA_CONFIG_VERSION;
const SPEKTR_CONFIG_VERSION = process.env.SPEKTR_CONFIG_VERSION;
const CONFIG_PATH = `chains/${SPEKTR_CONFIG_VERSION}/`;
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;
const ASSET_ICONS_DIR = `icons/v2/assets`

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
    const iconPaths = replaceAssetIconUrl(asset.icon, symbol);

    return {
      name: TOKEN_NAMES[symbol] || symbol,
      assetId: asset.assetId,
      symbol,
      precision: asset.precision,
      type: asset.type || 'native',
      priceId: asset.priceId,
      staking: getStakingValue(asset.staking, chain.name),
      icon: iconPaths,
      typeExtras: replaceTypeExtras(asset.typeExtras, chain.chainId),
    };
  }).filter(Boolean);
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
    const nodes = chain.nodes
      .filter(node => !node.url.includes('{'))
      .sort((a, b) => {
        // Put Dwellir nodes first
        const aIsDwellir = a.name.toLowerCase().includes('dwellir');
        const bIsDwellir = b.name.toLowerCase().includes('dwellir');
        if (aIsDwellir && !bIsDwellir) return -1;
        if (!aIsDwellir && bIsDwellir) return 1;
        return 0;
      })
      .map(node => ({
        url: node.url,
        name: node.name
      }));

    const updatedChain = {
      name: chain.name,
      addressPrefix: chain.addressPrefix,
      legacyAddressPrefix: chain.legacyAddressPrefix || undefined,
      chainId: `0x${chain.chainId}`,
      parentId: chain.parentId ? `0x${chain.parentId}` : undefined,
      icon: replaceChainIconUrl(chain.icon),
      options,
      nodes,
      assets,
      explorers,
      ...(externalApi && { externalApi }),
      ...(chain.additional?.identityChain && { additional: { identityChain: `0x${chain.additional.identityChain}` } }),
      ...(chain.additional?.timelineChain && { additional: { ...chain.additional, timelineChain: `0x${chain.additional.timelineChain}` } })
    };

    return updatedChain;
  });
}

function replaceAssetIconUrl(originalIconPath) {
  const BASE_URL = 'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/' + ASSET_ICONS_DIR;

  return {
    monochrome: `${BASE_URL}/monochrome/${originalIconPath}`,
    colored: `${BASE_URL}/colored/${originalIconPath}`
  };
}

function replaceChainIconUrl(url) {
  const changedBaseUrl = url.replace("nova-utils/master", "nova-spektr-utils/main");
  const lastPartOfUrl = url.split("/").pop();

  const chainName = lastPartOfUrl.split('.')[0];
  const correctedChainName = chainName.charAt(0).toUpperCase() + chainName.slice(1);
  return changedBaseUrl.replace(
        /\/icons\/.*/,
        `/icons/${SPEKTR_CONFIG_VERSION}/chains/${correctedChainName}.svg`
      );
}

function replaceTypeExtras(typeExtras, chainId) {
  if (!typeExtras) return undefined;

  const result = {
    ...(typeExtras.currencyIdScale && {
      currencyIdScale: typeExtras.currencyIdScale
    }),
    ...(typeExtras.currencyIdType && {
      currencyIdType: TYPE_EXTRAS_REPLACEMENTS[chainId] || typeExtras.currencyIdType
    }),
    ...(typeExtras.assetId && {
      assetId: typeExtras.assetId
    }),
    ...(typeExtras.existentialDeposit && {
      existentialDeposit: typeExtras.existentialDeposit
    }),
    ...(typeExtras.transfersEnabled !== undefined && {
      transfersEnabled: typeExtras.transfersEnabled
    }),
    ...(typeExtras.palletName && {
      palletName: typeExtras.palletName
    })
  };

  return Object.keys(result).length > 0 ? result : undefined;
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

    await writeFile(filePath, JSON.stringify(newJson, null, 4));
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

  // Filter out paused chains after merge
  const filteredDev = dev.value.filter(chain => !chain.name.includes('PAUSED'));
  const filteredProd = prod.value.filter(chain => !chain.name.includes('PAUSED'));

  await saveNewFile(filteredDev, CHAINS_ENV[0]);
  await saveNewFile(filteredProd, CHAINS_ENV[1]);
  console.log('❇️ Successfully generated CHAINS for DEV & PROD');
  console.log('⚠️ Exceptional PROD chains - ', toProd.map(c => c.name));
}

buildFullChainsJSON().catch((error) => {
  console.error(error);
  process.exit(1);
});

