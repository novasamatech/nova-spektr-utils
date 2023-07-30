class MultisigVersionStorage {
  private networks: { name: string, version: string }[];

  constructor(networks: { name: string, version: string }[]) {
    this.networks = networks;
  }

  setNetworks(networks: { name: string, version: string }[]): void {
    this.networks = networks;
  }

  getNetworks(): { name: string, version: string }[] {
    return this.networks;
  }

  addNetwork(network: { name: string, version: string }): void {
    this.networks.push(network);
  }
}
