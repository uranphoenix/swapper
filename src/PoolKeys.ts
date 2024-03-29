import { Liquidity, jsonInfo2PoolKeys, LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeys, MARKET_STATE_LAYOUT_V3, Market, TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { Connection, Logs, ParsedInnerInstruction, ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey, VersionedTransaction } from "@solana/web3.js";

const RAYDIUM_POOL_V4_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 9;

class PoolKeys {
    connection: Connection

    constructor(connection: Connection) {
        this.connection = connection
    }

    async fetchPoolKeysForLPInitTransaction(tx: ParsedTransactionWithMeta) : Promise<LiquidityPoolKeys | null> {
        const poolInfo = this.parsePoolInfoFromLpTransaction(tx);
        const marketInfo = await this.fetchMarketInfo(poolInfo.marketId);
        
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
        return goodPoolInfo as LiquidityPoolKeys;
    }

    async fetchMarketInfo(marketId: PublicKey) {
        const marketAccountInfo = await this.connection.getAccountInfo(marketId);
        if (!marketAccountInfo) {
            throw new Error('Failed to fetch market info for market id ' + marketId.toBase58());
        }
        
        return MARKET_STATE_LAYOUT_V3.decode(marketAccountInfo.data);
    }

    parsePoolInfoFromLpTransaction(txData: ParsedTransactionWithMeta) {
        const initInstruction = this.findInstructionByProgramId(txData.transaction.message.instructions, new PublicKey(RAYDIUM_POOL_V4_PROGRAM_ID)) as PartiallyDecodedInstruction|null;
        if (!initInstruction) {
            throw new Error('Failed to find lp init instruction in lp init tx');
        }
        const baseMint = initInstruction.accounts[8];
        const baseVault = initInstruction.accounts[10]; 
        const quoteMint = initInstruction.accounts[9];
        const quoteVault = initInstruction.accounts[11];
        const lpMint = initInstruction.accounts[7];
        const baseAndQuoteSwapped = baseMint.toBase58() === SOL_MINT;
        const lpMintInitInstruction = this.findInitializeMintInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
        if (!lpMintInitInstruction) {
            throw new Error('Failed to find lp mint init instruction in lp init tx');
        }
        const lpMintInstruction = this.findMintToInInnerInstructionsByMintAddress(txData.meta?.innerInstructions ?? [], lpMint);
        if (!lpMintInstruction) {
            throw new Error('Failed to find lp mint to instruction in lp init tx');
        }
        const baseTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], baseVault, TOKEN_PROGRAM_ID);
        if (!baseTransferInstruction) {
            throw new Error('Failed to find base transfer instruction in lp init tx');
        }
        const quoteTransferInstruction = this.findTransferInstructionInInnerInstructionsByDestination(txData.meta?.innerInstructions ?? [], quoteVault, TOKEN_PROGRAM_ID);
        if (!quoteTransferInstruction) {
            throw new Error('Failed to find quote transfer instruction in lp init tx');
        }
        const lpDecimals = lpMintInitInstruction.parsed.info.decimals;
        const lpInitializationLogEntryInfo = this.extractLPInitializationLogEntryInfoFromLogEntry(this.findLogEntry('init_pc_amount', txData.meta?.logMessages ?? []) ?? '');
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

    findTransferInstructionInInnerInstructionsByDestination(innerInstructions: Array<ParsedInnerInstruction>, destinationAccount : PublicKey, programId?: PublicKey) : ParsedInstruction|null {
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

    findInitializeMintInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null {
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

    findMintToInInnerInstructionsByMintAddress(innerInstructions: Array<ParsedInnerInstruction>, mintAddress: PublicKey) : ParsedInstruction|null {
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

    findInstructionByProgramId(instructions: Array<ParsedInstruction|PartiallyDecodedInstruction>, programId: PublicKey) : ParsedInstruction|PartiallyDecodedInstruction|null {
        for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].programId.equals(programId)) {
                return instructions[i];
            }
        }

        return null;
    }

    extractLPInitializationLogEntryInfoFromLogEntry(lpLogEntry: string) : {nonce: number, open_time: number, init_pc_amount: number, init_coin_amount: number} {
        const lpInitializationLogEntryInfoStart = lpLogEntry.indexOf('{');
        return JSON.parse(this.fixRelaxedJsonInLpLogEntry(lpLogEntry.substring(lpInitializationLogEntryInfoStart)));
    }

    fixRelaxedJsonInLpLogEntry(relaxedJson: string) : string {
        return relaxedJson.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, "$1\"$2\":");
    }

    findLogEntry(needle: string, logEntries: Array<string>) : string|null {
        for (let i = 0; i < logEntries.length; ++i) {
            if (logEntries[i].includes(needle)) {
                return logEntries[i];
            }
        }

        return null;
    }
}

export default PoolKeys
