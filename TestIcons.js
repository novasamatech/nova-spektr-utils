const fs = require('fs');
const jp = require('jsonpath');

function checkChainsFile(filePath) {
    let chainsFile = fs.readFileSync(filePath);
    let chainsJSON = JSON.parse(chainsFile);
    let allIcons = jp.query(chainsJSON, "$..icon");
    let relativeIcons = [];
    for (let i in allIcons) {
        relativeIcons.push('.' + allIcons[i].substring(allIcons[i].indexOf('/icons/')));
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
        console.error("No icons for chains or tokens in " + filePath);
        console.log(badPath);
    } else {
        console.log("All icons found in in " + filePath);
    }

    let assetIcons = jp.query(chainsJSON, "$..assets[*].icon");
    let badAssetIcon = new Set();
    for (let i in assetIcons) {
        if (assetIcons[i].indexOf('/nova-spektr-utils/main/icons/tokens/white/v1/') === -1) {
            badAssetIcon.add(assetIcons[i]);
        }
    }
    if (badAssetIcon.size > 0) {
        console.error("Bad asset icons paths in " + filePath);
        console.log(badAssetIcon);
    } else {
        console.log("All asset icons path is correct in " + filePath);
    }

    let chainIcons = jp.query(chainsJSON, "$[*].icon");
    let badChainIcons = new Set();
    for (let i in chainIcons) {
        if (chainIcons[i].indexOf('/nova-spektr-utils/main/icons/chains/v1/') === -1) {
            badChainIcons.add(chainIcons[i]);
        }
    }
    if (badChainIcons.size > 0) {
        console.error("Bad chain icons paths in " + filePath);
        console.log(badChainIcons);
    } else {
        console.log("All chain icons path is correct in " + filePath);
    }

}

checkChainsFile("./chains/v1/chains.json");
checkChainsFile("./chains/v1/chains_dev.json");