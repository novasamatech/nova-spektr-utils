import { Chain} from "../models/Chain";

export async function calculateMultisigData(chains: Chain[]): Promise<Array<MultisigVersionStorage>> {
    const networkWithMultisig: MultisigVersionStorage[] = []
    chains.forEach(element => {
        console.log(element)
    });

    return networkWithMultisig
}