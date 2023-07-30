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
        const markdownMetaHeader = await buildMarkdownHeader(
            0,
            0,
            0,
            0
        );
        const markdownMultisig = await markdownMultisigTable();
        const markdownChains = markdownChainsTable(sortedChains);

        // Corrected file write using string concatenation
        fs.writeFileSync('./chains/v1/README.md', markdownMetaHeader + markdownMultisig + markdownChains);
    } catch (error) {
        console.error(error);
    }
}

buildMetadataMarkdown();