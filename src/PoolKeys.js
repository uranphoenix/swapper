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
var RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
var SOL_MINT = 'So11111111111111111111111111111111111111112';
var SOL_DECIMALS = 9;
var PoolKeys = /** @class */ (function () {
    function PoolKeys(connection) {
        this.connection = connection;
    }
    PoolKeys.prototype.fetchPoolKeysForLPInitTransaction = function (tx) {
        return __awaiter(this, void 0, void 0, function () {
            var poolInfo, marketInfo, goodPoolInfo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        poolInfo = this.parsePoolInfoFromLpTransaction(tx);
                        return [4 /*yield*/, this.fetchMarketInfo(poolInfo.marketId)];
                    case 1:
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
                        return [2 /*return*/, goodPoolInfo];
                }
            });
        });
    };
    PoolKeys.prototype.fetchMarketInfo = function (marketId) {
        return __awaiter(this, void 0, void 0, function () {
            var marketAccountInfo;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.connection.getAccountInfo(marketId)];
                    case 1:
                        marketAccountInfo = _a.sent();
                        if (!marketAccountInfo) {
                            throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
                        }
                        return [2 /*return*/, raydium_sdk_1.MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data)];
                }
            });
        });
    };
    PoolKeys.prototype.parsePoolInfoFromLpTransaction = function (txData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        var initInstruction = this.findInstructionByProgramId(txData.transaction.message.instructions, new web3_js_1.PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID));
        if (!initInstruction) {
            throw new Error('Failed to find lp init instruction in lp init tx');
        }
        var baseMint = initInstruction.accounts[8];
        var baseVault = initInstruction.accounts[10];
        var quoteMint = initInstruction.accounts[9];
        var quoteVault = initInstruction.accounts[11];
        var lpMint = initInstruction.accounts[7];
        var baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
        var lpMintInitInstruction = this.findInitializeMintInInnerInstructionsByMintAddress((_b = (_a = txData.meta) === null || _a === void 0 ? void 0 : _a.innerInstructions) !== null && _b !== void 0 ? _b : [], lpMint);
        if (!lpMintInitInstruction) {
            throw new Error('Failed to find lp mint init instruction in lp init tx');
        }
        var lpMintInstruction = this.findMintToInInnerInstructionsByMintAddress((_d = (_c = txData.meta) === null || _c === void 0 ? void 0 : _c.innerInstructions) !== null && _d !== void 0 ? _d : [], lpMint);
        if (!lpMintInstruction) {
            throw new Error('Failed to find lp mint to instruction in lp init tx');
        }
        var baseTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination((_f = (_e = txData.meta) === null || _e === void 0 ? void 0 : _e.innerInstructions) !== null && _f !== void 0 ? _f : [], baseVault, raydium_sdk_1.TOKEN_PROGRAM_ID);
        if (!baseTransferInstruction) {
            throw new Error('Failed to find base transfer instruction in lp init tx');
        }
        var quoteTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination((_h = (_g = txData.meta) === null || _g === void 0 ? void 0 : _g.innerInstructions) !== null && _h !== void 0 ? _h : [], quoteVault, raydium_sdk_1.TOKEN_PROGRAM_ID);
        if (!quoteTransferInstruction) {
            throw new Error('Failed to find quote transfer instruction in lp init tx');
        }
        var lpDecimals = lpMintInitInstruction.parsed.info.decimals;
        var lpInitializationLogEntryInfo = this.extractLPInitializationLogEntryInfoFromLogEntry((_l = this.findLogEntry('init_pc_amount', (_k = (_j = txData.meta) === null || _j === void 0 ? void 0 : _j.logMessages) !== null && _k !== void 0 ? _k : [])) !== null && _l !== void 0 ? _l : '');
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
    };
    PoolKeys.prototype.findTransferInstructionInInnerInstructionsByDestination = function (innerInstructions, destinationAccount, programId) {
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
    };
    PoolKeys.prototype.findInitializeMintInInnerInstructionsByMintAddress = function (innerInstructions, mintAddress) {
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
    };
    PoolKeys.prototype.findMintToInInnerInstructionsByMintAddress = function (innerInstructions, mintAddress) {
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
    };
    PoolKeys.prototype.findInstructionByProgramId = function (instructions, programId) {
        for (var i = 0; i < instructions.length; i++) {
            if (instructions[i].programId.equals(programId)) {
                return instructions[i];
            }
        }
        return null;
    };
    PoolKeys.prototype.extractLPInitializationLogEntryInfoFromLogEntry = function (lpLogEntry) {
        var lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');
        return JSON.parse(this.fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
    };
    PoolKeys.prototype.fixRelaxedJsonInLpLogEntry = function (relaxedJson) {
        return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
    };
    PoolKeys.prototype.findLogEntry = function (needle, logEntries) {
        for (var i = 0; i < logEntries.length; ++i) {
            if (logEntries[i].includes(needle)) {
                return logEntries[i];
            }
        }
        return null;
    };
    return PoolKeys;
}());
exports.default = PoolKeys;
