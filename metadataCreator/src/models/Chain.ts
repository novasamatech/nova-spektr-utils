import fs from 'fs'
import { ApiPromise, WsProvider } from '@polkadot/api';

export class Asset {
    assetId: number;
    symbol: string;
    precision: number;
    priceId?: string;
    staking?: string;
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
    extrinsic?: string;
    account?: string;
    event?: string;
    multisig?: string;

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
    history?: Api[];

    constructor(staking: Api[], history?: Api[]) {
        this.staking = staking;
        this.history = history;
    }

    static fromJSON(json: any): ExternalApi {
        const staking = json?.staking?.map((apiJson: any) => Api.fromJSON(apiJson));
        const history = json?.history?.map((apiJson: any) => Api.fromJSON(apiJson));
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
    parentId?: string;
    name: string;
    specName?: string; 
    assets: Asset[];
    nodes: NodeElement[];
    explorers?: Explorer[];
    icon: string;
    addressPrefix: number;
    externalApi?: ExternalApi;
    api?: ApiPromise;

    constructor(
        chainId: string,
        name: string,
        assets: Asset[],
        nodes: NodeElement[],
        icon: string,
        addressPrefix: number,
        externalApi?: ExternalApi,
        explorers?: Explorer[],
        parentId?: string
    ) {
        this.chainId = chainId;
        this.name = name;
        this.assets = assets;
        this.nodes = nodes;
        this.explorers = explorers;
        this.icon = icon;
        this.addressPrefix = addressPrefix;
        this.externalApi = externalApi;
        this.parentId = parentId;
    }

    static fromJSON(json: any): Chain {
        const assets = json.assets.map((assetJson: any) => Asset.fromJSON(assetJson));
        const nodes = json.nodes.map((nodeJson: any) => NodeElement.fromJSON(nodeJson));
        const explorers = json?.explorers?.map((explorerJson: any) => Explorer.fromJSON(explorerJson));
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
        for (const node of this.nodes) {
            try {
                const api = await this.wrapApiWithTimer(node);

                if (api?.isConnected) {
                    this.api = api;
                    break;
                }
            } catch (error) {
                console.error(`Failed to connect to node at ${node.url}:`, error);
            }
        }
    }


    private async wrapApiWithTimer(node: NodeElement): Promise<ApiPromise | void> {
        const wsProvider = new WsProvider(node.url);

        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<void>((_, reject) => {
            timeoutId = setTimeout(() => {
                wsProvider.disconnect();
                reject(new Error(`Connection timeout for ${node.url}`));
            }, 20_000);
        });

        const apiPromise = ApiPromise.create({ provider: wsProvider });

        try {
            const api = await Promise.race([apiPromise, timeoutPromise]);
            if (api?.isConnected) {
                return api;
            } else {
                throw new Error(`API is not connected for ${node.url}`);
            }
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    public async fillSpecName() {
        await this.createAPI();
        this.specName = this.api?.runtimeVersion.specName.toString();
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
                if (asset.hasOwnProperty('staking') && asset.staking == 'relaychain') {
                    count++;
                }
            }
        }

        return count;
    }
}
