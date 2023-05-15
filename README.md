# nova-spektr-utils
1. Configs for Nova Spektr application in Polkadot &amp; Kusama ecosystem
2. Chain and asset icons for the Nova Spektr application

# Check chains config file
1. Set up environment
Download and install node js.
2. Install json path library 
```shell
npm install jsonpath
```
3. Run `checkChainsConfig.js` file
```shell
node TestIsons.js
```
4. The correct output is 
```text
All icons found in in ./chains/v1/chains.json
All asset icons path is correct in ./chains/v1/chains.json
All chain icons path is correct in ./chains/v1/chains.json
All icons found in in ./chains/v1/chains_dev.json
All asset icons path is correct in ./chains/v1/chains_dev.json
All chain icons path is correct in ./chains/v1/chains_dev.json
```