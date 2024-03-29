import { Chain } from "../models/Chain";
import { MultisigVersionStorage } from "../models/MultisigVersionStorage";


export async function calculateMultisigData(chains: Chain[]): Promise<MultisigVersionStorage> {
    const multisigStorage = new MultisigVersionStorage()

    await Promise.all(chains.map(async element => {
        await element.createAPI();
        const multisigInstance = element.api?.registry.getModuleInstances(
            element.api?.runtimeVersion.specName.toString(), 'multisig');

        if (multisigInstance) {
            const multisigVersion = (await element.api?.query.multisig.palletVersion())?.toString()
            multisigStorage.addNetwork({name:element.name, version:multisigVersion})
            console.log(`Network: ${element.name} has Multisig version:` + multisigVersion)
        }
    }));

    return multisigStorage;
}
