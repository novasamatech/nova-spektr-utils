import { MultisigVersionStorage } from "../models/MultisigVersionStorage";
import { Chain } from "../models/Chain";
import { calculateChainDataForTable, calculateProxyDataForTable } from "./chainUtils";

export function markdownChainsTable(chains: Chain[]): string {
    // Build Markdown table
    let markdownTable = `
## The list of supported networks
| -- | Network | Assets count | Explorers |
| -------- | -------- | -------- | -------- |
`;
    let counter = 0;
    chains.forEach(chain => {
        const { networkName, assetsCount, explorers } = calculateChainDataForTable(chain)
        counter++;
        markdownTable += `| ${counter} | ${networkName} | ${assetsCount} | ${explorers} |\n`;
    });

    return markdownTable
}

export function markdownMultisigTable(multisigData: MultisigVersionStorage): string {
    let markdownTable = `
# List of Networks where we are support Multisig pallet
| -- | Network | Multisig version |
| -------- | -------- | -------- |
`
    let counter = 0;
    const networks = multisigData.getNetworks()
    const sortedNetworks = networks.sort()
    sortedNetworks.forEach(network => {
        counter++;
        markdownTable += `| ${counter} | ${network.name} | ${network.version} |\n`;
    });
    return markdownTable
}

export function markdownProxyTable(chains: Chain[]) {
    let markdownTable = `
# List of Networks where we are support proxy feature
| -- | Network | Pure proxy | Regular proxy |
| -------- | -------- | -------- | -------- |
`
    const { counter, table } = chains.reduce((acc, chain) => {
        const { networkName, pure, regular } = calculateProxyDataForTable(chain);
        if (pure || regular) {
            acc.counter++;
            acc.table += `| ${acc.counter} | ${networkName} | ${pure} | ${regular} |\n`;
        }
        return acc;
    }, { counter: 0, table: markdownTable });

    return { proxyCounter: counter, proxyTable: table };
}

export function buildMarkdownHeader(
    networksNumber: number,
    assetsNumber: number,
    multisigNetworks: number,
    stakingNumber: number,
    proxyNumber: number
): string {

    const makrdownData = `
# Supported Features data:
### 🕸️ [Supported networks](#supported-network-list): ${networksNumber}
### 🪙 Added assets: ${assetsNumber}
### 👨‍👩‍👧‍👦 [Multisig supported](#list-of-networks-where-we-are-support-multisig) in: ${multisigNetworks}
### 🥞 Staking supported in: ${stakingNumber}
### 🕹️ Proxy supported in: ${proxyNumber}
\n
`
    return makrdownData
}
