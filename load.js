import * as nearAPI from "near-api-js";
import * as cg from "coingecko-api-v3";

const CONTRACT_ID = "social.near";
const ETHEREUM_NETWORK_ID = "ethereum";
const FETCH_TIMEOUT = 7000;

async function connect() {
    const config = {
        networkId: "mainnet",
        keyStore: new nearAPI.keyStores.InMemoryKeyStore(),
        nodeUrl: "https://rpc.mainnet.near.org",
        walletUrl: "https://wallet.mainnet.near.org",
        helperUrl: "https://helper.mainnet.near.org",
        explorerUrl: "https://explorer.mainnet.near.org",
    };
    const near = await nearAPI.connect(config);
    const account = await near.account(CONTRACT_ID);

    const contract = new nearAPI.Contract(
        account, // the account object that is connecting
        CONTRACT_ID, // name of contract you're connecting to
        {
            viewMethods: ["get"], // view methods do not change state but usually return a value
            changeMethods: [], // change methods modify state
            sender: account, // account object to initialize and sign transactions.
        }
    );

    return contract;
}

// load data from the social-db
const contract = await connect();
const data = await contract.get({ keys: ["zavodil.near/tokens-db/*"] });
const tokens = data["zavodil.near"]["tokens-db"];

// init coingecko client
const client = new cg.CoinGeckoClient({
    timeout: 5000,
    autoRetry: false,
});

let res = {};
for (let i = 0; i < Object.keys(tokens).length; i++) {
    const tokenId = Object.keys(tokens)[i];

    try {
        // load data from coingecko
        const data = await client.contract({
            id: ETHEREUM_NETWORK_ID,
            contract_address: tokenId,
        });
        // format output
        const tokenData = {
            name: data["name"],
            symbol: data["symbol"],
            icon: data["image"]?.["thumb"],
            decimals: data["detail_platforms"]?.[ETHEREUM_NETWORK_ID]?.["decimal_place"],
            price: data["market_data"]?.["current_price"]?.["usd"],
        };
        // store output
        res[tokenId] = tokenData;

        // add timeout to avoid rate limits
        await new Promise((resolve) => {
            setTimeout(resolve, FETCH_TIMEOUT); 
        });
    } catch (ex) {
        console.error(tokenId, ex)
    }
}

// output results
console.log(
    JSON.stringify({
        timestamp: Date.now(),
        data: res,
    })
);
