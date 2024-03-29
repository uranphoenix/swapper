"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var raydium_sdk_1 = require("@raydium-io/raydium-sdk");
var web3_js_1 = require("@solana/web3.js");
var fs = require("fs");
var RaydiumSwap_1 = require("./RaydiumSwap");
var dotenv = require("dotenv");
dotenv.config({ path: '../.env' });
var RPC_ENDPOINT = process.env.HTTP_ENDPOINT;
var WSS_ENDPOINT = process.env.WSS_ENDPOINT;
var PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map(function (i) { return parseInt(i); });
var RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
var SERUM_OPENBOOK_PROGRAM_ID = 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX';
var SOL_MINT = 'So11111111111111111111111111111111111111112';
var SOL_DECIMALS = 9;
var SOL_PRICE = 96.4;
var solanaConnection = new web3_js_1.Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", {
    wsEndpoint: "wss://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/",
    commitment: "confirmed"
});
var connection = new web3_js_1.Connection(RPC_ENDPOINT, {
    wsEndpoint: WSS_ENDPOINT,
    commitment: "confirmed"
});
var raydium = new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID);
var seenTransactions = []; // The log listener is sometimes triggered multiple times for a single transaction, don't react to tranasctions we've already seen
console.log("started at " + (new Date()).toLocaleString());
var raydiumSwap = new RaydiumSwap_1.default(new web3_js_1.Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", "confirmed"), PRIVATE_KEY);
var executeSwap = true; // Change to true to execute swap
var useVersionedTransaction = true; // Use versioned transaction
var tokenAAmount = 0.002; // e.g. 0.01 SOL -> B_TOKEN
var tokenAAddress = 'So11111111111111111111111111111111111111112'; // e.g. SOLANA mint address
var tokenBAddress = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'; // e.g. PYTH mint address
subscribeToNewRaydiumPools();
function subscribeToNewRaydiumPools() {
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
    var _this = this;
    connection.onLogs(new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), function (_a) {
        var logs = _a.logs, err = _a.err, signature = _a.signature;
        return __awaiter(_this, void 0, void 0, function () {
            var newPoolTx, info, poolState, quoteTokenAmount, quote, liquidity, err_1, baseMint, quoteMint, displayData, poolKeys, tx1, tx2, txid_1, _b, simRes, _c;
            var _this = this;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        //console.log("logs found");
                        if (err)
                            return [2 /*return*/];
                        //console.log(txLogs.signature);
                        if (seenTransactions.includes(signature)) {
                            return [2 /*return*/];
                        }
                        if (!(logs && logs.some(function (log) { return log.includes("initialize2"); }))) {
                            return [2 /*return*/];
                        }
                        console.log("new pool created");
                        return [4 /*yield*/, connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                    case 1:
                        newPoolTx = _d.sent();
                        try {
                            if (!newPoolTx) {
                                throw new Error('Failed to fetch transaction with signature ');
                            }
                        }
                        catch (err) {
                            console.log(err.message);
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, connection.getAccountInfo(newPoolTx.transaction.message.accountKeys[2].pubkey, "confirmed")];
                    case 2:
                        info = _d.sent();
                        if (!info) {
                            console.log("no info((");
                            return [2 /*return*/];
                        }
                        poolState = raydium_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
                        console.log(poolState.quoteVault);
                        _d.label = 3;
                    case 3:
                        _d.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, connection.getTokenAccountBalance(poolState.quoteVault)];
                    case 4:
                        quoteTokenAmount = _d.sent();
                        quote = quoteTokenAmount.value.uiAmount;
                        liquidity = SOL_PRICE * quote * 2;
                        console.log(liquidity);
                        if (liquidity < 1000 || liquidity > 50000) {
                            console.log("Insufficient liquidity");
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        err_1 = _d.sent();
                        console.log(err_1.message);
                        return [2 /*return*/];
                    case 6:
                        baseMint = poolState.baseMint.toString();
                        quoteMint = poolState.quoteMint.toString();
                        displayData = [
                            { "Token": "A", "Account Public Key": baseMint },
                            { "Token": "B", "Account Public Key": quoteMint }
                        ];
                        console.table(displayData);
                        console.log("looking for pool info for " + baseMint + "/" + quoteMint);
                        return [4 /*yield*/, fetchPoolKeysForLPInitTransactionHash(signature)];
                    case 7:
                        poolKeys = _d.sent();
                        console.log('Found pool info');
                        return [4 /*yield*/, raydiumSwap.getSwapTransaction(baseMint, tokenAAmount, poolKeys, 100000, // Max amount of lamports
                            useVersionedTransaction, 'in')];
                    case 8:
                        tx1 = _d.sent();
                        return [4 /*yield*/, raydiumSwap.getSwapTransaction(baseMint, tokenAAmount, poolKeys, 100000, // Max amount of lamports
                            useVersionedTransaction, 'in')];
                    case 9:
                        tx2 = _d.sent();
                        if (!executeSwap) return [3 /*break*/, 14];
                        if (!useVersionedTransaction) return [3 /*break*/, 11];
                        return [4 /*yield*/, raydiumSwap.sendVersionedTransaction(tx2)];
                    case 10:
                        _b = _d.sent();
                        return [3 /*break*/, 13];
                    case 11: return [4 /*yield*/, raydiumSwap.sendLegacyTransaction(tx2)];
                    case 12:
                        _b = _d.sent();
                        _d.label = 13;
                    case 13:
                        txid_1 = _b;
                        console.log("https://solscan.io/tx/".concat(txid_1));
                        console.log('successful:');
                        setTimeout((function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, connection.getParsedTransaction(txid_1, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        }); }); }), 15000);
                        return [3 /*break*/, 19];
                    case 14:
                        if (!useVersionedTransaction) return [3 /*break*/, 16];
                        return [4 /*yield*/, raydiumSwap.simulateVersionedTransaction(tx1)];
                    case 15:
                        _c = _d.sent();
                        return [3 /*break*/, 18];
                    case 16: return [4 /*yield*/, raydiumSwap.simulateLegacyTransaction(tx1)];
                    case 17:
                        _c = _d.sent();
                        _d.label = 18;
                    case 18:
                        simRes = _c;
                        console.log(simRes);
                        _d.label = 19;
                    case 19: return [2 /*return*/];
                }
            });
        });
    }, "confirmed");
}
function generateExplorerUrl(txId) {
    return "https://solscan.io/tx/".concat(txId);
}
function findLogEntry(needle, logEntries) {
    for (var i = 0; i < logEntries.length; ++i) {
        if (logEntries[i].includes(needle)) {
            return logEntries[i];
        }
    }
    return null;
}
function saveDictionaryAsJSON(dictionary, baseMint) {
    var fileName = "new_pools/".concat(baseMint.toBase58(), "_poolInfo.json"); // Using baseMint as part of the file name
    var jsonContent = JSON.stringify(dictionary, null, 2);
    fs.writeFileSync(fileName, jsonContent, 'utf-8');
    console.log("Dictionary saved to ".concat(fileName));
}
function fetchPoolKeysForLPInitTransactionHash(txSignature) {
    return __awaiter(this, void 0, void 0, function () {
        var tx, poolInfo, marketInfo, goodPoolInfo, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                case 1:
                    tx = _a.sent();
                    if (!tx) {
                        throw new Error('Failed to fetch transaction with signature ' + txSignature);
                    }
                    poolInfo = parsePoolInfoFromLpTransaction(tx);
                    return [4 /*yield*/, fetchMarketInfo(poolInfo.marketId)];
                case 2:
                    marketInfo = _a.sent();
                    goodPoolInfo = {
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
                        marketAuthority: raydium_sdk_1.Market.getAssociatedAuthority({ programId: poolInfo.marketProgramId, marketId: poolInfo.marketId }).publicKey,
                        marketBaseVault: marketInfo.baseVault,
                        marketQuoteVault: marketInfo.quoteVault,
                        marketBids: marketInfo.bids,
                        marketAsks: marketInfo.asks,
                        marketEventQueue: marketInfo.eventQueue,
                    };
                    saveDictionaryAsJSON(goodPoolInfo, goodPoolInfo.baseMint);
                    return [2 /*return*/, goodPoolInfo];
                case 3:
                    error_1 = _a.sent();
                    console.error("Error processing transaction ".concat(txSignature, ": ").concat(error_1.message));
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function fetchMarketInfo(marketId) {
    return __awaiter(this, void 0, void 0, function () {
        var marketAccountInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection.getAccountInfo(marketId)];
                case 1:
                    marketAccountInfo = _a.sent();
                    if (!marketAccountInfo) {
                        throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
                    }
                    return [2 /*return*/, raydium_sdk_1.MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data)];
            }
        });
    });
}
function parsePoolInfoFromLpTransaction(txData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var initInstruction = findInstructionByProgramId(txData.transaction.message.instructions, new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID));
    if (!initInstruction) {
        throw new Error('Failed to find lp init instruction in lp init tx');
    }
    var baseMint = initInstruction.accounts[8];
    var baseVault = initInstruction.accounts[10];
    var quoteMint = initInstruction.accounts[9];
    var quoteVault = initInstruction.accounts[11];
    var lpMint = initInstruction.accounts[7];
    var baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
    var lpMintInitInstruction = findInitializeMintInInnerInstructionsByMintAddress((_b = (_a = txData.meta) === null || _a === void 0 ? void 0 : _a.innerInstructions) !== null && _b !== void 0 ? _b : [], lpMint);
    if (!lpMintInitInstruction) {
        throw new Error('Failed to find lp mint init instruction in lp init tx');
    }
    var lpMintInstruction = findMintToInInnerInstructionsByMintAddress((_d = (_c = txData.meta) === null || _c === void 0 ? void 0 : _c.innerInstructions) !== null && _d !== void 0 ? _d : [], lpMint);
    if (!lpMintInstruction) {
        throw new Error('Failed to find lp mint to instruction in lp init tx');
    }
    var baseTransferInstruction = findTransferInstructionInInnerInstructionsByDestination((_f = (_e = txData.meta) === null || _e === void 0 ? void 0 : _e.innerInstructions) !== null && _f !== void 0 ? _f : [], baseVault, raydium_sdk_1.TOKEN_PROGRAM_ID);
    if (!baseTransferInstruction) {
        throw new Error('Failed to find base transfer instruction in lp init tx');
    }
    var quoteTransferInstruction = findTransferInstructionInInnerInstructionsByDestination((_h = (_g = txData.meta) === null || _g === void 0 ? void 0 : _g.innerInstructions) !== null && _h !== void 0 ? _h : [], quoteVault, raydium_sdk_1.TOKEN_PROGRAM_ID);
    if (!quoteTransferInstruction) {
        throw new Error('Failed to find quote transfer instruction in lp init tx');
    }
    var lpDecimals = lpMintInitInstruction.parsed.info.decimals;
    var lpInitializationLogEntryInfo = extractLPInitializationLogEntryInfoFromLogEntry((_l = findLogEntry('init_pc_amount', (_k = (_j = txData.meta) === null || _j === void 0 ? void 0 : _j.logMessages) !== null && _k !== void 0 ? _k : [])) !== null && _l !== void 0 ? _l : '');
    var basePreBalance = ((_o = (_m = txData.meta) === null || _m === void 0 ? void 0 : _m.preTokenBalances) !== null && _o !== void 0 ? _o : []).find(function (balance) { return balance.mint === baseMint.toBase58(); });
    if (!basePreBalance) {
        throw new Error('Failed to find base tokens preTokenBalance entry to parse the base tokens decimals');
    }
    var baseDecimals = basePreBalance.uiTokenAmount.decimals;
    var poolInfo = {
        id: initInstruction.accounts[4],
        baseMint: baseMint,
        quoteMint: quoteMint,
        lpMint: lpMint,
        baseDecimals: baseAndQuoteSwapped ? SOL_DECIMALS : baseDecimals,
        quoteDecimals: baseAndQuoteSwapped ? baseDecimals : SOL_DECIMALS,
        lpDecimals: lpDecimals,
        version: 4,
        programId: new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID),
        authority: initInstruction.accounts[5],
        openOrders: initInstruction.accounts[6],
        targetOrders: initInstruction.accounts[13],
        baseVault: baseVault,
        quoteVault: quoteVault,
        withdrawQueue: new web3_js_1.PublicKey("11111111111111111111111111111111"),
        lpVault: new web3_js_1.PublicKey(lpMintInstruction.parsed.info.account),
        marketVersion: 3,
        marketProgramId: initInstruction.accounts[15],
        marketId: initInstruction.accounts[16],
        baseReserve: parseInt(baseTransferInstruction.parsed.info.amount),
        quoteReserve: parseInt(quoteTransferInstruction.parsed.info.amount),
        lpReserve: parseInt(lpMintInstruction.parsed.info.amount),
        openTime: lpInitializationLogEntryInfo.open_time,
    };
    return poolInfo;
}
function findTransferInstructionInInnerInstructionsByDestination(innerInstructions, destinationAccount, programId) {
    for (var i = 0; i < innerInstructions.length; i++) {
        for (var y = 0; y < innerInstructions[i].instructions.length; y++) {
            var instruction = innerInstructions[i].instructions[y];
            if (!instruction.parsed) {
                continue;
            }
            ;
            if (instruction.parsed.type === 'transfer' && instruction.parsed.info.destination === destinationAccount.toBase58() && (!programId || instruction.programId.equals(programId))) {
                return instruction;
            }
        }
    }
    return null;
}
function findInitializeMintInInnerInstructionsByMintAddress(innerInstructions, mintAddress) {
    for (var i = 0; i < innerInstructions.length; i++) {
        for (var y = 0; y < innerInstructions[i].instructions.length; y++) {
            var instruction = innerInstructions[i].instructions[y];
            if (!instruction.parsed) {
                continue;
            }
            ;
            if (instruction.parsed.type === 'initializeMint' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }
    return null;
}
function findMintToInInnerInstructionsByMintAddress(innerInstructions, mintAddress) {
    for (var i = 0; i < innerInstructions.length; i++) {
        for (var y = 0; y < innerInstructions[i].instructions.length; y++) {
            var instruction = innerInstructions[i].instructions[y];
            if (!instruction.parsed) {
                continue;
            }
            ;
            if (instruction.parsed.type === 'mintTo' && instruction.parsed.info.mint === mintAddress.toBase58()) {
                return instruction;
            }
        }
    }
    return null;
}
function findInstructionByProgramId(instructions, programId) {
    for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].programId.equals(programId)) {
            return instructions[i];
        }
    }
    return null;
}
function extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry) {
    var lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');
    return JSON.parse(fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
}
function fixRelaxedJsonInLpLogEntry(relaxedJson) {
    return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
}
function getPoolLiqiudity(pool, connection) {
    return __awaiter(this, void 0, void 0, function () {
        var info, poolState, baseTokenAmount, quoteTokenAmount, base, quote, liquidity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connection.getAccountInfo(pool, "confirmed")];
                case 1:
                    info = _a.sent();
                    if (!info)
                        console.log("no info((");
                    poolState = raydium_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
                    return [4 /*yield*/, connection.getTokenAccountBalance(poolState.baseVault)];
                case 2:
                    baseTokenAmount = _a.sent();
                    return [4 /*yield*/, connection.getTokenAccountBalance(poolState.quoteVault)];
                case 3:
                    quoteTokenAmount = _a.sent();
                    base = baseTokenAmount.value.uiAmount;
                    quote = quoteTokenAmount.value.uiAmount;
                    liquidity = 94.1 * quote * 2;
                    console.log("Pool info:", "base vault balance " + base, "quote vault balance " + quote, "\ndollar value " + liquidity);
                    return [2 /*return*/, liquidity];
            }
        });
    });
}
