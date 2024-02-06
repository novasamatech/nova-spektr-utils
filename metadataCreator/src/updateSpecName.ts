import fs from "fs";
import { Chain } from "./models/Chain";

const BASE_RELAYCHAINS: { [key: string]: string } = {
    '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': 'polkadot',
    '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe': 'kusama',
    '0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e': 'westend'
};

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
                    chain.explorers,
                    chain.parentId
                )
            );
        });

        const newJson = await Promise.all(
            chains.map(async (chain, index) => {
                let specName = BASE_RELAYCHAINS[chain.chainId] || (chain.parentId ? BASE_RELAYCHAINS[chain.parentId] : null);

                if (!specName) {
                    await chain.createAPI();
                    specName = chain.api?.runtimeVersion.specName.toString() ?? null;
                }

                return specName
                    ? {
                        ...Object.keys(jsonChains[index]).reduce((obj, key) => {
                            if (key === 'name') {
                                return { ...obj, [key]: jsonChains[index][key], specName };
                            } else {
                                return { ...obj, [key]: jsonChains[index][key] };
                            }
                        }, {}),
                    }
                    : { ...jsonChains[index] };
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
