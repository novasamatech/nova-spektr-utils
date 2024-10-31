const fs = require('fs');

const assetsNameMap = JSON.parse(fs.readFileSync('scripts/data/assetsNameMap.json', 'utf8'));

const chainsDev = JSON.parse(fs.readFileSync('chains/v1/chains_dev.json', 'utf8'));

chainsDev.forEach(chain => {
  chain.assets?.forEach(asset => {
    if (asset.name === "Should be included in scripts/data/assetsNameMap") {
      const symbol = asset.symbol;
      assetsNameMap[symbol] = symbol;
    }
  });
});

fs.writeFileSync('scripts/data/assetsNameMap.json', JSON.stringify(assetsNameMap, null, 2), 'utf8');
