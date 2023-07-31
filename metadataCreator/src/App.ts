import fs from 'fs'
import { ChainArray } from "./models/Chain";
import { calculateMultisigData } from "./utils/apiUtils";
import { buildMarkdownHeader, markdownChainsTable, markdownMultisigTable } from "./utils/markdownUtils";


async function buildMetadataMarkdown() {
    try {

        // Sort list in alphabet order
        const chains = new ChainArray('../chains/v1/chains.json')
        const sortedChains = chains.generateChainsObject()

        // Await each async function call
        const multisigData = await calculateMultisigData(sortedChains);
        const markdownMultisig = markdownMultisigTable(multisigData);
        const markdownMetaHeader = buildMarkdownHeader(
            chains.getLength(),
            chains.getAsssetsNumber(),
            multisigData.getNetworks().length,
            chains.getStakingNumber()
        );
        const markdownChains = markdownChainsTable(sortedChains);

        // Corrected file write using string concatenation
        fs.writeFileSync('../chains/v1/README.md', markdownMetaHeader + markdownMultisig + markdownChains);
        await chains.disconnectAll()
        process.exit(0)
    } catch (error) {
        console.error(error);
    }
}

buildMetadataMarkdown();