import { AccountInfo, LAMPORTS_PER_SOL, Connection, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey, RpcResponseAndContext, TokenAmount, VersionedTransaction } from "@solana/web3.js"
import { LIQUIDITY_STATE_LAYOUT_V4, Liquidity, LiquidityPoolKeysV4 } from "@raydium-io/raydium-sdk"
import * as fs from 'fs';

import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

/*
if more than 4k volume buy dependless on liquidity(or if liquidity > 20k) delete this
at least 10 txs
set upper liquidity boundary to 5000
if time passes and 100% not reached - sell
if -80% reached sell
track volumes for some time, if increasing, buy
NaN obtained for growth
if falls more than -60 after "buy" -> market sell
if 5m no growth (100%) sell
-----------------
add checking for liquidity before buy
*/

import RaydiumSwap from './RaydiumSwap'
import PoolKeys from "./PoolKeys";

const RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const RAYDIUM_POOL_V4_PROGRAM_ID_5Q = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112"
const PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map((i) => parseInt(i))
const PUBLIC_KEY = new PublicKey(process.env.PUBLIC_KEY)

const trackingTime = 36000000
const onePoolTrackingTime = 30000
const onePoolPriceTrackingTime = 5400000
const maxWeakTradeTime = 400000
const clearVolumeTrackingTime = 180000
const noActivityForLongTime = 1800000
const minSolanaVolume = 4.5
const SOL_PRICE = 127.9
const ONE_TRADE = 0.02
const FIRST_TAKE = 400
const FIRST_AMOUNT = 1
const SECOND_TAKE = 500
const SECOND_AMOUNT = 0.5
const THIRD_TAKE = 1000
const THIRD_AMOUNT = 1
const LOWER_LIQUIDITY = 500
const UPPER_LIQUIDITY = 20000
const volumes = {}
const trades = {}
const priceCheckers: Array<NodeJS.Timeout> = []
const poolsClosedByTime: Array<string> = []

const onLogsIds: Array<number> = []
const seenTransactions: Array<string> = []

const poolActivityConnection = new Connection("https://young-holy-wind.solana-mainnet.quiknode.pro/a083d935a747abe09c2f408f19dbde37eb19c761/", "confirmed");
const volumeConnection = new Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", "confirmed");
const newPoolsConnection = new Connection( 
    "https://boldest-prettiest-water.solana-mainnet.quiknode.pro/467f79bc0d43e22464295523012978be5babd16e/", 
    {wsEndpoint: "wss://boldest-prettiest-water.solana-mainnet.quiknode.pro/467f79bc0d43e22464295523012978be5babd16e/",
     commitment: "confirmed"});
const newPoolTransactionConnection = new Connection("https://attentive-aged-hexagon.solana-mainnet.quiknode.pro/b1c3ae52eb51984781aed8cede1da4e34bde3625/", "confirmed")
const poolKeysConnection = new Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed")
const swapConnection = new Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed")
const liquidityConnection = new Connection("https://solitary-morning-shadow.solana-mainnet.quiknode.pro/e08e7c4c05bbbde0beb8a79c77558fe5882308b2/", "confirmed")
const priceConnection = new Connection(
    "https://bitter-twilight-moon.solana-mainnet.quiknode.pro/bfc04aa1f52ba227fc0818642ea6d61ebbd0327b/", 
    {wsEndpoint: "wss://bitter-twilight-moon.solana-mainnet.quiknode.pro/bfc04aa1f52ba227fc0818642ea6d61ebbd0327b/", commitment: "confirmed"})

const poolKeys = new PoolKeys(poolKeysConnection)
const raydiumSwap = new RaydiumSwap(swapConnection, PRIVATE_KEY)

let readNew = true
let lastDate = Date.now()

function subscribeToNewRaydiumPools() : void {
    console.log(`Program started working at ${(new Date()).toLocaleString()}`)
    
    
    newPoolsConnection.onLogs(new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async ({ logs, err, signature }) => {
        if(!readNew) return
        if (err) return;
        if (seenTransactions.includes(signature)) {
            return;
        }
        if (!(logs && (
            logs.some(log => log.includes("initialize2")) || 
            logs.some(log => log.includes("init_pc_amount"))
            )
            )) {

            return;
        }
        
        console.log("new pool created, signature - " + signature)
        let tx: ParsedTransactionWithMeta
        for(let i = 0; i < 3; i++) {
            tx = await getTransaction(signature)
            if(tx) {
                break
            }
        }
        if(!tx) {
            console.log(`no transaction for ${signature}`)
            return
        }

        seenTransactions.push(signature)
        const initInstruction = poolKeys.findInstructionByProgramId(tx.transaction.message.instructions, new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as PartiallyDecodedInstruction|null;
        if (!initInstruction) {
            console.log('Failed to find lp init instruction in lp init tx')
            return
        }
        const poolKey = initInstruction.accounts[4]

        try{
            await processPool(poolKey, tx)
        } catch (err) {
            console.log(err.message + " for pool " + poolKey + ", signature: " + signature)
            //console.log(tx)
            //console.log(tx.transaction.message.accountKeys)
            return
        }
    },
    "confirmed");
    setTimeout(() => {stopNewReadings()}, trackingTime)
    setTimeout(() => {readNew = false}, trackingTime - 3600000)
}

async function getTransaction(signature: string) {
    let parsedTransaction: ParsedTransactionWithMeta
    try{
        parsedTransaction = await newPoolTransactionConnection.getParsedTransaction(signature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})
    } catch (err) {
        return
    }
    return parsedTransaction
}

async function processPool(poolKey: PublicKey, tx: ParsedTransactionWithMeta) {
    const liquidity = await checkLiquidity(poolKey, true, true)
    if(liquidity === 0 || isNaN(liquidity)) {
        console.log(tx.transaction.signatures[0] + " - bad pool key at " + (new Date()).toLocaleString())
        return
    }
    const price = await checkPrice(poolKey)
    console.log(`Added pool to track with ${liquidity * SOL_PRICE} liquidity, poolKey: ${poolKey.toString()} at ${(new Date()).toLocaleString()}`)
    addPoolTracking(poolKey, liquidity, tx, price)
    const keys = await poolKeys.fetchPoolKeysForLPInitTransaction(volumes[poolKey.toString()].created)
    saveDictionaryAsJSON(keys, keys.baseMint)
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

async function checkLiquidity(poolKey: PublicKey, print: boolean, includeUpper: boolean) {
    let quoteTokenAmount: RpcResponseAndContext<TokenAmount>
    
    try{
        const info = await liquidityConnection.getAccountInfo(poolKey, "confirmed")
        if (!info) {
            console.log("no liquidity info((")
            return 0
        }
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data)
        quoteTokenAmount = await liquidityConnection.getTokenAccountBalance(
            poolState.quoteVault
        );
    } catch (err) {
        console.log(err.message + " for " + poolKey.toString())
        return 0
    }
    
    const quote = quoteTokenAmount.value.uiAmount
    const liquidity = quote * 2

    const statement = includeUpper ? (liquidity * SOL_PRICE > UPPER_LIQUIDITY) : false
    
    if(liquidity * SOL_PRICE < LOWER_LIQUIDITY || statement) {
        if(print) console.log(`Insufficient liquidity for ${poolKey.toString()}: ${liquidity * SOL_PRICE}$`)
        return 0
    }
    return liquidity
}

async function checkPrice(poolKey: PublicKey) {
    try{
        const info = await priceConnection.getAccountInfo(poolKey, "confirmed")
        if (!info) {
            console.log("no price info((")
            return
        }

        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data)
        const quoteTokenAmount = await priceConnection.getTokenAccountBalance(
            poolState.quoteVault
        );
        const baseTokenAmount = await priceConnection.getTokenAccountBalance(
            poolState.baseVault
        );
        if(!quoteTokenAmount.value.uiAmount || !baseTokenAmount.value.uiAmount) return
        return quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount
    } catch(err) {
        console.log(err.message + " for " + poolKey.toString())
        return
    }
}

async function checkBuyPrice(mint: PublicKey) {
    const tokenAccount = await poolKeysConnection.getTokenAccountsByOwner(PUBLIC_KEY, {mint: mint}, "confirmed")
    const amount = await poolKeysConnection.getTokenAccountBalance(tokenAccount.value[0].pubkey, "confirmed")
    const price = ONE_TRADE/amount.value.uiAmount*SOL_PRICE
    //console.log(`Bought ${Math.round(amount.value.uiAmount*1000)/1000} tokens at ${price}$`)
    return price
}

function addPoolTracking(poolKey: PublicKey, liquidity: number, creationTransaction: ParsedTransactionWithMeta, price: number) {
    const poolId = poolKey.toString()
    volumes[poolId] = {
        created: creationTransaction,
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
        transactions: 0,
        liquidity: liquidity,
        start: Date.now(),
        volumeCheckingStartPrice: price,
        trackings: 0
    }
    const onLogsId = poolActivityConnection.onLogs(poolKey, async ({ logs, err, signature }) => {
        if(volumes[poolId].liquidity === 0) return
        if(err) return
        //check if pool is on tracking
        if(!onLogsIds.includes(onLogsId)) {
            return
        }
        let tx: ParsedTransactionWithMeta
        try{
            tx = await volumeConnection.getParsedTransaction(signature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})
        } catch (err) {
            return
        }
        if(!tx) {
            return
        }
        if((tx.blockTime*1000 - volumes[poolId].created.blockTime*1000) < 5000) {
            return
        }
        const preBalance = tx.meta.preTokenBalances.find((a) => {
            if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
                return true
            }
            return false
        })
        if(!preBalance) {
            return
        }
        const preSolBalance = preBalance.uiTokenAmount.uiAmount

        const postBalance = tx.meta.postTokenBalances.find((a) => {
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

        //check if tx contains any balance changes
        if(Math.abs(volumeRaw) > 15) return;

        //check if pool still on tracking
        if(!onLogsIds.includes(onLogsId)) {
            return
        }

        //set first tx time if havent done yet
        if(!volumes[poolId].firstTxTime) {
            volumes[poolId].firstTxTime = tx.blockTime * 1000
        }
        volumes[poolId].lastTxTime = tx.blockTime * 1000

        volumes[poolId].volume += (Math.abs(volumeRaw))

        //pool has less SOL now
        if (volumeRaw > 0) {
            volumes[poolId].buyVolume += volumeRaw
        //pool has more SOL now
        } else {
            volumes[poolId].sellVolume += (-volumeRaw)
        }
        volumes[poolId].transactions += 1

        //check if pool is tracked for more than time defined
        if((tx.blockTime * 1000 - volumes[poolId].firstTxTime) > onePoolTrackingTime) {
            let price: any
            if(volumes[poolId].secondChancePool) {
                price = await checkVolume(poolKey, poolId, false)
            } else {
                price = await checkVolume(poolKey, poolId, true)
            }
            
            if(price === -1) {
                if(volumes[poolId].liquidity === 0) return
                volumes[poolId].liquidity = 0
                const cleared = await clearVolumeTracking(poolId, onLogsId)
                if(cleared) {
                    console.log("Price dropped too much for " + poolId)
                }
                return
            }
            else if(price === -5) {
                console.log("No price obtained, closing trade " + poolId)
                return
            }
            else if(price && volumes[poolId].transactions >= 10) {
                await clearVolumeTracking(poolId, onLogsId)
                const keys = await poolKeys.fetchPoolKeysForLPInitTransaction(volumes[poolId].created)
                if(volumes[poolId].startPrice) return
                console.log("Sufficient volume, searching for pool keys " + poolId)
                volumes[poolId].startPrice = price
                volumes[poolId].maxPrice = price
                await addTrade(keys, price)
            }
            else if(volumes[poolId].trackings < 3) {
                if(volumes[poolId].firstTxTime === tx.blockTime * 1000) return
                console.log(`Volume for ${poolId} is insufficient: ${volumes[poolId].volume}, trying one more time`)
                volumes[poolId].firstTxTime = tx.blockTime * 1000
                volumes[poolId].trackings += 1
                volumes[poolId].previousVolume = volumes[poolId].volume
                volumes[poolId].volume = 0
                volumes[poolId].transactions = 0
                volumes[poolId].sellVolume = 0
                volumes[poolId].buyVolume = 0
                volumes[poolId].secondChancePool = true
            } else {
                if(volumes[poolId].liquidity === 0) return
                volumes[poolId].liquidity = 0
                const cleared = await clearVolumeTracking(poolId, onLogsId)
                if(cleared) {
                    console.log(`Insufficient volume for ${poolKey}: ${volumes[poolId].volume} tried ${volumes[poolId].trackings + 1} times`)
                }
            }
        }
    },
    "confirmed")
    //console.log(onLogsId)
    onLogsIds.push(onLogsId)
    setTimeout(async () => {
        const cleared = await clearVolumeTracking(poolId, onLogsId)
        if(cleared) {
            volumes[poolId].liquidity = 0
        }
    }, clearVolumeTrackingTime)
}

async function clearVolumeTracking(poolId: string, onLogsId: number) {
    if(onLogsIds.includes(onLogsId)) {
        volumes[poolId].finish = Date.now()
        poolActivityConnection.removeOnLogsListener(onLogsId)
        onLogsIds.splice(onLogsIds.indexOf(onLogsId), 1)
        console.log("stopped tracking pool " + poolId + " at " + (new Date()).toLocaleString())
        return true
    }
    return false
}

//if sufficient returns current price else false
async function checkVolume(poolKey: PublicKey, poolId: string, includeUpper: boolean) {
    const liquidity = await checkLiquidity(poolKey, false, false)
    const price = await checkPrice(poolKey)
    if(!price) {
        return -5
    }
    if(liquidity === 0) {
        return -1
    }
    if((price - volumes[poolId].volumeCheckingStartPrice)/volumes[poolId].volumeCheckingStartPrice < -0.7) {
        return -1
    }
    const statement = includeUpper ? (volumes[poolId].volume/volumes[poolId].liquidity < 0.8) : true
    if(!(volumes[poolId].liquidity === 0) && 
    (volumes[poolId].volume/volumes[poolId].liquidity > 0.15 &&
    statement && 
    volumes[poolId].volume > minSolanaVolume)
    ) {
        return price
    } else {
        //console.log(`Insufficient volume for ${poolKey}: ${volumes[poolId].volume/volumes[poolId].liquidity}`)
        return false
    }
}

async function addTrade(keys: LiquidityPoolKeysV4, price: number) {
    let txid: string
    
    try {
        //txid = await buyToken(keys, true, true, ONE_TRADE)
        volumes[keys.id.toString()].bought = volumes[keys.id.toString()].liquidity
        setTimeout(async () => {
            await processBuyTx("****", keys, price)
        }, 15000)
    } catch(err) {
        console.log("error happened during swap: " + err.message)
    }
}

async function processBuyTx(txid: string, keys: LiquidityPoolKeysV4, price: number) {
    const poolId = keys.id.toString()
    /*
    let buyTx: ParsedTransactionWithMeta
    
    try {
        buyTx = await swapConnection.getParsedTransaction(txid, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})
        if(!buyTx || buyTx.meta.err) {
            console.log("Buy ransaction returned error, " + txid)
            return
        }
    } catch(err) {
        console.log("error happened during processing buy transaction: " + err.message)
    }
            
    console.log(`successfully bought at price of ${price * SOL_PRICE}`)
    console.log(`https://solscan.io/tx/${txid}`)
    
    const buyTime = buyTx.blockTime*1000
    const tokenAAmount = ONE_TRADE

    const tokenAccount = await poolKeysConnection.getTokenAccountsByOwner(PUBLIC_KEY, {mint: keys.baseMint}, "confirmed")
    const amountBuySpl = await poolKeysConnection.getTokenAccountBalance(tokenAccount.value[0].pubkey, "confirmed")
    const calculatedPrice = await checkPrice(keys.id) 
    if(!amountBuySpl) {
        console.log("NO TOKEN AMOUNT DETECTED AFTER BUY TX, " + keys.baseMint + '. ' + txid)
        return
    }
    const realPrice = ONE_TRADE/amountBuySpl.value.uiAmount*SOL_PRICE
    trades[poolId] = {
        keys: keys,
        amountBuySol: tokenAAmount,
        amountBuySpl: amountBuySpl.value.uiAmount,
        calculatedPrice: calculatedPrice,
        maxCalculatedPrice: calculatedPrice,
        realPrice: realPrice,
        buyTime: buyTime,
        buySignature: txid,
        tp: false,
        tp2: false,
        tp3: false,
        sellTx: [],
        profit: 0
    }
    */
    addChecker(keys, poolId)
    //await printWalletBalance()
    
}

function addChecker(keys: LiquidityPoolKeysV4, poolId: string) {
    const interval = setInterval(async () => {
        const price = await checkPrice(keys.id)
        if(!price) return
        /*
        if(price > trades[poolId].maxCalculatedPrice) {
            trades[poolId].maxCalculatedPrice = price
            
            /*
            else if(!trades[poolId].tp2) {
                checkAndTake(poolId, keys.baseMint, SECOND_TAKE, SECOND_AMOUNT)
                trades[poolId].profit = 200
            } else if(!trades[poolId].tp3) {
                checkAndTake(poolId, keys.baseMint, THIRD_TAKE, THIRD_AMOUNT)
                trades[poolId].profit = 475
                closeTrade(poolId)
            }
            
        }
        */
        
        if(price > volumes[poolId].maxPrice) {
            if(price/volumes[poolId].maxPrice > 3) return
            volumes[poolId].maxPrice = price
            /*
            if(!trades[poolId].tp) {
                const liquidity = await checkLiquidity(new PublicKey(poolId), false, false)
                if(liquidity === 0) {
                    closeTrade(poolId, interval)
                    poolsClosedByTime.push(poolId)
                    if(price) {
                        volumes[poolId].maxPrice = price
                    }
                    return
                }
                checkAndTake(poolId, keys.baseMint, FIRST_TAKE, FIRST_AMOUNT)
            }
            */
        }
    }, 5000)


    priceCheckers.push(interval)


    setTimeout(async() => {
        const liquidity = await checkLiquidity(keys.id, false, false)
        
        if(!liquidity || liquidity === 0) {
            volumes[poolId].liquidity = 0
        }
        closeTrade(poolId, interval)
    }, onePoolPriceTrackingTime)

    setTimeout(async () => {
        const price = await checkPrice(keys.id)
        const change = Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice)/volumes[poolId].startPrice*100)

        if(((Date.now() - volumes[poolId].start) > maxWeakTradeTime && 
        change < 30 && change > 0)) {
            closeTrade(poolId, interval)
            poolsClosedByTime.push(poolId)
            volumes[poolId].maxPrice = price
        } else
        if(change > 200) {
            volumes[poolId].quicklyReachedFirstTake = true
        }
    }, maxWeakTradeTime)
    
    setTimeout(async () => {
        const price = await checkPrice(keys.id)
        const change = Math.round((price - volumes[poolId].startPrice)/volumes[poolId].startPrice*100)
        if(change < -80) {
            closeTrade(poolId, interval)
            poolsClosedByTime.push(poolId)
            if(price) {
                volumes[poolId].maxPrice = price
            }
        }
    }, noActivityForLongTime)
    
}

function closeTrade(poolId: string, interval: NodeJS.Timeout) {
    if(priceCheckers.includes(interval)) {
        const int = priceCheckers.splice(priceCheckers.indexOf(interval), 1)
        if(!int) return
        clearInterval(interval)
        const profit = (Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice)/volumes[poolId].startPrice*100) + "%")

        console.log(`Stopped reading price of ${poolId} at ${(new Date()).toLocaleString()}, max profit: ${profit}`)
    }
}

async function checkAndTake(poolId: string, baseMint: PublicKey, take: number, amount: number) {
    
    const growth = Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice)/volumes[poolId].startPrice*100)
    if(growth > take) {
        trades[poolId].tp = true
        const sellAmount = trades[poolId].amountBuySpl * amount
        try{
            const sellId = await sellToken(trades[poolId].keys, true, true, sellAmount)
            setTimeout(async () => {
                await processSellTx(poolId, baseMint, take, sellAmount, sellId)
            }, 15000)
        } catch (err) {
            console.log("error happened during processing buy transaction: " + err.message)
            trades[poolId].tp = false
            return
        }
    }
}

async function processSellTx(poolId: string, baseMint: PublicKey, take: number, sellAmount: number, sellId: string) {
    let sellTx: ParsedTransactionWithMeta
    try{
        sellTx = await swapConnection.getParsedTransaction(sellId, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})
        if(!sellTx || sellTx.meta.err) {
            console.log("Buy ransaction returned error, " + sellId)
            trades[poolId].tp = false
            return
        }
    } catch(err) {
        console.log("error happened during processing buy transaction: " + err.message)
    }
    
    trades[poolId].sellTx.push(sellId)
    trades[poolId].amountBuySpl -= sellAmount
    console.log(`Sold ${baseMint.toString()} +${take}% at ${(new Date()).toLocaleString()}`)
    trades[poolId].profit = 400
    await printWalletBalance()
}

async function sellToken(
    keys: LiquidityPoolKeysV4, 
    useVersionedTransaction: boolean,
    executeSwap: boolean,
    splTokenAmount: number) {

    const tx = await raydiumSwap.getSwapTransaction(
        keys.quoteMint.toString(),
        splTokenAmount,
        keys,
        100000, // Max amount of lamports
        useVersionedTransaction,
        'in'
    );

    if (executeSwap) {  
        const txid = useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction)
            : await raydiumSwap.sendLegacyTransaction(tx as VersionedTransaction)
        
        return txid


    } else {
        const simRes = useVersionedTransaction
            ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
            : await raydiumSwap.simulateLegacyTransaction(tx as VersionedTransaction)

        console.log(simRes)
    }
}

async function buyToken(
    keys: LiquidityPoolKeysV4,
    useVersionedTransaction: boolean,
    executeSwap: boolean,
    tokenAAmount: number) {
    
    const tx = await raydiumSwap.getSwapTransaction(
        keys.baseMint.toString(),
        tokenAAmount,
        keys,
        100000, // Max amount of lamports
        useVersionedTransaction,
        'in'
    );

    if (executeSwap) {  
        const txid = useVersionedTransaction
            ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction)
            : await raydiumSwap.sendLegacyTransaction(tx as VersionedTransaction)
        
        return txid


    } else {
        const simRes = useVersionedTransaction
            ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
            : await raydiumSwap.simulateLegacyTransaction(tx as VersionedTransaction)

        console.log(simRes)
    }
}

function stopNewReadings() {
    
    lastDate = Date.now()
    console.log(`stopped reading new pools at ${(new Date(lastDate)).toLocaleString()}`)
    for(let id in priceCheckers) {
        clearInterval(priceCheckers[id])
    }
    setTimeout(() => {printDataAndKill()}, onePoolTrackingTime)
}

function printDataAndKill() {
    console.log("All pools")
    printPools((id: string) => {return true})
    console.log("Non zero liquidity pools")
    printPools((id: string) => {return volumes[id].liquidity !== 0 ? true : false})
    console.log("Second chance pools")
    printPools((id: string) => {return (volumes[id].secondChancePool && volumes[id].bought) ? true : false})
    console.log("Pools closed by time")
    printPools((id: string) => {return (volumes[id].liquidity !== 0 && poolsClosedByTime.includes(id)) ? true : false})
    console.log("Profitable pools")
    printPools((id: string) => {
        return (volumes[id].liquidity !== 0 && (volumes[id].maxPrice - volumes[id].startPrice)/volumes[id].startPrice) > 2 ? true : false
    })
    console.log("Unprofitable pools")
    printPools((id: string) => {
        return (volumes[id].liquidity !== 0 && (volumes[id].maxPrice - volumes[id].startPrice)/volumes[id].startPrice) < 0 ? true : false
    })
    console.log("Quickly reached 200 percent profit(in 360 sec)")
    printPools((id: string) => {return (volumes[id].liquidity !== 0 && volumes[id].quicklyReachedFirstTake) ? true : false})
    console.log("Bought")
    printPools((id: string) => {return (volumes[id].bought) ? true : false})

    printCoinsPercentagesCount()
    console.log(calculateOverallProfit())

    console.log("Program ended working at " + (new Date()).toLocaleString())
    throw new Error("stop")
}
const a = (i: number) => {return i < 5 ? true : false}

function printPools(filter: Function) {
    const dataToPrint = []
    for (let id in volumes) {
        if(!volumes[id].finish) volumes[id].finish = lastDate
        if(!filter(id)) continue
        dataToPrint.push({
            "Pool": id,
            "Liquidity": (Math.round(volumes[id].liquidity * SOL_PRICE * 1000) / 1000),
            "Volume": (Math.round(volumes[id].volume * SOL_PRICE * 1000) / 1000),
            "Txs": volumes[id].transactions,
            "Buy Vol": (Math.round(volumes[id].buyVolume * SOL_PRICE * 1000) / 1000),
            "Sell Vol": (Math.round(volumes[id].sellVolume * SOL_PRICE * 1000) / 1000),
            "First Tx" : new Date(volumes[id].firstTxTime).toLocaleString().slice(11, 19),
            "Last Tx" : new Date(volumes[id].lastTxTime).toLocaleString().slice(11, 19),
            "Max" : (Math.round((volumes[id].maxPrice - volumes[id].startPrice)/volumes[id].startPrice*100) + "%")
        })
    }
    console.table(dataToPrint)
}

function printCoinsPercentagesCount() {
    const percentages = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    for (let id in volumes) {
        if(volumes[id].liquidity === 0) continue
        const percentage = Math.round((volumes[id].maxPrice - volumes[id].startPrice)/volumes[id].startPrice*100)
        if(isNaN(percentage)) continue
        if(percentage < -20 || percentage === 0) {
            percentages[0] += 1
        }
        if(percentage >= -20 && percentage <= 50) {
            percentages[1] += 1
        }
        if(percentage > 50) {
            percentages[2] += 1
        }
        if(percentage > 100) {
            percentages[3] += 1
        }    
        if(percentage > 150) {
            percentages[4] += 1
        }
        if(percentage > 200) {
            percentages[5] += 1
        }
        if(percentage > 300) {
            percentages[6] += 1
        }    
        if(percentage > 400) {
            percentages[7] += 1
        }
        if(percentage > 500) {
            percentages[8] += 1
        }
        if(percentage > 600) {
            percentages[9] += 1
        }
        if(percentage > 700) {
            percentages[10] += 1
        }   
        if(percentage > 800) {
            percentages[11] += 1
        }
        if(percentage > 900) {
            percentages[12] += 1
        }
        if(percentage > 1000) {
            percentages[13] += 1
        }
    }
    const resultTable = []
    resultTable.push({"-100": percentages[0]})
    resultTable.push({"~0": percentages[1]})
    resultTable.push({">50": percentages[2]})
    resultTable.push({">100": percentages[3]})
    resultTable.push({">150": percentages[4]})
    resultTable.push({">200": percentages[5]})
    resultTable.push({">300": percentages[6]})
    resultTable.push({">400": percentages[7]})
    resultTable.push({">500": percentages[8]})
    resultTable.push({">600": percentages[9]})
    resultTable.push({">700": percentages[10]})
    resultTable.push({">800": percentages[11]})
    resultTable.push({">900": percentages[12]})
    resultTable.push({">1000": percentages[13]})
    console.table(resultTable)
}

function calculateOverallProfit() {
    let profit = 0
    for (let id in volumes) {
        if(volumes[id].liquidity === 0) continue
        const percentage = Math.round((volumes[id].maxPrice - volumes[id].startPrice)/volumes[id].startPrice*100)
        if(percentage < 400) {
            profit -= 100
        } else {
            profit += 400
        }
    }
    return profit
}

async function printWalletBalance() {
    const solanaBalance = await poolKeysConnection.getBalance(PUBLIC_KEY)
    console.log(`Solana balance: ${solanaBalance/LAMPORTS_PER_SOL} SOL`)
}

(async() => {
    await printWalletBalance()
    subscribeToNewRaydiumPools()
})()
