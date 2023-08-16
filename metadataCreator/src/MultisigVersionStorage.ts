type MultisigNetwork = {
    name: string;
    version?: string;
  };

export class MultisigVersionStorage {
    private networks: MultisigNetwork[] = [];

    getNetworks(): MultisigNetwork[] {
        return this.networks;
    }

    addNetwork(network: MultisigNetwork): void {
        this.networks.push(network);
    }
}
