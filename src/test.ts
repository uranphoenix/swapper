import { Connection, ParsedTransactionWithMeta, PublicKey, PartiallyDecodedInstruction, Transaction, VersionedTransaction } from "@solana/web3.js"
import { LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeysV4, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk"
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import PoolKeys from "./PoolKeys";
import RaydiumSwap from "./RaydiumSwap";
dotenv.config({ path: '../.env' });

const PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map((i) => parseInt(i))

//const poolKeysConnection = new Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed")
const connection = new Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed")
/*
benchmark to compare raydium vs jupiter swaps
track bros txs with volumes included
*/

// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
const RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112"
const RAYDIUM_POOL_V4_PROGRAM_ID_5Q = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"

const PUBLIC_KEY = new PublicKey(process.env.PUBLIC_KEY)



const poolKeys: PoolKeys = new PoolKeys(connection)
const raydiumSwapBuy = new RaydiumSwap(connection, PRIVATE_KEY)
const raydiumSwapSell = new RaydiumSwap(connection, PRIVATE_KEY)

let swapTx: Transaction | VersionedTransaction
let allPoolKeys: any
let targetPoolKeys: any

//configs
const targetMint = "BMTwySvon2H22SawT6m94ov1BwYgRH3RqiwBo5UPCNPr"
const loadOnly = true
const buy = false
const SOL_PRICE = 147.71
const ONE_TRADE = 0.5
const salePart = 1.0


async function perform() {
    console.log("Fetching raydium...")
    allPoolKeys = await loadPoolKeys()
    targetPoolKeys = findPoolInfoForTokens(targetMint, SOL_MINT_ADDRESS)
    if(!targetPoolKeys) {
        console.log("no pool keys found on raydium...")
        return
    }
    saveDictionaryAsJSON(targetPoolKeys, targetPoolKeys.baseMint)
    if(loadOnly) return
    await swap(targetPoolKeys)


    //if(!buyTx) {
    //    console.log("No buy tx")
    //    throw new Error("err")
    //}
    //const txId = await raydiumSwapBuy.sendVersionedTransaction(buyTx as VersionedTransaction)
    //console.log(`Buy transaction: https://solscan.io/tx/${txId}`)
    //console.log(JSON.stringify(txBuy, null, 2))
    //console.log("TX sell")
    //console.log(JSON.stringify(txSell, null, 2))
    //const poolData = poolKeys.findInstructionByProgramId(txBuy.transaction.message.instructions, new PublicKey("BMngim9SP6f4jQroP5JjoXY3FoBFFs3jwZvcvCbRgcWj")) as PartiallyDecodedInstruction|null;
    //console.log(poolKey.toString())
    //console.log(poolData.accounts[4].toString())
    //console.log(poolData.accounts.map((a) => a.toString()))
    //console.log(`${signature}, poolId 6: ${poolData.accounts[6].toString()}, poolId 10: ${poolData.accounts[10].toString()}`)
}

/*
async function getPoolKeys(targetMint: string) {
    const fileName = `new_pools/${targetMint}_poolInfo.json`;
    try{
        const poolKeys = jsonInfo2PoolKeys(JSON.parse(fs.readFileSync(fileName, 'utf-8'))) as LiquidityPoolKeysV4
        return poolKeys
    } catch(err) {
        //console.log("no such token pool keys found " + targetMint)
        //const poolKeys = jsonInfo2PoolKeys(JSON.parse(fs.readFileSync(fileName, 'utf-8'))) as LiquidityPoolKeysV4
    }   
}
*/

async function loadPoolKeys() {
    const liquidityJsonResp = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json')
    if (!liquidityJsonResp.ok) return []
    const liquidityJson: any = (await liquidityJsonResp.json());
    const allPoolKeysJson = [...(liquidityJson?.official ?? []), ...(liquidityJson?.unOfficial ?? [])];
  
    return allPoolKeysJson;
}

function saveDictionaryAsJSON(dictionary: Record<string, any>, baseMint: PublicKey): void {
    if(baseMint.toString() === SOL_MINT_ADDRESS) {
        console.log("Pool base vault is sol")
        return
    }
    const fileName = `new_pools/${baseMint.toString()}_poolInfo.json`;  // Using baseMint as part of the file name
    const jsonContent = JSON.stringify(dictionary, null, 2);

    fs.writeFileSync(fileName, jsonContent, 'utf-8');

    console.log(`Dictionary saved to ${fileName}`);
}
  
function findPoolInfoForTokens(mintA: string, mintB: string) {
    const poolData = allPoolKeys.find(
      (i) => (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA)
    )
    //console.log(poolData);
  
    if (!poolData) return null
  
    return jsonInfo2PoolKeys(poolData);
  }

async function swap(keys: LiquidityPoolKeysV4) {
    await createTranscations(buy, keys)
    setTimeout(async () => {
        if(!swapTx) {
            console.log("No tx")
            return
        }
        const txId = await raydiumSwapBuy.sendVersionedTransaction(swapTx as VersionedTransaction)
        console.log(`${buy ? "Buy ":"Sell "}transaction: https://solscan.io/tx/${txId}`)
    }, 3000)
}

async function createTranscations(buy: boolean, keys: LiquidityPoolKeysV4) {
    if(buy) {
        try{
            const {
                amountIn,amountOut,minAmountOut,currentPrice,executionPrice,priceImpact,fee
            } = await raydiumSwapBuy.calcAmountOut(
                keys,
                ONE_TRADE,
                false
            );
            console.log(`Buying token for ${ONE_TRADE} SOL`)
            console.log(1/(parseFloat(executionPrice.toSignificant())) * SOL_PRICE)
        } catch(err) {
            console.log(err.message)
            return
        }

        swapTx = await raydiumSwapBuy.getSwapTransaction(
            keys.baseMint.toString(),
            ONE_TRADE,
            keys,
            100000, // Max amount of lamports
            true,
            'in'
        );
    } else {
        const tokenAccount = await connection.getTokenAccountsByOwner(PUBLIC_KEY, {mint: keys.baseMint}, "confirmed")
        if(!tokenAccount.value[0]) {
            console.log("No token balance found")
            return
        }
        const amountBuySpl = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey, "confirmed")
        
        
        if(amountBuySpl.value.uiAmount == 0) {
            console.log("zero token balance present")
            return
        } 
        
        try{
            const {
                amountIn,amountOut,minAmountOut,currentPrice,executionPrice,priceImpact,fee
            } = await raydiumSwapBuy.calcAmountOut(
                keys,
                amountBuySpl.value.uiAmount,
                true
            );
            console.log(`Selling ${amountBuySpl.value.uiAmount} tokens`)
            console.log(parseFloat(executionPrice.toSignificant()) * SOL_PRICE)
        } catch(err) {
            console.log(err.message)
            return
        }
        
        
        swapTx = await raydiumSwapSell.getSwapTransaction(
            keys.quoteMint.toString(),
            amountBuySpl.value.uiAmount * salePart,
            keys,
            100000, // Max amount of lamports
            true,
            'in'
        );
    }

}

(async() => {
    await perform()
})()

async function checkVolume(preTokenBalances, postTokenBalances) {
    const preBalance = preTokenBalances.find((a) => {
        if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
            return true
        }
        return false
    })
    if(!preBalance) {
        return
    }
    const preSolBalance = preBalance.uiTokenAmount.uiAmount

    const postBalance = postTokenBalances.find((a) => {
        if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
            return true
        }
        return false
    })
    if(!postBalance) {
        return
    }
    const postSolBalance = postBalance.uiTokenAmount.uiAmount

    const volumeRaw = preSolBalance-postSolBalance
}

