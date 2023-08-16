import { MultisigVersionStorage } from "../multisigVersionStorage";
import { Chain } from "../models/Chain";
import { calculateChainDataForTable } from "./chainUtils";

export function markdownChainsTable(chains: Chain[]) {
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

export function markdownMultisigTable(multisigData: MultisigVersionStorage) {
    let markdownTable = `
# List of Networks where we are support Multisig pallet
| -- | Network | Multisig version |
| -------- | -------- | -------- |
`
    let counter = 0;
    const networks = multisigData.getNetworks()
    networks.forEach(network => {
        counter++;
        markdownTable += `| ${counter} | ${network.getName()} | ${network.getVersion()} |\n`;
    });
    return markdownTable
}

export function buildMarkdownHeader(
    networksNumber: number,
    assetsNumber: number,
    multisigNetworks: number,
    stakingNumber: number
) {

    const makrdownData = `
# Supported Features data:
### 🕸️ [Supported networks](#supported-network-list): ${networksNumber}
### 🪙 Added assets: ${assetsNumber}
### 👨‍👩‍👧‍👦 [Multisig supported](#list-of-networks-where-we-are-support-multisig) in: ${multisigNetworks}
### 🥞 Staking supported in: ${stakingNumber}
\n
`
    return makrdownData
}
