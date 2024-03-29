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
var dotenv = require("dotenv");
dotenv.config({ path: '../.env' });
var PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map(function (i) { return parseInt(i); });
var connection = new web3_js_1.Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed");
var txConnection = new web3_js_1.Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed");
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
//const poolKeys: PoolKeys = new PoolKeys(connection)
//const raydiumSwapBuy = new RaydiumSwap(buyConnection, PRIVATE_KEY)
//const raydiumSwapSell = new RaydiumSwap(buyConnection, PRIVATE_KEY)
var swapTx;
var allPoolKeys;
var targetPoolKeys;
//configs
var targetMint = "ArqnmwuaU6bBBpBErYYyVgmeunYZRB94zNUmC7MJEtpR";
var buy = true;
var SOL_PRICE = 147.71;
var ONE_TRADE = 0.01;
var salePart = 1.0;
var trumpMint = "4bPCnkZeNCHwoMHSeaAmrpfrQfjPYNzoCQayVnh7Ay2F";
var trackAddresses = [
    "8SM2hnEPnKiayjQTZeEXpPTgxdgJnxPWZaVp1aockpKJ",
    "43p3ESGeZNP9TPApdyoKh95Sz8gRLWK6q3mG8PAQes6A", //***//
    "EXFQyN3wSD7FpdvAK9u5hkd7WsKDSg4DXrL8UUU4GUKK",
    "FofH56aa7eNxnNdKLxH54fmXKsXCJ9vy552CQWwLRa9Q", //***//
    "BKpr3VtYAuenaYwrtDTeh2ZRAMztqwZJ79AXwDskKpXV",
    "yYNrKPGB7SubT7fXEkfi8jcKXVua3VdsM35MPQw6bYq",
    "4ZMqkDGVep3q8DoZnhJNZFo3FzEuf6FDDnNaQc6CNn98",
    "BE561iVEa7U8vtFAruWNsgVs7Q45x35EfGAiFDMun9mB",
    "BFbCgHxJasyZ4XCYBft7oQqozwGybrgjzVtixdBdds6F",
    "CTM8ukfdSixhqiw4VHF1wjcgrKUEifGRMcJB889F2b18", //***//
    "3P4usxYBMVZ442uh9zTVtkxSids6QzwDQJKhNxt6G4Bv",
    "2msjUav4Bw84mKak1M7BeeGK9Y1YgyeJXEQUM9Uoq3UA",
    "3UzkXLE5LAskaHU1VZNMW6UYdH7uvNAb7rxbztUzLYLo",
    "8zAEavrmkKo2UicrZhVnXfMwCRKHfAVUfugJjTseottH",
    "GXrggPJvF3GsxmLEx3jrxwVMRoqrsyWjC6CgXqSsVv4s",
    "2Fcm8Z3wxjcwjhXiS3mSXeHQY62TYHhNK65zExFWPE6d",
    "J5VB6VP2Uc3KbA4pQxJcngy9ZXekiL7g6fmAdeuFvsKK",
    "CyXAcwWUNso4kyBd3Hrx4454w4F1n5VHcMqg5efZJ9KH",
    "AgZQaGPUjqhTcfHqguRXKzBe72KN7ehxPU28NAn2x8N6",
    "73dd6cZqGnHuSEiGY5mPS6tA6VFeAncAnmV617Gv7LP8",
    "jVTb7rvm1QrH7hwcCSpH4DQtAsuPxSXp9QmPVuqYApQ",
    "55os33LCXP8d4EzmdBhcFdbZq3kYmVgeqcBCgsJLZoSA",
    "9n3upFr62Rg1XR29H918rBu7xjiJobH3XbJRrCxD9QVG",
    "EEWQsjYQmA58Q4fMyh8anuz8ZM3jdEbxCRtwKevVpR6k",
    "8Xjv8z1MEAvzqCwdVNSsJ7Q5LXRmyMmSmRcKXqzkpXna",
    "HoTXmcWfjbTnhoKSXPCA3d1kJMFP3Qw7cmVJyCUQrq5", //***//
    "HT1Do2EKvcg7eK1MSuNGJ6tLu4hbwJWzYcJPBxKaEhzL", //??//
    "E82uKSzbi1YHuEPDkVV93xz5zE7phNeMmENQieyyX3kH",
    "2prt2F2rtW5sXkSZuPGkQtcYcH6NK7X1tp1L6hB3RRtZ",
    "71y4uL4hz4xgX3EB7tuh5mZud9dLkqRUfovHTLV8zmp2",
    "CLAxoa9quAKDq3VeKzJCK5z5a2SeyUGJwV3dTxKDv5nx",
    "FpuPcCiakK4KvebYGgVNx44ncajsEquaJ7arqC12jswu",
    "C9sATWDNThfDg2nREKTCaiJkKu99eBkYpGKCgBLWPjfe", //***//
    "35Q8bW3j7cC2rYkkfu5oX191iLrH8WJ786kAYHSduNpa",
    "JAd1fMqjanAsQTihabZbNVcrxDYL58MGc4mRNp6UR6pL", //***//
    "BenCy4fN9BAVjhAYVoebDuUsru5ryd4NQz2ro39bURDP",
    "FyNrn5ELHtimjCscVqRK11Q59VaH3knzahtcaPpcmSro"
];
function track() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            console.log("Program started working at ".concat((new Date()).toLocaleString()));
            trackAddresses.forEach((function (addr) { return __awaiter(_this, void 0, void 0, function () {
                var account, amount;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            connection.onLogs(new web3_js_1.PublicKey(addr), function (_a) {
                                var signature = _a.signature, err = _a.err, logs = _a.logs;
                                return __awaiter(_this, void 0, void 0, function () {
                                    var tx, i, volume, solanaBalance;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                if (err)
                                                    return [2 /*return*/];
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
                                                return [4 /*yield*/, getVolume(tx)
                                                    //if(!volume) return
                                                ];
                                            case 5:
                                                volume = _b.sent();
                                                return [4 /*yield*/, connection.getBalance(new web3_js_1.PublicKey(addr))];
                                            case 6:
                                                solanaBalance = (_b.sent()) / web3_js_1.LAMPORTS_PER_SOL;
                                                console.log("New transaction on ".concat(addr, " ").concat(volume > 0 ? "bought" : "sold", " tokens for ").concat(Math.abs(volume), " SOL at ").concat(new Date(tx.blockTime * 1000).toLocaleString()));
                                                return [2 /*return*/];
                                        }
                                    });
                                });
                            });
                            return [4 /*yield*/, connection.getTokenAccountsByOwner(new web3_js_1.PublicKey(addr), { mint: new web3_js_1.PublicKey(trumpMint) }, "confirmed")];
                        case 1:
                            account = _a.sent();
                            if (!account.value[0])
                                return [2 /*return*/];
                            return [4 /*yield*/, connection.getTokenAccountBalance(account.value[0].pubkey, "confirmed")];
                        case 2:
                            amount = _a.sent();
                            console.log(addr);
                            if (amount.value.uiAmount != 0) {
                                console.log(addr);
                            }
                            return [2 /*return*/];
                    }
                });
            }); }));
            return [2 /*return*/];
        });
    });
}
function getTransaction(signature) {
    return __awaiter(this, void 0, void 0, function () {
        var parsedTransaction, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, txConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })];
                case 1:
                    parsedTransaction = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    return [2 /*return*/];
                case 3: return [2 /*return*/, parsedTransaction];
            }
        });
    });
}
function getVolume(tx) {
    return __awaiter(this, void 0, void 0, function () {
        var preBalance, preSolBalance, postBalance, postSolBalance, volumeRaw;
        return __generator(this, function (_a) {
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
            volumeRaw = postSolBalance - preSolBalance;
            return [2 /*return*/, volumeRaw];
        });
    });
}
track();
