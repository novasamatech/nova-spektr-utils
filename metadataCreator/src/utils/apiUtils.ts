import { Chain} from "../models/Chain";
import { MultisigVersionStorage } from "../multisigVersionStorage";


export async function calculateMultisigData(chains: Chain[]): Promise<MultisigVersionStorage> {
    const multisigStorage = new MultisigVersionStorage()

    await Promise.all(chains.map(async element => {
        await element.createAPI();
        const multisigInstance = element.api?.registry.getModuleInstances(
            element.api?.runtimeVersion.specName.toString(), 'multisig');

        if (multisigInstance) {
            multisigStorage.addNetwork({
                name: element.name,
                version: (await element.api?.query.multisig.palletVersion())?.toString()
            })
            console.log(`Network: ${element.name} has Multisig version:` + (await element.api?.query.multisig.palletVersion())?.toString())
        }
    }));

    return multisigStorage;
}
