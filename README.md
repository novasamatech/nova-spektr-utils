# nova-spektr-utils
1. Configs for Nova Spektr application in Polkadot &amp; Kusama ecosystem
2. Chain and asset icons for the Nova Spektr application

# Check chains config file
1. Download and install `node.js`
2. Install required npm packages  
```shell
npm install
```
3. Run following commands
```shell
npm run update:prepare-icons
npm run update:chains-file
npm run check:chains-file
```
4. The correct output is 
```text
All icons found in ./chains/v1/chains.json
All asset icons path is correct in ./chains/v1/chains.json
All chain icons path is correct in ./chains/v1/chains.json
All icons found in ./chains/v1/chains_dev.json
All asset icons path is correct in ./chains/v1/chains_dev.json
All chain icons path is correct in ./chains/v1/chains_dev.json
```
## License
Nova spektr utils is available under the Apache 2.0 license. See the LICENSE file for more info.
© Novasama Technologies GmbH 2023