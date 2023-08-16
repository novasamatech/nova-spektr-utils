export class MultisigNetwork {
    private name: string;
    private version: string | undefined;

    constructor(name: string, version: string | undefined) {
        this.name = name;
        this.version = version;
    }

    getName(): string {
        return this.name;
    }

    getVersion(): string | undefined {
        return this.version;
    }

    setVersion(version: string | undefined): void {
        this.version = version;
    }
}

export class MultisigVersionStorage {
    private networks: MultisigNetwork[] = [];

    getNetworks(): MultisigNetwork[] {
        return this.networks;
    }

    addNetwork(network: MultisigNetwork): void {
        this.networks.push(network);
    }
}
