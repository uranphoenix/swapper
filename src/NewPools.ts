import { Liquidity, jsonInfo2PoolKeys, LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeys, MARKET_STATE_LAYOUT_V3, Market, TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { Connection, Logs, ParsedInnerInstruction, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey, VersionedTransaction } from "@solana/web3.js";
import * as fs from 'fs';
import RaydiumSwap from './RaydiumSwap'
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const RPC_ENDPOINT = process.env.HTTP_ENDPOINT;
const WSS_ENDPOINT = process.env.WSS_ENDPOINT;
const PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map((i) => parseInt(i))
const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;
const SOL_PRICE = 96.4;

const solanaConnection = new Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", {
    wsEndpoint: "wss://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/",
    commitment: "confirmed"
  });
const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: WSS_ENDPOINT, 
    commitment: "confirmed"
});
const raydium = new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)
const seenTransactions : Array<string> = []; // The log listener is sometimes triggered multiple times for a single transaction, don't react to tranasctions we've already seen

console.log("started at " + (new Date()).toLocaleString());

const raydiumSwap = new RaydiumSwap(new Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", "confirmed"), PRIVATE_KEY)
const executeSwap = true // Change to true to execute swap
const useVersionedTransaction = true // Use versioned transaction
const tokenAAmount = 0.002 // e.g. 0.01 SOL -> B_TOKEN

const tokenAAddress = 'So11111111111111111111111111111111111111112' // e.g. SOLANA mint address
const tokenBAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' // e.g. PYTH mint address

subscribeToNewRaydiumPools();

function subscribeToNewRaydiumPools() : void
{
    /*connection.onLogs(new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async ({ logs, err, signature }) => {
        //console.log("logs found");
        if (err) return;
        //console.log("no error");
        //console.log(txLogs.signature);
        if (seenTransactions.includes(signature)) {
            return;
        }
        if (!(logs && logs.some(log => log.includes("initialize2")))) {
            return;
        }
        seenTransactions.push(signature);
        
        console.log("pool initialization found");
        let liquidity = 0;
        try{
            const tx = await connection.getParsedTransaction(signature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'});
            if (!tx) {
                throw new Error('Failed to fetch transaction with signature ');
            }
            const info = await connection.getAccountInfo(tx.transaction.message.accountKeys[2].pubkey, "confirmed");
            if (!info) console.log("no info((");

            const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);

            const baseTokenAmount = await connection.getTokenAccountBalance(
                poolState.baseVault
            );
            const quoteTokenAmount = await connection.getTokenAccountBalance(
                poolState.quoteVault
            );
            const base: number = baseTokenAmount.value.uiAmount;
            const quote: number = quoteTokenAmount.value.uiAmount;
            liquidity = SOL_PRICE * quote * 2;
            
            if (liquidity < 1000 || liquidity > 40000){
                console.log("insufficient liquidity");
                return;
            }
        } catch (error: any) {
            console.error(`Error processing transaction ${signature}: ${error.message}`);
            return;
        }
        
        const poolKeys = await fetchPoolKeysForLPInitTransactionHash(signature); // With poolKeys you can do a swap
        if (poolKeys !== null){
            const displayData = [
                { "Token": "A", "Account Public Key": poolKeys.baseMint.toBase58() },
                { "Token": "B", "Account Public Key": poolKeys.quoteMint.toBase58() }
            ];
            console.log("New LP Found at " + (new Date()).toLocaleString());
            console.log(generateExplorerUrl(signature));
            console.table(displayData);
            console.log(liquidity);


            const tx = await raydiumSwap.getSwapTransaction(
                poolKeys.baseMint.toString(),
                tokenAAmount,
                poolKeys,
                100000, // Max amount of lamports
                useVersionedTransaction,
                'in'
              )
            console.log(tx);
            
            if (executeSwap) {
            const txid = useVersionedTransaction
                ? await raydiumSwap.sendVersionedTransaction(tx as VersionedTransaction)
                : await raydiumSwap.sendLegacyTransaction(tx as VersionedTransaction)
        
            console.log(`https://solscan.io/tx/${txid}`)
            } else {
            const simRes = useVersionedTransaction
                ? await raydiumSwap.simulateVersionedTransaction(tx as VersionedTransaction)
                : await raydiumSwap.simulateLegacyTransaction(tx as VersionedTransaction)
        
            console.log(simRes)
            }
            console.log("Transaction created/simulated at: " + new Date().toLocaleString());
        } else {
            console.log('failed shet')
        }
    },
    "confirmed");
    console.log('Listening to new pools...');
    */


    

    connection.onLogs(new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), async ({ logs, err, signature }) => {
        //console.log("logs found");
        if (err) return;
        //console.log(txLogs.signature);
        if (seenTransactions.includes(signature)) {
            return;
        }
        if (!(logs && logs.some(log => log.includes("initialize2")))) {
            return;
        }
        console.log("new pool created")
        const newPoolTx = await connection.getParsedTransaction(signature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'});
        try {
            if (!newPoolTx) {
                throw new Error('Failed to fetch transaction with signature ');
            }
        } catch (err) {
            console.log(err.message);
            return;
        }
        

        const info = await connection.getAccountInfo(newPoolTx.transaction.message.accountKeys[2].pubkey, "confirmed");
        if (!info) {
            console.log("no info((");
            return;
        }

        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
        console.log(poolState.quoteVault);
        try{
            const quoteTokenAmount = await connection.getTokenAccountBalance(
                poolState.quoteVault
            );
            const quote = quoteTokenAmount.value.uiAmount;
            const liquidity = SOL_PRICE * quote * 2;
            console.log(liquidity);
            if(liquidity < 1000 || liquidity > 50000) {
                console.log("Insufficient liquidity");
                return;
            }
        } catch (err) {
            console.log(err.message);
            return;
        }

        const baseMint = poolState.baseMint.toString();
        const quoteMint = poolState.quoteMint.toString();

        const displayData = [
            { "Token": "A", "Account Public Key": baseMint },
            { "Token": "B", "Account Public Key": quoteMint }
        ];
        console.table(displayData);

        console.log("looking for pool info for " + baseMint + "/" + quoteMint)
        const poolKeys = await fetchPoolKeysForLPInitTransactionHash(signature);
        console.log('Found pool info')
        //console.log(poolKeys)
        //console.log(logs)
        
        const tx1 = await raydiumSwap.getSwapTransaction(
            baseMint,
            tokenAAmount,
            poolKeys,
            100000, // Max amount of lamports
            useVersionedTransaction,
            'in'
        );

        const tx2 = await raydiumSwap.getSwapTransaction(
            baseMint,
            tokenAAmount,
            poolKeys,
            100000, // Max amount of lamports
            useVersionedTransaction,
            'in'
        );

        //console.log(JSON.stringify(tx1, null, 2));
        //console.log(JSON.stringify(tx2, null, 2));

        if (executeSwap) {
            /*
            const simRes = useVersionedTransaction
                ? await raydiumSwap.simulateVersionedTransaction(tx1 as VersionedTransaction)
                : await raydiumSwap.simulateLegacyTransaction(tx1 as VersionedTransaction)
            */

            //console.log(simRes)    
            const txid = useVersionedTransaction
                ? await raydiumSwap.sendVersionedTransaction(tx2 as VersionedTransaction)
                : await raydiumSwap.sendLegacyTransaction(tx2 as VersionedTransaction)
        
            console.log(`https://solscan.io/tx/${txid}`)
            console.log('successful:')
            setTimeout((async () => await connection.getParsedTransaction(txid, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})), 15000);
        } else {
            const simRes = useVersionedTransaction
                ? await raydiumSwap.simulateVersionedTransaction(tx1 as VersionedTransaction)
                : await raydiumSwap.simulateLegacyTransaction(tx1 as VersionedTransaction)

        console.log(simRes)
        }
    },
    "confirmed");
}

function generateExplorerUrl(txId: string) {
    return `https://solscan.io/tx/${txId}`;
}

function findLogEntry(needle: string, logEntries: Array<string>) : string|null
{
    for (let i = 0; i < logEntries.length; ++i) {
        if (logEntries[i].includes(needle)) {
            return logEntries[i];
        }
    }

    return null;
}

function saveDictionaryAsJSON(dictionary: Record<string, any>, baseMint: PublicKey): void {
    const fileName = `new_pools/${baseMint.toBase58()}_poolInfo.json`;  // Using baseMint as part of the file name
    const jsonContent = JSON.stringify(dictionary, null, 2);

    fs.writeFileSync(fileName, jsonContent, 'utf-8');

    console.log(`Dictionary saved to ${fileName}`);
}

async function fetchPoolKeysForLPInitTransactionHash(txSignature: string) : Promise<LiquidityPoolKeys | null>
{
    try {
            const tx = await connection.getParsedTransaction(txSignature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'});
            
            if (!tx) {
                throw new Error('Failed to fetch transaction with signature ' + txSignature);
            }
            
            const poolInfo = parsePoolInfoFromLpTransaction(tx);
            const marketInfo = await fetchMarketInfo(poolInfo.marketId);
            
            const goodPoolInfo = {
                id: poolInfo.id,
                baseMint: poolInfo.baseMint,
                quoteMint: poolInfo.quoteMint,
                lpMint: poolInfo.lpMint,
                baseDecimals: poolInfo.baseDecimals,
                quoteDecimals: poolInfo.quoteDecimals,
                lpDecimals: poolInfo.lpDecimals,
                version: 4,
                programId: poolInfo.programId,
                authority: poolInfo.authority,
                openOrders: poolInfo.openOrders,
                targetOrders: poolInfo.targetOrders,
                baseVault: poolInfo.baseVault,
                quoteVault: poolInfo.quoteVault,
                withdrawQueue: poolInfo.withdrawQueue,
                lpVault: poolInfo.lpVault,
                marketVersion: 3,
                marketProgramId: poolInfo.marketProgramId,
                marketId: poolInfo.marketId,
                marketAuthority: Market.getAssociatedAuthority({programId: poolInfo.marketProgramId, marketId: poolInfo.marketId}).publicKey,
                marketBaseVault: marketInfo.baseVault,
                marketQuoteVault: marketInfo.quoteVault,
                marketBids: marketInfo.bids,
                marketAsks: marketInfo.asks,
                marketEventQueue: marketInfo.eventQueue,
            }
            saveDictionaryAsJSON(goodPoolInfo, goodPoolInfo.baseMint);
            return goodPoolInfo as LiquidityPoolKeys;
        } catch (error: any) {
            console.error(`Error processing transaction ${txSignature}: ${error.message}`);
            return null;
        }
} 

async function fetchMarketInfo(marketId: PublicKey) {
    const marketAccountInfo = await connection.getAccountInfo(marketId);
    if (!marketAccountInfo) {
        throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
    }
    
    return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
}

function parsePoolInfoFromLpTransaction(txData: ParsedTransactionWithMeta) 
{
    const initInstruction = findInstructionByProgramId(txData.transaction.message.instructions, new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as PartiallyDecodedInstruction|null;
    if (!initInstruction) {
        throw new Error('Failed to find lp init instruction in lp init tx');
    }
    const baseMint = initInstruction.accounts[8];
    const baseVault = initInstruction.accounts[10]; 
    const quoteMint = initInstruction.accounts[9];
    const quoteVault = initInstruction.accounts[11];
    const lpMint = initInstruction.accounts[7];
    const baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
    const lpMintInitInstruction = findInitializeMintInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInitInstruction) {
        throw new Error('Failed to find lp mint init instruction in lp init tx');
    }
    const lpMintInstruction = findMintToInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
    if (!lpMintInstruction) {
        throw new Error('Failed to find lp mint to instruction in lp init tx');
    }
    const baseTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], baseVault, TOKEN_PROGRAM_ID);
    if (!baseTransferInstruction) {
        throw new Error('Failed to find base transfer instruction in lp init tx');
    }
    const quoteTransferInstruction = findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], quoteVault, TOKEN_PROGRAM_ID);
    if (!quoteTransferInstruction) {
        throw new Error('Failed to find quote transfer instruction in lp init tx');
    }
    const lpDecimals = lpMintInitInstruction.parsed.info.decimals;
    const lpInitializationLogEntryInfo = extractLPInitializationLogEntryInfoFromLogEntry(findLogEntry('init_pc_amount', txData.meta?.logMessages ?? []) ?? '');
    const basePreBalance = (txData.meta?.preTokenBalances ?? []).find(balance => balance.mint === baseMint.toBase58());
    if (!basePreBalance) {
        throw new Error('Failed to find base tokens preTokenBalance entry to parse the base tokens decimals');
    }
    const baseDecimals = basePreBalance.uiTokenAmount.decimals;
    const poolInfo = {
        id: initInstruction.accounts[4],
        baseMint,
        quoteMint,
        lpMint,
        baseDecimals: baseAndQuoteSwapped ? SOL_DECIMALS : baseDecimals,
        quoteDecimals: baseAndQuoteSwapped ? baseDecimals : SOL_DECIMALS,
        lpDecimals,
        version: 4,
        programId: new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
        authority: initInstruction.accounts[5],
        openOrders: initInstruction.accounts[6],
        targetOrders: initInstruction.accounts[13],
        baseVault,
        quoteVault,
        withdrawQueue: new PublicKey("11111111111111111111111111111111"),
        lpVault: new PublicKey(lpMintInstruction.parsed.info.account),
        marketVersion: 3,
        marketProgramId: initInstruction.accounts[15],
        marketId: initInstruction.accounts[16],
        baseReserve: parseInt(baseTransferInstruction.parsed.info.amount),
        quoteReserve: parseInt(quoteTransferInstruction.parsed.info.amount),
        lpReserve: parseInt(lpMintInstruction.parsed.info.amount),
        openTime: lpInitializationLogEntryInfo.open_time,
    };
    return poolInfo
}

function findTransferInstructionInInnerInstructionsByDestination(innerInstructions: Array<ParsedInnerInstruction>, destinationAccount : PublicKey, programId?: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'transfer' && instruction.parsed.info.destination === destinationAccount.toBase58() && (!programId || instruction.programId.equals(programId))) {
                return instruction;
            }
        }
    }

    return null;
}

function findInitializeMintInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'initializeMint' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findMintToInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null
{
    for (let i = 0; i < innerInstructions.length; i++) {
        for (let y = 0; y < innerInstructions[i].instructions.length; y++) {
            const instruction = innerInstructions[i].instructions[y] as ParsedInstruction;
            if (!instruction.parsed) {continue};
            if (instruction.parsed.type === 'mintTo' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }

    return null;
}

function findInstructionByProgramId(instructions: Array<ParsedInstruction|PartiallyDecodedInstruction>, programId: PublicKey) : ParsedInstruction|PartiallyDecodedInstruction|null
{
    for (let i = 0; i < instructions.length; i++) {
        if (instructions[i].programId.equals(programId)) {
            return instructions[i];
        }
    }

    return null;
}

function extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string) : {nonce: number, open_time: number, init_pc_amount: number, init_coin_amount: number} {
    const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');

    return JSON.parse(fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
}

function fixRelaxedJsonInLpLogEntry(relaxedJson: string) : string
{
    return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
}

async function getPoolLiqiudity(pool: PublicKey, connection: Connection): Promise<number> {
  const info = await connection.getAccountInfo(pool, "confirmed");
  if (!info) console.log("no info((");

  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);

  const baseTokenAmount = await connection.getTokenAccountBalance(
    poolState.baseVault
  );
  const quoteTokenAmount = await connection.getTokenAccountBalance(
    poolState.quoteVault
  );

  const base: number = baseTokenAmount.value.uiAmount;
  const quote: number = quoteTokenAmount.value.uiAmount;
  const liquidity: number = 94.1 * quote * 2;

  console.log(
    "Pool info:",

    "base vault balance " + base,
    "quote vault balance " + quote,

    "\ndollar value " + liquidity
  );

  return liquidity;
}


