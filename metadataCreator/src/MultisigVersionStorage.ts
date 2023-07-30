export class MultisigVersionStorage {
    private networks: { name: string, version: string | undefined }[] = [];

    getNetworks(): { name: string, version: string | undefined }[] {
        return this.networks;
    }

    addNetwork(network: { name: string, version: string | undefined }): void {
        this.networks.push(network);
    }
}
