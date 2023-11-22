type MultisigNetwork = {
    name: string;
    version?: string;
};

export class MultisigVersionStorage {
    private networks: MultisigNetwork[] = [];

    getNetworks(): MultisigNetwork[] {
        return this.sortNetworks(this.networks);
    }
    private sortNetworks(networkList: MultisigNetwork[]) {
        networkList.sort((a, b) => {
            const aName = a.name;
            const bName = b.name;

            // Check if aName and bName start with a number
            const aStartsWithNumber = /^\d/.test(aName);
            const bStartsWithNumber = /^\d/.test(bName);

            if (aStartsWithNumber && bStartsWithNumber) {
                // If both names start with a number, compare them normally
                return aName.localeCompare(bName);
            } else if (aStartsWithNumber) {
                // If aName starts with a number, place it after bName
                return 1;
            } else if (bStartsWithNumber) {
                // If bName starts with a number, place it before aName
                return -1;
            } else {
                // If neither name starts with a number, compare them normally
                return aName.localeCompare(bName);
            }
        });

        return networkList
    }

    addNetwork(network: MultisigNetwork): void {
        this.networks.push(network);
    }
}
