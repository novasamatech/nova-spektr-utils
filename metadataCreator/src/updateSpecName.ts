import fs from "fs";
import { Chain } from "./models/Chain";

async function updateSpecName(url: string) {
    try {
        const jsonData = fs.readFileSync(url);
        const jsonChains = JSON.parse(jsonData.toString());

        const chains = [] as Chain[];

        jsonChains.forEach((chain: any) => {
            chains.push(
                new Chain(
                    chain.chainId,
                    chain.name,
                    chain.assets,
                    chain.nodes,
                    chain.icon,
                    chain.addressPrefix,
                    chain.externalApi,
                    chain.explorers
                )
            );
        });

        const newJson = await Promise.all(
            chains.map(async (chain, index) => {
                await chain.createAPI();

                return {
                    ...jsonChains[index],
                    specName: chain.api?.runtimeVersion.specName.toString(),
                };
            })
        );

        // Corrected file write using string concatenation
        try {
            fs.writeFileSync(
                url,
                JSON.stringify(newJson, null, 4)
            );
        } catch (error) {
            console.log(
                "Error: ",
                error || "🛑 Something went wrong in writing file"
            );
        }

        await Promise.all(
            chains.map(async (chain) => {
                await chain.api?.disconnect();
            })
        );

    } catch (error) {
        console.error(error);
    }
}

Promise.all([
    updateSpecName("../chains/v1/chains_dev.json"),
    updateSpecName("../chains/v1/chains.json")
]).then(() => process.exit(0));
