import { Chain } from "../models/Chain";
import { calculateChainDataForTable } from "./chainUtils";

export function markdownChainsTable(chains: Chain[]) {
    // Build Markdown table
    let markdownTable = `
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

export function markdownMultisigTable() {
    let markdownTable = `
    | -- | Network | Multisig version |
    | -------- | -------- | -------- |
    `
}

export function buildMarkdownHeader(
        networksNumber: number,
        assetsNumber: number,
        multisigNetworks: number,
        stakingNumber: number
    ) {

    const makrdownData = `
        # Supported Features data:
        🕸️ Supported networks: ${networksNumber}
        🪙 Added assets: ${assetsNumber}
        👨‍👩‍👧‍👦 Multisig supported in: ${multisigNetworks}
        🥞 Staking supported in: ${stakingNumber}
    `
    return makrdownData
}
