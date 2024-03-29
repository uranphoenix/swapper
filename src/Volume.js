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
var web3_js_1 = require("@solana/web3.js");
var raydium_sdk_1 = require("@raydium-io/raydium-sdk");
var fs = require("fs");
var dotenv = require("dotenv");
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
var RaydiumSwap_1 = require("./RaydiumSwap");
var PoolKeys_1 = require("./PoolKeys");
var RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
var RAYDIUM_POOL_V4_PROGRAM_ID_5Q = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
var SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";
var PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map(function (i) { return parseInt(i); });
var PUBLIC_KEY = new web3_js_1.PublicKey(process.env.PUBLIC_KEY);
var trackingTime = 36000000;
var onePoolTrackingTime = 30000;
var onePoolPriceTrackingTime = 5400000;
var maxWeakTradeTime = 400000;
var clearVolumeTrackingTime = 180000;
var noActivityForLongTime = 1800000;
var minSolanaVolume = 4.5;
var SOL_PRICE = 127.9;
var ONE_TRADE = 0.02;
var FIRST_TAKE = 400;
var FIRST_AMOUNT = 1;
var SECOND_TAKE = 500;
var SECOND_AMOUNT = 0.5;
var THIRD_TAKE = 1000;
var THIRD_AMOUNT = 1;
var LOWER_LIQUIDITY = 500;
var UPPER_LIQUIDITY = 20000;
var volumes = {};
var trades = {};
var priceCheckers = [];
var poolsClosedByTime = [];
var onLogsIds = [];
var seenTransactions = [];
var poolActivityConnection = new web3_js_1.Connection("https://young-holy-wind.solana-mainnet.quiknode.pro/a083d935a747abe09c2f408f19dbde37eb19c761/", "confirmed");
var volumeConnection = new web3_js_1.Connection("https://twilight-cosmopolitan-waterfall.solana-mainnet.quiknode.pro/d38eb6da17a000b95bec10c6c79161325bf814be/", "confirmed");
var newPoolsConnection = new web3_js_1.Connection("https://boldest-prettiest-water.solana-mainnet.quiknode.pro/467f79bc0d43e22464295523012978be5babd16e/", { wsEndpoint: "wss://boldest-prettiest-water.solana-mainnet.quiknode.pro/467f79bc0d43e22464295523012978be5babd16e/",
    commitment: "confirmed" });
var newPoolTransactionConnection = new web3_js_1.Connection("https://attentive-aged-hexagon.solana-mainnet.quiknode.pro/b1c3ae52eb51984781aed8cede1da4e34bde3625/", "confirmed");
var poolKeysConnection = new web3_js_1.Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed");
var swapConnection = new web3_js_1.Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed");
var liquidityConnection = new web3_js_1.Connection("https://solitary-morning-shadow.solana-mainnet.quiknode.pro/e08e7c4c05bbbde0beb8a79c77558fe5882308b2/", "confirmed");
var priceConnection = new web3_js_1.Connection("https://bitter-twilight-moon.solana-mainnet.quiknode.pro/bfc04aa1f52ba227fc0818642ea6d61ebbd0327b/", { wsEndpoint: "wss://bitter-twilight-moon.solana-mainnet.quiknode.pro/bfc04aa1f52ba227fc0818642ea6d61ebbd0327b/", commitment: "confirmed" });
var poolKeys = new PoolKeys_1.default(poolKeysConnection);
var raydiumSwap = new RaydiumSwap_1.default(swapConnection, PRIVATE_KEY);
var readNew = true;
var lastDate = Date.now();
function subscribeToNewRaydiumPools() {
    var _this = this;
    console.log("Program started working at ".concat((new Date()).toLocaleString()));
    newPoolsConnection.onLogs(new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID), function (_a) {
        var logs = _a.logs, err = _a.err, signature = _a.signature;
        return __awaiter(_this, void 0, void 0, function () {
            var tx, i, initInstruction, poolKey, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!readNew)
                            return [2 /*return*/];
                        if (err)
                            return [2 /*return*/];
                        if (seenTransactions.includes(signature)) {
                            return [2 /*return*/];
                        }
                        if (!(logs && (logs.some(function (log) { return log.includes("initialize2"); }) ||
                            logs.some(function (log) { return log.includes("init_pc_amount"); })))) {
                            return [2 /*return*/];
                        }
                        console.log("new pool created, signature - " + signature);
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < 3)) return [3 /*break*/, 4];
                        return [4 /*yield*/, getTransaction(signature)];
                    case 2:
                        tx = _b.sent();
                        if (tx) {
                            return [3 /*break*/, 4];
                        }
                        _b.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        if (!tx) {
                            console.log("no transaction for ".concat(signature));
                            return [2 /*return*/];
                        }
                        seenTransactions.push(signature);
                        initInstruction = poolKeys.findInstructionByProgramId(tx.transaction.message.instructions, new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID));
                        if (!initInstruction) {
                            console.log('Failed to find lp init instruction in lp init tx');
                            return [2 /*return*/];
                        }
                        poolKey = initInstruction.accounts[4];
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, processPool(poolKey, tx)];
                    case 6:
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _b.sent();
                        console.log(err_1.message + " for pool " + poolKey + ", signature: " + signature);
                        //console.log(tx)
                        //console.log(tx.transaction.message.accountKeys)
                        return [2 /*return*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }, "confirmed");
    setTimeout(function () { stopNewReadings(); }, trackingTime);
    setTimeout(function () { readNew = false; }, trackingTime - 3600000);
}
function getTransaction(signature) {
    return __awaiter(this, void 0, void 0, function () {
        var parsedTransaction, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, newPoolTransactionConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                case 1:
                    parsedTransaction = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _a.sent();
                    return [2 /*return*/];
                case 3: return [2 /*return*/, parsedTransaction];
            }
        });
    });
}
function processPool(poolKey, tx) {
    return __awaiter(this, void 0, void 0, function () {
        var liquidity, price, keys;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkLiquidity(poolKey, true, true)];
                case 1:
                    liquidity = _a.sent();
                    if (liquidity === 0 || isNaN(liquidity)) {
                        console.log(tx.transaction.signatures[0] + " - bad pool key at " + (new Date()).toLocaleString());
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, checkPrice(poolKey)];
                case 2:
                    price = _a.sent();
                    console.log("Added pool to track with ".concat(liquidity * SOL_PRICE, " liquidity, poolKey: ").concat(poolKey.toString(), " at ").concat((new Date()).toLocaleString()));
                    addPoolTracking(poolKey, liquidity, tx, price);
                    return [4 /*yield*/, poolKeys.fetchPoolKeysForLPInitTransaction(volumes[poolKey.toString()].created)];
                case 3:
                    keys = _a.sent();
                    saveDictionaryAsJSON(keys, keys.baseMint);
                    return [2 /*return*/];
            }
        });
    });
}
function saveDictionaryAsJSON(dictionary, baseMint) {
    if (baseMint.toString() === SOL_MINT_ADDRESS) {
        console.log("Pool base vault is sol");
        return;
    }
    var fileName = "new_pools/".concat(baseMint.toString(), "_poolInfo.json"); // Using baseMint as part of the file name
    var jsonContent = JSON.stringify(dictionary, null, 2);
    fs.writeFileSync(fileName, jsonContent, 'utf-8');
    console.log("Dictionary saved to ".concat(fileName));
}
function checkLiquidity(poolKey, print, includeUpper) {
    return __awaiter(this, void 0, void 0, function () {
        var quoteTokenAmount, info, poolState, err_3, quote, liquidity, statement;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, liquidityConnection.getAccountInfo(poolKey, "confirmed")];
                case 1:
                    info = _a.sent();
                    if (!info) {
                        console.log("no liquidity info((");
                        return [2 /*return*/, 0];
                    }
                    poolState = raydium_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
                    return [4 /*yield*/, liquidityConnection.getTokenAccountBalance(poolState.quoteVault)];
                case 2:
                    quoteTokenAmount = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.log(err_3.message + " for " + poolKey.toString());
                    return [2 /*return*/, 0];
                case 4:
                    quote = quoteTokenAmount.value.uiAmount;
                    liquidity = quote * 2;
                    statement = includeUpper ? (liquidity * SOL_PRICE > UPPER_LIQUIDITY) : false;
                    if (liquidity * SOL_PRICE < LOWER_LIQUIDITY || statement) {
                        if (print)
                            console.log("Insufficient liquidity for ".concat(poolKey.toString(), ": ").concat(liquidity * SOL_PRICE, "$"));
                        return [2 /*return*/, 0];
                    }
                    return [2 /*return*/, liquidity];
            }
        });
    });
}
function checkPrice(poolKey) {
    return __awaiter(this, void 0, void 0, function () {
        var info, poolState, quoteTokenAmount, baseTokenAmount, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, priceConnection.getAccountInfo(poolKey, "confirmed")];
                case 1:
                    info = _a.sent();
                    if (!info) {
                        console.log("no price info((");
                        return [2 /*return*/];
                    }
                    poolState = raydium_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
                    return [4 /*yield*/, priceConnection.getTokenAccountBalance(poolState.quoteVault)];
                case 2:
                    quoteTokenAmount = _a.sent();
                    return [4 /*yield*/, priceConnection.getTokenAccountBalance(poolState.baseVault)];
                case 3:
                    baseTokenAmount = _a.sent();
                    if (!quoteTokenAmount.value.uiAmount || !baseTokenAmount.value.uiAmount)
                        return [2 /*return*/];
                    return [2 /*return*/, quoteTokenAmount.value.uiAmount / baseTokenAmount.value.uiAmount];
                case 4:
                    err_4 = _a.sent();
                    console.log(err_4.message + " for " + poolKey.toString());
                    return [2 /*return*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function checkBuyPrice(mint) {
    return __awaiter(this, void 0, void 0, function () {
        var tokenAccount, amount, price;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, poolKeysConnection.getTokenAccountsByOwner(PUBLIC_KEY, { mint: mint }, "confirmed")];
                case 1:
                    tokenAccount = _a.sent();
                    return [4 /*yield*/, poolKeysConnection.getTokenAccountBalance(tokenAccount.value[0].pubkey, "confirmed")];
                case 2:
                    amount = _a.sent();
                    price = ONE_TRADE / amount.value.uiAmount * SOL_PRICE;
                    //console.log(`Bought ${Math.round(amount.value.uiAmount*1000)/1000} tokens at ${price}$`)
                    return [2 /*return*/, price];
            }
        });
    });
}
function addPoolTracking(poolKey, liquidity, creationTransaction, price) {
    var _this = this;
    var poolId = poolKey.toString();
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
    };
    var onLogsId = poolActivityConnection.onLogs(poolKey, function (_a) {
        var logs = _a.logs, err = _a.err, signature = _a.signature;
        return __awaiter(_this, void 0, void 0, function () {
            var tx, err_5, preBalance, preSolBalance, postBalance, postSolBalance, volumeRaw, price_1, cleared, keys, cleared;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (volumes[poolId].liquidity === 0)
                            return [2 /*return*/];
                        if (err)
                            return [2 /*return*/];
                        //check if pool is on tracking
                        if (!onLogsIds.includes(onLogsId)) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, volumeConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                    case 2:
                        tx = _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_5 = _b.sent();
                        return [2 /*return*/];
                    case 4:
                        if (!tx) {
                            return [2 /*return*/];
                        }
                        if ((tx.blockTime * 1000 - volumes[poolId].created.blockTime * 1000) < 5000) {
                            return [2 /*return*/];
                        }
                        preBalance = tx.meta.preTokenBalances.find(function (a) {
                            if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
                                return true;
                            }
                            return false;
                        });
                        if (!preBalance) {
                            return [2 /*return*/];
                        }
                        preSolBalance = preBalance.uiTokenAmount.uiAmount;
                        postBalance = tx.meta.postTokenBalances.find(function (a) {
                            if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
                                return true;
                            }
                            return false;
                        });
                        if (!postBalance) {
                            return [2 /*return*/];
                        }
                        postSolBalance = postBalance.uiTokenAmount.uiAmount;
                        volumeRaw = preSolBalance - postSolBalance;
                        //check if tx contains any balance changes
                        if (Math.abs(volumeRaw) > 15)
                            return [2 /*return*/];
                        //check if pool still on tracking
                        if (!onLogsIds.includes(onLogsId)) {
                            return [2 /*return*/];
                        }
                        //set first tx time if havent done yet
                        if (!volumes[poolId].firstTxTime) {
                            volumes[poolId].firstTxTime = tx.blockTime * 1000;
                        }
                        volumes[poolId].lastTxTime = tx.blockTime * 1000;
                        volumes[poolId].volume += (Math.abs(volumeRaw));
                        //pool has less SOL now
                        if (volumeRaw > 0) {
                            volumes[poolId].buyVolume += volumeRaw;
                            //pool has more SOL now
                        }
                        else {
                            volumes[poolId].sellVolume += (-volumeRaw);
                        }
                        volumes[poolId].transactions += 1;
                        if (!((tx.blockTime * 1000 - volumes[poolId].firstTxTime) > onePoolTrackingTime)) return [3 /*break*/, 18];
                        if (!volumes[poolId].secondChancePool) return [3 /*break*/, 6];
                        return [4 /*yield*/, checkVolume(poolKey, poolId, false)];
                    case 5:
                        price_1 = _b.sent();
                        return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, checkVolume(poolKey, poolId, true)];
                    case 7:
                        price_1 = _b.sent();
                        _b.label = 8;
                    case 8:
                        if (!(price_1 === -1)) return [3 /*break*/, 10];
                        if (volumes[poolId].liquidity === 0)
                            return [2 /*return*/];
                        volumes[poolId].liquidity = 0;
                        return [4 /*yield*/, clearVolumeTracking(poolId, onLogsId)];
                    case 9:
                        cleared = _b.sent();
                        if (cleared) {
                            console.log("Price dropped too much for " + poolId);
                        }
                        return [2 /*return*/];
                    case 10:
                        if (!(price_1 === -5)) return [3 /*break*/, 11];
                        console.log("No price obtained, closing trade " + poolId);
                        return [2 /*return*/];
                    case 11:
                        if (!(price_1 && volumes[poolId].transactions >= 10)) return [3 /*break*/, 15];
                        return [4 /*yield*/, clearVolumeTracking(poolId, onLogsId)];
                    case 12:
                        _b.sent();
                        return [4 /*yield*/, poolKeys.fetchPoolKeysForLPInitTransaction(volumes[poolId].created)];
                    case 13:
                        keys = _b.sent();
                        if (volumes[poolId].startPrice)
                            return [2 /*return*/];
                        console.log("Sufficient volume, searching for pool keys " + poolId);
                        volumes[poolId].startPrice = price_1;
                        volumes[poolId].maxPrice = price_1;
                        return [4 /*yield*/, addTrade(keys, price_1)];
                    case 14:
                        _b.sent();
                        return [3 /*break*/, 18];
                    case 15:
                        if (!(volumes[poolId].trackings < 3)) return [3 /*break*/, 16];
                        if (volumes[poolId].firstTxTime === tx.blockTime * 1000)
                            return [2 /*return*/];
                        console.log("Volume for ".concat(poolId, " is insufficient: ").concat(volumes[poolId].volume, ", trying one more time"));
                        volumes[poolId].firstTxTime = tx.blockTime * 1000;
                        volumes[poolId].trackings += 1;
                        volumes[poolId].previousVolume = volumes[poolId].volume;
                        volumes[poolId].volume = 0;
                        volumes[poolId].transactions = 0;
                        volumes[poolId].sellVolume = 0;
                        volumes[poolId].buyVolume = 0;
                        volumes[poolId].secondChancePool = true;
                        return [3 /*break*/, 18];
                    case 16:
                        if (volumes[poolId].liquidity === 0)
                            return [2 /*return*/];
                        volumes[poolId].liquidity = 0;
                        return [4 /*yield*/, clearVolumeTracking(poolId, onLogsId)];
                    case 17:
                        cleared = _b.sent();
                        if (cleared) {
                            console.log("Insufficient volume for ".concat(poolKey, ": ").concat(volumes[poolId].volume, " tried ").concat(volumes[poolId].trackings + 1, " times"));
                        }
                        _b.label = 18;
                    case 18: return [2 /*return*/];
                }
            });
        });
    }, "confirmed");
    //console.log(onLogsId)
    onLogsIds.push(onLogsId);
    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var cleared;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, clearVolumeTracking(poolId, onLogsId)];
                case 1:
                    cleared = _a.sent();
                    if (cleared) {
                        volumes[poolId].liquidity = 0;
                    }
                    return [2 /*return*/];
            }
        });
    }); }, clearVolumeTrackingTime);
}
function clearVolumeTracking(poolId, onLogsId) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (onLogsIds.includes(onLogsId)) {
                volumes[poolId].finish = Date.now();
                poolActivityConnection.removeOnLogsListener(onLogsId);
                onLogsIds.splice(onLogsIds.indexOf(onLogsId), 1);
                console.log("stopped tracking pool " + poolId + " at " + (new Date()).toLocaleString());
                return [2 /*return*/, true];
            }
            return [2 /*return*/, false];
        });
    });
}
//if sufficient returns current price else false
function checkVolume(poolKey, poolId, includeUpper) {
    return __awaiter(this, void 0, void 0, function () {
        var liquidity, price, statement;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkLiquidity(poolKey, false, false)];
                case 1:
                    liquidity = _a.sent();
                    return [4 /*yield*/, checkPrice(poolKey)];
                case 2:
                    price = _a.sent();
                    if (!price) {
                        return [2 /*return*/, -5];
                    }
                    if (liquidity === 0) {
                        return [2 /*return*/, -1];
                    }
                    if ((price - volumes[poolId].volumeCheckingStartPrice) / volumes[poolId].volumeCheckingStartPrice < -0.7) {
                        return [2 /*return*/, -1];
                    }
                    statement = includeUpper ? (volumes[poolId].volume / volumes[poolId].liquidity < 0.8) : true;
                    if (!(volumes[poolId].liquidity === 0) &&
                        (volumes[poolId].volume / volumes[poolId].liquidity > 0.15 &&
                            statement &&
                            volumes[poolId].volume > minSolanaVolume)) {
                        return [2 /*return*/, price];
                    }
                    else {
                        //console.log(`Insufficient volume for ${poolKey}: ${volumes[poolId].volume/volumes[poolId].liquidity}`)
                        return [2 /*return*/, false];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function addTrade(keys, price) {
    return __awaiter(this, void 0, void 0, function () {
        var txid;
        var _this = this;
        return __generator(this, function (_a) {
            try {
                //txid = await buyToken(keys, true, true, ONE_TRADE)
                volumes[keys.id.toString()].bought = volumes[keys.id.toString()].liquidity;
                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, processBuyTx("****", keys, price)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); }, 15000);
            }
            catch (err) {
                console.log("error happened during swap: " + err.message);
            }
            return [2 /*return*/];
        });
    });
}
function processBuyTx(txid, keys, price) {
    return __awaiter(this, void 0, void 0, function () {
        var poolId;
        return __generator(this, function (_a) {
            poolId = keys.id.toString();
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
            addChecker(keys, poolId);
            return [2 /*return*/];
        });
    });
}
function addChecker(keys, poolId) {
    var _this = this;
    var interval = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
        var price;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkPrice(keys.id)];
                case 1:
                    price = _a.sent();
                    if (!price)
                        return [2 /*return*/];
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
                    if (price > volumes[poolId].maxPrice) {
                        if (price / volumes[poolId].maxPrice > 3)
                            return [2 /*return*/];
                        volumes[poolId].maxPrice = price;
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
                    return [2 /*return*/];
            }
        });
    }); }, 5000);
    priceCheckers.push(interval);
    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var liquidity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkLiquidity(keys.id, false, false)];
                case 1:
                    liquidity = _a.sent();
                    if (!liquidity || liquidity === 0) {
                        volumes[poolId].liquidity = 0;
                    }
                    closeTrade(poolId, interval);
                    return [2 /*return*/];
            }
        });
    }); }, onePoolPriceTrackingTime);
    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var price, change;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkPrice(keys.id)];
                case 1:
                    price = _a.sent();
                    change = Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice) / volumes[poolId].startPrice * 100);
                    if (((Date.now() - volumes[poolId].start) > maxWeakTradeTime &&
                        change < 30 && change > 0)) {
                        closeTrade(poolId, interval);
                        poolsClosedByTime.push(poolId);
                        volumes[poolId].maxPrice = price;
                    }
                    else if (change > 200) {
                        volumes[poolId].quicklyReachedFirstTake = true;
                    }
                    return [2 /*return*/];
            }
        });
    }); }, maxWeakTradeTime);
    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
        var price, change;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, checkPrice(keys.id)];
                case 1:
                    price = _a.sent();
                    change = Math.round((price - volumes[poolId].startPrice) / volumes[poolId].startPrice * 100);
                    if (change < -80) {
                        closeTrade(poolId, interval);
                        poolsClosedByTime.push(poolId);
                        if (price) {
                            volumes[poolId].maxPrice = price;
                        }
                    }
                    return [2 /*return*/];
            }
        });
    }); }, noActivityForLongTime);
}
function closeTrade(poolId, interval) {
    if (priceCheckers.includes(interval)) {
        var int = priceCheckers.splice(priceCheckers.indexOf(interval), 1);
        if (!int)
            return;
        clearInterval(interval);
        var profit = (Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice) / volumes[poolId].startPrice * 100) + "%");
        console.log("Stopped reading price of ".concat(poolId, " at ").concat((new Date()).toLocaleString(), ", max profit: ").concat(profit));
    }
}
function checkAndTake(poolId, baseMint, take, amount) {
    return __awaiter(this, void 0, void 0, function () {
        var growth, sellAmount_1, sellId_1, err_6;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    growth = Math.round((volumes[poolId].maxPrice - volumes[poolId].startPrice) / volumes[poolId].startPrice * 100);
                    if (!(growth > take)) return [3 /*break*/, 4];
                    trades[poolId].tp = true;
                    sellAmount_1 = trades[poolId].amountBuySpl * amount;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, sellToken(trades[poolId].keys, true, true, sellAmount_1)];
                case 2:
                    sellId_1 = _a.sent();
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, processSellTx(poolId, baseMint, take, sellAmount_1, sellId_1)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); }, 15000);
                    return [3 /*break*/, 4];
                case 3:
                    err_6 = _a.sent();
                    console.log("error happened during processing buy transaction: " + err_6.message);
                    trades[poolId].tp = false;
                    return [2 /*return*/];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function processSellTx(poolId, baseMint, take, sellAmount, sellId) {
    return __awaiter(this, void 0, void 0, function () {
        var sellTx, err_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, swapConnection.getParsedTransaction(sellId, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                case 1:
                    sellTx = _a.sent();
                    if (!sellTx || sellTx.meta.err) {
                        console.log("Buy ransaction returned error, " + sellId);
                        trades[poolId].tp = false;
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    err_7 = _a.sent();
                    console.log("error happened during processing buy transaction: " + err_7.message);
                    return [3 /*break*/, 3];
                case 3:
                    trades[poolId].sellTx.push(sellId);
                    trades[poolId].amountBuySpl -= sellAmount;
                    console.log("Sold ".concat(baseMint.toString(), " +").concat(take, "% at ").concat((new Date()).toLocaleString()));
                    trades[poolId].profit = 400;
                    return [4 /*yield*/, printWalletBalance()];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function sellToken(keys, useVersionedTransaction, executeSwap, splTokenAmount) {
    return __awaiter(this, void 0, void 0, function () {
        var tx, txid, _a, simRes, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, raydiumSwap.getSwapTransaction(keys.quoteMint.toString(), splTokenAmount, keys, 100000, // Max amount of lamports
                    useVersionedTransaction, 'in')];
                case 1:
                    tx = _c.sent();
                    if (!executeSwap) return [3 /*break*/, 6];
                    if (!useVersionedTransaction) return [3 /*break*/, 3];
                    return [4 /*yield*/, raydiumSwap.sendVersionedTransaction(tx)];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, raydiumSwap.sendLegacyTransaction(tx)];
                case 4:
                    _a = _c.sent();
                    _c.label = 5;
                case 5:
                    txid = _a;
                    return [2 /*return*/, txid];
                case 6:
                    if (!useVersionedTransaction) return [3 /*break*/, 8];
                    return [4 /*yield*/, raydiumSwap.simulateVersionedTransaction(tx)];
                case 7:
                    _b = _c.sent();
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, raydiumSwap.simulateLegacyTransaction(tx)];
                case 9:
                    _b = _c.sent();
                    _c.label = 10;
                case 10:
                    simRes = _b;
                    console.log(simRes);
                    _c.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function buyToken(keys, useVersionedTransaction, executeSwap, tokenAAmount) {
    return __awaiter(this, void 0, void 0, function () {
        var tx, txid, _a, simRes, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, raydiumSwap.getSwapTransaction(keys.baseMint.toString(), tokenAAmount, keys, 100000, // Max amount of lamports
                    useVersionedTransaction, 'in')];
                case 1:
                    tx = _c.sent();
                    if (!executeSwap) return [3 /*break*/, 6];
                    if (!useVersionedTransaction) return [3 /*break*/, 3];
                    return [4 /*yield*/, raydiumSwap.sendVersionedTransaction(tx)];
                case 2:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, raydiumSwap.sendLegacyTransaction(tx)];
                case 4:
                    _a = _c.sent();
                    _c.label = 5;
                case 5:
                    txid = _a;
                    return [2 /*return*/, txid];
                case 6:
                    if (!useVersionedTransaction) return [3 /*break*/, 8];
                    return [4 /*yield*/, raydiumSwap.simulateVersionedTransaction(tx)];
                case 7:
                    _b = _c.sent();
                    return [3 /*break*/, 10];
                case 8: return [4 /*yield*/, raydiumSwap.simulateLegacyTransaction(tx)];
                case 9:
                    _b = _c.sent();
                    _c.label = 10;
                case 10:
                    simRes = _b;
                    console.log(simRes);
                    _c.label = 11;
                case 11: return [2 /*return*/];
            }
        });
    });
}
function stopNewReadings() {
    lastDate = Date.now();
    console.log("stopped reading new pools at ".concat((new Date(lastDate)).toLocaleString()));
    for (var id in priceCheckers) {
        clearInterval(priceCheckers[id]);
    }
    setTimeout(function () { printDataAndKill(); }, onePoolTrackingTime);
}
function printDataAndKill() {
    console.log("All pools");
    printPools(function (id) { return true; });
    console.log("Non zero liquidity pools");
    printPools(function (id) { return volumes[id].liquidity !== 0 ? true : false; });
    console.log("Second chance pools");
    printPools(function (id) { return (volumes[id].secondChancePool && volumes[id].bought) ? true : false; });
    console.log("Pools closed by time");
    printPools(function (id) { return (volumes[id].liquidity !== 0 && poolsClosedByTime.includes(id)) ? true : false; });
    console.log("Profitable pools");
    printPools(function (id) {
        return (volumes[id].liquidity !== 0 && (volumes[id].maxPrice - volumes[id].startPrice) / volumes[id].startPrice) > 2 ? true : false;
    });
    console.log("Unprofitable pools");
    printPools(function (id) {
        return (volumes[id].liquidity !== 0 && (volumes[id].maxPrice - volumes[id].startPrice) / volumes[id].startPrice) < 0 ? true : false;
    });
    console.log("Quickly reached 200 percent profit(in 360 sec)");
    printPools(function (id) { return (volumes[id].liquidity !== 0 && volumes[id].quicklyReachedFirstTake) ? true : false; });
    console.log("Bought");
    printPools(function (id) { return (volumes[id].bought) ? true : false; });
    printCoinsPercentagesCount();
    console.log(calculateOverallProfit());
    console.log("Program ended working at " + (new Date()).toLocaleString());
    throw new Error("stop");
}
var a = function (i) { return i < 5 ? true : false; };
function printPools(filter) {
    var dataToPrint = [];
    for (var id in volumes) {
        if (!volumes[id].finish)
            volumes[id].finish = lastDate;
        if (!filter(id))
            continue;
        dataToPrint.push({
            "Pool": id,
            "Liquidity": (Math.round(volumes[id].liquidity * SOL_PRICE * 1000) / 1000),
            "Volume": (Math.round(volumes[id].volume * SOL_PRICE * 1000) / 1000),
            "Txs": volumes[id].transactions,
            "Buy Vol": (Math.round(volumes[id].buyVolume * SOL_PRICE * 1000) / 1000),
            "Sell Vol": (Math.round(volumes[id].sellVolume * SOL_PRICE * 1000) / 1000),
            "First Tx": new Date(volumes[id].firstTxTime).toLocaleString().slice(11, 19),
            "Last Tx": new Date(volumes[id].lastTxTime).toLocaleString().slice(11, 19),
            "Max": (Math.round((volumes[id].maxPrice - volumes[id].startPrice) / volumes[id].startPrice * 100) + "%")
        });
    }
    console.table(dataToPrint);
}
function printCoinsPercentagesCount() {
    var percentages = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var id in volumes) {
        if (volumes[id].liquidity === 0)
            continue;
        var percentage = Math.round((volumes[id].maxPrice - volumes[id].startPrice) / volumes[id].startPrice * 100);
        if (isNaN(percentage))
            continue;
        if (percentage < -20 || percentage === 0) {
            percentages[0] += 1;
        }
        if (percentage >= -20 && percentage <= 50) {
            percentages[1] += 1;
        }
        if (percentage > 50) {
            percentages[2] += 1;
        }
        if (percentage > 100) {
            percentages[3] += 1;
        }
        if (percentage > 150) {
            percentages[4] += 1;
        }
        if (percentage > 200) {
            percentages[5] += 1;
        }
        if (percentage > 300) {
            percentages[6] += 1;
        }
        if (percentage > 400) {
            percentages[7] += 1;
        }
        if (percentage > 500) {
            percentages[8] += 1;
        }
        if (percentage > 600) {
            percentages[9] += 1;
        }
        if (percentage > 700) {
            percentages[10] += 1;
        }
        if (percentage > 800) {
            percentages[11] += 1;
        }
        if (percentage > 900) {
            percentages[12] += 1;
        }
        if (percentage > 1000) {
            percentages[13] += 1;
        }
    }
    var resultTable = [];
    resultTable.push({ "-100": percentages[0] });
    resultTable.push({ "~0": percentages[1] });
    resultTable.push({ ">50": percentages[2] });
    resultTable.push({ ">100": percentages[3] });
    resultTable.push({ ">150": percentages[4] });
    resultTable.push({ ">200": percentages[5] });
    resultTable.push({ ">300": percentages[6] });
    resultTable.push({ ">400": percentages[7] });
    resultTable.push({ ">500": percentages[8] });
    resultTable.push({ ">600": percentages[9] });
    resultTable.push({ ">700": percentages[10] });
    resultTable.push({ ">800": percentages[11] });
    resultTable.push({ ">900": percentages[12] });
    resultTable.push({ ">1000": percentages[13] });
    console.table(resultTable);
}
function calculateOverallProfit() {
    var profit = 0;
    for (var id in volumes) {
        if (volumes[id].liquidity === 0)
            continue;
        var percentage = Math.round((volumes[id].maxPrice - volumes[id].startPrice) / volumes[id].startPrice * 100);
        if (percentage < 400) {
            profit -= 100;
        }
        else {
            profit += 400;
        }
    }
    return profit;
}
function printWalletBalance() {
    return __awaiter(this, void 0, void 0, function () {
        var solanaBalance;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, poolKeysConnection.getBalance(PUBLIC_KEY)];
                case 1:
                    solanaBalance = _a.sent();
                    console.log("Solana balance: ".concat(solanaBalance / web3_js_1.LAMPORTS_PER_SOL, " SOL"));
                    return [2 /*return*/];
            }
        });
    });
}
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, printWalletBalance()];
            case 1:
                _a.sent();
                subscribeToNewRaydiumPools();
                return [2 /*return*/];
        }
    });
}); })();
