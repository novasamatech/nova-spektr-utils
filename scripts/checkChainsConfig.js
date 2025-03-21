const fs = require('fs');
const jp = require('jsonpath');
const path = require('path');

const BASE_ICON_PATH = "/nova-spektr-utils/main/icons/"
const KNOWN_EXPLORERS = [
  'Subscan',
  'SCAN',
  'Polkascan',
  'Polkaholic',
  'Sub.ID',
  'Statescan',
  'Ternoa explorer',
  'Ternoa Alphanet explorer',
  'Explorer',
  'XX explorer',
  'Aventus testnet explorer',
  'Aventus explorer',
  '3DPass explorer',
  'Varascan',
  'Polkastats',
  'Governance2 Testnet explorer',
  'Moonscan',
  'Polimec explorer'
]


function checkBlockExplorers(chainsJSON) {
  chainsJSON.forEach(chain => {
    if (chain.explorers) {
      const explorerNames = chain.explorers.map(explorer => explorer.name);
      const unknownExplorers = explorerNames.filter(name => !KNOWN_EXPLORERS.includes(name));
      if (unknownExplorers.length > 0) {
        throw new Error(`Chain "${chain.name}" has unknown explorers: ${unknownExplorers.join(', ')}`);
      }
    }
  });
}

function checkSpecNames(chainsJSON) {
  const errors = [];
  chainsJSON.forEach(chain => {
    if (!chain.specName) {
      errors.push(`Chain "${chain.name}" is missing specName`);
    }
  });
  return errors;
}

function checkMultisigProxyConfig(chainsJSON) {
  const errors = [];
  chainsJSON.forEach(chain => {
    if (chain.options && chain.options.includes('multisig')) {
      if (!chain.externalApi || !chain.externalApi.proxy) {
        errors.push(`Chain "${chain.name}" has multisig enabled but missing externalApi.proxy configuration`);
      }
    }
  });
  return errors;
}

let hasError = false;

function checkChainsFile(filePath) {
  let chainsFile = fs.readFileSync(filePath);
  let chainsJSON = JSON.parse(chainsFile);

  // check that new explorers were not added
  checkBlockExplorers(chainsJSON);

  const multisigProxyErrors = checkMultisigProxyConfig(chainsJSON);
  if (multisigProxyErrors.length > 0) {
    console.error(`Errors in file ${filePath}:`);
    multisigProxyErrors.forEach(error => console.error(error));
    hasError = true;
  }

  const specNameErrors = checkSpecNames(chainsJSON);
  if (specNameErrors.length > 0) {
    console.error(`Errors in file ${filePath}:`);
    specNameErrors.forEach(error => console.error(error));
    hasError = true;
  }

  // Check chain icons
  let chainIcons = jp.query(chainsJSON, "$[*].icon");
  let badChainIcons = new Set();
  for (let i in chainIcons) {
    if (chainIcons[i].indexOf(`${BASE_ICON_PATH}`) === -1) {
      badChainIcons.add(chainIcons[i]);
    }
    if (chainIcons[i].indexOf(`/chains/`) === -1) {
      badChainIcons.add(chainIcons[i]);
    }
  }
  if (badChainIcons.size > 0) {
    console.error("Bad chain icons paths in " + filePath);
    console.log(badChainIcons);
    hasError = true;
  } else {
    console.log("All chain icons path is correct in " + filePath);
  }

  // Check asset icons
  let assetIcons = jp.query(chainsJSON, "$..assets[*].icon");
  let badAssetIcon = new Set();
  
  for (let i in assetIcons) {
    const icon = assetIcons[i];
    
    // Check if icon has both monochrome and colored properties
    if (!icon.monochrome || !icon.colored) {
      badAssetIcon.add(JSON.stringify(icon));
      continue;
    }

    // Check monochrome icon path
    if (!icon.monochrome.includes(`${BASE_ICON_PATH}`) || 
        !icon.monochrome.includes(`/assets/monochrome/`)) {
      badAssetIcon.add(icon.monochrome);
    }

    // Check colored icon path
    if (!icon.colored.includes(`${BASE_ICON_PATH}`) || 
        !icon.colored.includes(`/assets/colored/`)) {
      badAssetIcon.add(icon.colored);
    }
  }

  if (badAssetIcon.size > 0) {
    console.error("Bad asset icons paths in " + filePath);
    console.log(badAssetIcon);
    hasError = true;
  } else {
    console.log("All asset icons path is correct in " + filePath);
  }

  // Check local file existence
  let allIcons = [
    ...jp.query(chainsJSON, "$[*].icon"),
    ...jp.query(chainsJSON, "$..assets[*].icon.monochrome"),
    ...jp.query(chainsJSON, "$..assets[*].icon.colored")
  ];

  let relativeIcons = [];
  for (let i in allIcons) {
    if (typeof allIcons[i] === 'string') {
      relativeIcons.push('.' + allIcons[i].substring(allIcons[i].indexOf('/icons/')));
    }
  }

  let badPath = new Set();
  for (i in relativeIcons) {
    let path = relativeIcons[i];
    try {
      fs.readFileSync(path);
    } catch (error) {
      badPath.add(path);
    }
  }
  
  if (badPath.size > 0) {
    console.error("No icons for chains or assets in " + filePath);
    console.log(badPath);
    hasError = true;
  } else {
    console.log("All icons found in " + filePath);
  }

  let buyProviders = jp.query(chainsJSON, "$..buyProviders");
  if (buyProviders.length > 0) {
    console.error("Buy providers has to be excluded from " + filePath);
    console.log(buyProviders);
    hasError = true;
  }

  let chainTypes = jp.query(chainsJSON, "$..types");
  if (chainTypes.length > 0) {
    console.error("Chain types has to be removed from " + filePath);
    console.log(chainTypes);
    hasError = true;
  }
}

function traverseDir(dirPath, checkFunction, callback) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error('Error while reading directory:', err);
      return callback(err);
    }

    let pending = files.length;

    if (!pending) return callback(null);

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      fs.stat(fullPath, (err, stats) => {
        if (err) {
          console.error('Error while getting file stats:', err);
          return callback(err);
        }

        if (stats.isDirectory()) {
          // Recursive call in order to support nested directories
          traverseDir(fullPath, checkFunction, (err) => {
            if (!--pending) callback(err);
          });
        } else if (path.extname(file) === '.json') {
          checkFunction(fullPath);
          if (!--pending) callback(null);
        } else {
          if (!--pending) callback(null);
        }
      });
    });
  });
}

traverseDir(path.join(__dirname, '../chains/'), checkChainsFile, (err) => {
  if (err) {
    console.error('traverseDir failed - ', err);
    throw new Error('Error while traversing directory');
  }

  // All files and directories have been processed
  if (hasError) {
    throw new Error('Some chains file have problems with path, check the log');
  }

  console.log('All files processed successfully');
});
