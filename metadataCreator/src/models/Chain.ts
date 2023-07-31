import fs from 'fs'
import { ApiPromise, WsProvider } from '@polkadot/api';

export class Asset {
    assetId: number;
    symbol: string;
    precision: number;
    priceId: string | undefined;
    staking: string | undefined;
    icon: string;
    name: string;

    constructor(
        assetId: number,
        symbol: string,
        precision: number,
        icon: string,
        name: string,
        priceId?: string,
        staking?: string,
    ) {
        this.assetId = assetId;
        this.symbol = symbol;
        this.precision = precision;
        this.priceId = priceId;
        this.staking = staking;
        this.icon = icon;
        this.name = name;
    }

    static fromJSON(json: any): Asset {
        return new Asset(
            json.assetId,
            json.symbol,
            json.precision,
            json.priceId,
            json.staking,
            json.icon,
            json.name
        );
    }
}

export class Explorer {
    name: string;
    extrinsic: string | undefined;
    account: string | undefined;
    event: string | undefined;
    multisig: string | undefined;

    constructor(
        name: string,
        extrinsic?: string,
        account?: string,
        event?: string,
        multisig?: string
    ) {
        this.name = name;
        this.extrinsic = extrinsic;
        this.account = account;
        this.event = event;
        this.multisig = multisig;
    }

    static fromJSON(json: any): Explorer {
        return new Explorer(
            json.name,
            json.extrinsic,
            json.account,
            json.event,
            json.multisig
        );
    }
}

export class Api {
    type: string;
    url: string;

    constructor(type: string, url: string) {
        this.type = type;
        this.url = url;
    }

    static fromJSON(json: any): Api {
        return new Api(json.type, json.url);
    }
}

export class ExternalApi {
    staking: Api[];
    history: Api[] | undefined;

    constructor(staking: Api[], history?: Api[]) {
        this.staking = staking;
        this.history = history;
    }

    static fromJSON(json: any): ExternalApi {
        const staking = json.staking.map((apiJson: any) => Api.fromJSON(apiJson));
        const history = json.history.map((apiJson: any) => Api.fromJSON(apiJson));
        return new ExternalApi(staking, history);
    }
}

export class NodeElement {
    name: string;
    url: string;

    constructor(name: string, url: string) {
        this.name = name;
        this.url = url;
    }

    static fromJSON(json: any): NodeElement {
        return new NodeElement(json.name, json.url);
    }
}


export class Chain {
    chainId: string;
    name: string;
    assets: Asset[];
    nodes: NodeElement[];
    explorers: Explorer[] | undefined;
    icon: string;
    addressPrefix: number;
    externalApi: ExternalApi | undefined;
    api: ApiPromise | undefined;

    constructor(
        chainId: string,
        name: string,
        assets: Asset[],
        nodes: NodeElement[],
        icon: string,
        addressPrefix: number,
        externalApi?: ExternalApi,
        explorers?: Explorer[]
    ) {
        this.chainId = chainId;
        this.name = name;
        this.assets = assets;
        this.nodes = nodes;
        this.explorers = explorers;
        this.icon = icon;
        this.addressPrefix = addressPrefix;
        this.externalApi = externalApi;
    }

    static fromJSON(json: any): Chain {
        const assets = json.assets.map((assetJson: any) => Asset.fromJSON(assetJson));
        const nodes = json.nodes.map((nodeJson: any) => NodeElement.fromJSON(nodeJson));
        const explorers = json.explorers.map((explorerJson: any) => Explorer.fromJSON(explorerJson));
        const externalApi = ExternalApi.fromJSON(json.externalApi);
        return new Chain(
            json.chainId,
            json.name,
            assets,
            nodes,
            json.icon,
            json.addressPrefix,
            externalApi,
            explorers,
        );
    }

    /**
     * createAPI will return polkadot.js/api object
     */
    public async createAPI() {
        let connected = false;
        let index = 0;

        while (!connected) {
            try {
                // Skip first node for edgeware, it stuck with connect state and won't through error even if throwOnConnect is true
                if (this.name == "Edgeware") {
                    index++
                }


                const wsProvider = new WsProvider(this.nodes[index].url);
                index = (index + 1) % this.nodes.length;
                const api = await ApiPromise.create({ provider: wsProvider });

                if (api.isConnected) {
                    this.api = api;
                    connected = true;
                } else {
                    await api.disconnect();
                }
            } catch (error) {
                console.error(console.error());
            }
        }
    }
}


export class ChainArray {
    chains: Chain[] = []
    protected chainsFilePath: string

    constructor(chainsFilePath: string) {
        this.chainsFilePath = chainsFilePath
    }

    /**
     * This method generate an object of chains file
     */
    public generateChainsObject(): Chain[] {
        // Read the JSON file from local directory
        const jsonData = fs.readFileSync(this.chainsFilePath);
        const jsonChains = JSON.parse(jsonData.toString());
        jsonChains.forEach((chain: any) => {

            this.chains.push(new Chain(
                chain.chainId,
                chain.name,
                chain.assets,
                chain.nodes,
                chain.icon,
                chain.addressPrefix,
                chain.externalApi,
                chain.explorers
            ))
        })

        return this.sortChains(this.chains)
    }

    /**
     * disconnectAll
     */
    public async disconnectAll(): Promise<void[]> {
        return await Promise.all(this.chains.map(async chain => {
            await chain.api?.disconnect()
        }));
    }


    private sortChains(chainsList: Chain[]) {
        chainsList.sort((a, b) => {
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

        return chainsList
    }

    /**
     * Return number of networks
     */
    public getLength() {
        return this.chains.length
    }

    /**
     * Return number of assets
     */
    public getAsssetsNumber() {
        let totalAssets = 0;

        for (const chain of this.chains) {
            totalAssets += chain.assets.length;
        }

        return totalAssets;
    }

    /**
     * Return number of networks were staking is available
     */
    public getStakingNumber() {
        let count = 0;

        for (const chain of this.chains) {
            for (const asset of chain.assets) {
                if (asset.hasOwnProperty('staking')) {
                    if (asset.staking == 'relaychain') {
                        count++;
                    }
                }
            }
        }

        return count;
    }
}
