import axios from 'axios';
import yaml from 'js-yaml';
import { Chain } from "../models/Chain";
import { MultisigVersionStorage } from "../models/MultisigVersionStorage";

const repoUrl = 'https://api.github.com/repos/novasamatech/subquery-proxy/contents/';

async function fetchYamlFiles(): Promise<any[]> {
    const response = await axios.get(repoUrl);
    const files = response.data.filter((file: any) => file.name.endsWith('.yaml'));

    const yamlData = await Promise.all(files.map(async (file: any) => {
        const fileResponse = await axios.get(file.download_url);
        return yaml.load(fileResponse.data);
    }));

    return yamlData;
}

export async function calculateMultisigData(chains: Chain[]): Promise<MultisigVersionStorage> {
    const yamlData = await fetchYamlFiles();
    const multisigStorage = new MultisigVersionStorage()

    const filteredChains = chains.filter(chain => 
        yamlData.some(yamlChain => yamlChain.network.chainId === chain.chainId)
    );

    await Promise.all(filteredChains.map(async element => {
        await element.createAPI();
        const multisigInstance = element.api?.registry.getModuleInstances(
            element.api?.runtimeVersion.specName.toString(), 'multisig');

        if (multisigInstance) {
            const multisigVersion = (await element.api?.query.multisig.palletVersion())?.toString();
            multisigStorage.addNetwork({ name: element.name, version: multisigVersion });
            console.log(`Network: ${element.name} has Multisig version:` + multisigVersion);
        }
    }));

    return multisigStorage;
}
