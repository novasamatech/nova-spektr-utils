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
    'Governance2 Testnet explorer'
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

let hasError = false;
function checkChainsFile(filePath) {
    let chainsFile = fs.readFileSync(filePath);
    let chainsJSON = JSON.parse(chainsFile);

    // check that new explorers were not added
    checkBlockExplorers(chainsJSON)

    let allIcons = jp.query(chainsJSON, "$..icon");
    let relativeIcons = [];
    for (let i in allIcons) {
        relativeIcons.push('.' + allIcons[i].substring(allIcons[i].indexOf('/icons/')))
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

    let assetIcons = jp.query(chainsJSON, "$..assets[*].icon");
    let badAssetIcon = new Set();
    for (let i in assetIcons) {
        if (assetIcons[i].indexOf(`${BASE_ICON_PATH}`) === -1) {
            badAssetIcon.add(assetIcons[i]);
        }
        if (assetIcons[i].indexOf(`/assets/white/`) === -1) {
            badAssetIcon.add(assetIcons[i]);
        }
    }
    if (badAssetIcon.size > 0) {
        console.error("Bad asset icons paths in " + filePath);
        console.log(badAssetIcon);
        hasError = true;
    } else {
        console.log("All asset icons path is correct in " + filePath);
    }

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
    fs.readdir(dirPath, function (err, files) {
        if (err) {
            console.error('Error while reading directory:', err);
            return callback(err);
        }

        let pending = files.length;

        if (!pending) return callback(null);

        files.forEach(function (file) {
            const fullPath = path.join(dirPath, file);
            fs.stat(fullPath, function (err, stats) {
                if (err) {
                    console.error('Error while getting file stats:', err);
                    return callback(err);
                }

                if (stats.isDirectory()) {
                    // Recursive call in order to support nested directories
                    traverseDir(fullPath, checkFunction, function (err) {
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

traverseDir(path.join(__dirname, '../chains/'), checkChainsFile, function (err) {
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
