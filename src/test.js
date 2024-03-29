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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var web3_js_1 = require("@solana/web3.js");
var raydium_sdk_1 = require("@raydium-io/raydium-sdk");
var fs = require("fs");
var dotenv = require("dotenv");
var PoolKeys_1 = require("./PoolKeys");
var RaydiumSwap_1 = require("./RaydiumSwap");
dotenv.config({ path: '../.env' });
var PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map(function (i) { return parseInt(i); });
var poolKeysConnection = new web3_js_1.Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed");
var buyConnection = new web3_js_1.Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed");
var sellConnection = new web3_js_1.Connection("https://attentive-aged-hexagon.solana-mainnet.quiknode.pro/b1c3ae52eb51984781aed8cede1da4e34bde3625/", "confirmed");
/*
benchmark to compare raydium vs jupiter swaps
track bros txs with volumes included
*/
// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
var RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
var SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";
var RAYDIUM_POOL_V4_PROGRAM_ID_5Q = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
var PUBLIC_KEY = new web3_js_1.PublicKey(process.env.PUBLIC_KEY);
var poolKeys = new PoolKeys_1.default(poolKeysConnection);
var raydiumSwapBuy = new RaydiumSwap_1.default(buyConnection, PRIVATE_KEY);
var raydiumSwapSell = new RaydiumSwap_1.default(buyConnection, PRIVATE_KEY);
var swapTx;
var allPoolKeys;
var targetPoolKeys;
//configs
var targetMint = "BMTwySvon2H22SawT6m94ov1BwYgRH3RqiwBo5UPCNPr";
var buy = false;
var SOL_PRICE = 147.71;
var ONE_TRADE = 0.5;
var salePart = 1.0;
function perform() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getPoolKeys(targetMint)];
                case 1:
                    targetPoolKeys = _a.sent();
                    if (!!targetPoolKeys) return [3 /*break*/, 3];
                    console.log("no preloaded keys, fetching raydium...");
                    return [4 /*yield*/, loadPoolKeys()];
                case 2:
                    allPoolKeys = _a.sent();
                    targetPoolKeys = findPoolInfoForTokens(targetMint, SOL_MINT_ADDRESS);
                    if (!targetPoolKeys) {
                        console.log("no pool keys found on raydium...");
                        return [2 /*return*/];
                    }
                    saveDictionaryAsJSON(targetPoolKeys, targetPoolKeys.baseMint);
                    _a.label = 3;
                case 3: return [4 /*yield*/, swap(targetPoolKeys)
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
                ];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getPoolKeys(targetMint) {
    return __awaiter(this, void 0, void 0, function () {
        var fileName, poolKeys_1;
        return __generator(this, function (_a) {
            fileName = "new_pools/".concat(targetMint, "_poolInfo.json");
            try {
                poolKeys_1 = (0, raydium_sdk_1.jsonInfo2PoolKeys)(JSON.parse(fs.readFileSync(fileName, 'utf-8')));
                return [2 /*return*/, poolKeys_1];
            }
            catch (err) {
                //console.log("no such token pool keys found " + targetMint)
                //const poolKeys = jsonInfo2PoolKeys(JSON.parse(fs.readFileSync(fileName, 'utf-8'))) as LiquidityPoolKeysV4
            }
            return [2 /*return*/];
        });
    });
}
function loadPoolKeys() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var liquidityJsonResp, liquidityJson, allPoolKeysJson;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json')];
                case 1:
                    liquidityJsonResp = _c.sent();
                    if (!liquidityJsonResp.ok)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, liquidityJsonResp.json()];
                case 2:
                    liquidityJson = (_c.sent());
                    allPoolKeysJson = __spreadArray(__spreadArray([], ((_a = liquidityJson === null || liquidityJson === void 0 ? void 0 : liquidityJson.official) !== null && _a !== void 0 ? _a : []), true), ((_b = liquidityJson === null || liquidityJson === void 0 ? void 0 : liquidityJson.unOfficial) !== null && _b !== void 0 ? _b : []), true);
                    return [2 /*return*/, allPoolKeysJson];
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
function findPoolInfoForTokens(mintA, mintB) {
    var poolData = allPoolKeys.find(function (i) { return (i.baseMint === mintA && i.quoteMint === mintB) || (i.baseMint === mintB && i.quoteMint === mintA); });
    //console.log(poolData);
    if (!poolData)
        return null;
    return (0, raydium_sdk_1.jsonInfo2PoolKeys)(poolData);
}
function swap(keys) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, createTranscations(buy, keys)];
                case 1:
                    _a.sent();
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                        var txId;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!swapTx) {
                                        console.log("No tx");
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, raydiumSwapBuy.sendVersionedTransaction(swapTx)];
                                case 1:
                                    txId = _a.sent();
                                    console.log("".concat(buy ? "Buy " : "Sell ", "transaction: https://solscan.io/tx/").concat(txId));
                                    return [2 /*return*/];
                            }
                        });
                    }); }, 3000);
                    return [2 /*return*/];
            }
        });
    });
}
function createTranscations(buy, keys) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, amountIn, amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee, err_1, tokenAccount, amountBuySpl, _b, amountIn, amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee, err_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!buy) return [3 /*break*/, 6];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, raydiumSwapBuy.calcAmountOut(keys, ONE_TRADE, false)];
                case 2:
                    _a = _c.sent(), amountIn = _a.amountIn, amountOut = _a.amountOut, minAmountOut = _a.minAmountOut, currentPrice = _a.currentPrice, executionPrice = _a.executionPrice, priceImpact = _a.priceImpact, fee = _a.fee;
                    console.log("Buying token for ".concat(ONE_TRADE, " SOL"));
                    console.log(1 / (parseFloat(executionPrice.toSignificant())) * SOL_PRICE);
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _c.sent();
                    console.log(err_1.message);
                    return [2 /*return*/];
                case 4: return [4 /*yield*/, raydiumSwapBuy.getSwapTransaction(keys.baseMint.toString(), ONE_TRADE, keys, 100000, // Max amount of lamports
                    true, 'in')];
                case 5:
                    swapTx = _c.sent();
                    return [3 /*break*/, 14];
                case 6: return [4 /*yield*/, poolKeysConnection.getTokenAccountsByOwner(PUBLIC_KEY, { mint: keys.baseMint }, "confirmed")];
                case 7:
                    tokenAccount = _c.sent();
                    if (!tokenAccount.value[0]) {
                        console.log("No token balance found");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, poolKeysConnection.getTokenAccountBalance(tokenAccount.value[0].pubkey, "confirmed")];
                case 8:
                    amountBuySpl = _c.sent();
                    if (amountBuySpl.value.uiAmount == 0) {
                        console.log("zero token balance present");
                        return [2 /*return*/];
                    }
                    _c.label = 9;
                case 9:
                    _c.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, raydiumSwapBuy.calcAmountOut(keys, amountBuySpl.value.uiAmount, true)];
                case 10:
                    _b = _c.sent(), amountIn = _b.amountIn, amountOut = _b.amountOut, minAmountOut = _b.minAmountOut, currentPrice = _b.currentPrice, executionPrice = _b.executionPrice, priceImpact = _b.priceImpact, fee = _b.fee;
                    console.log("Selling ".concat(amountBuySpl.value.uiAmount, " tokens"));
                    console.log(parseFloat(executionPrice.toSignificant()) * SOL_PRICE);
                    return [3 /*break*/, 12];
                case 11:
                    err_2 = _c.sent();
                    console.log(err_2.message);
                    return [2 /*return*/];
                case 12: return [4 /*yield*/, raydiumSwapSell.getSwapTransaction(keys.quoteMint.toString(), amountBuySpl.value.uiAmount * salePart, keys, 100000, // Max amount of lamports
                    true, 'in')];
                case 13:
                    swapTx = _c.sent();
                    _c.label = 14;
                case 14: return [2 /*return*/];
            }
        });
    });
}
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, perform()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
function checkVolume(preTokenBalances, postTokenBalances) {
    return __awaiter(this, void 0, void 0, function () {
        var preBalance, preSolBalance, postBalance, postSolBalance, volumeRaw;
        return __generator(this, function (_a) {
            preBalance = preTokenBalances.find(function (a) {
                if (a.mint === SOL_MINT_ADDRESS && a.owner === RAYDIUM_POOL_V4_PROGRAM_ID_5Q) {
                    return true;
                }
                return false;
            });
            if (!preBalance) {
                return [2 /*return*/];
            }
            preSolBalance = preBalance.uiTokenAmount.uiAmount;
            postBalance = postTokenBalances.find(function (a) {
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
            return [2 /*return*/];
        });
    });
}
