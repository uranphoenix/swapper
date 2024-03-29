import { Connection, ParsedTransactionWithMeta, PublicKey, PartiallyDecodedInstruction, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { LIQUIDITY_STATE_LAYOUT_V4, LiquidityPoolKeysV4, jsonInfo2PoolKeys } from "@raydium-io/raydium-sdk"
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import PoolKeys from "./PoolKeys";
import RaydiumSwap from "./RaydiumSwap";
dotenv.config({ path: '../.env' });

const PRIVATE_KEY = process.env.PRIVATE_KEY.split(',').map((i) => parseInt(i))

const connection = new Connection("https://rough-hardworking-slug.solana-mainnet.quiknode.pro/cd9ba0e834d204bff84657ba5de38eaa6b0b8a39/", "confirmed")
const txConnection = new Connection("https://skilled-practical-road.solana-mainnet.quiknode.pro/c420ecfdda417be0865b42a14c30017e79b0c930/", "confirmed")
const sellConnection = new Connection("https://attentive-aged-hexagon.solana-mainnet.quiknode.pro/b1c3ae52eb51984781aed8cede1da4e34bde3625/", "confirmed")

/*
benchmark to compare raydium vs jupiter swaps
track bros txs with volumes included
*/

// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
const RAYDIUM_POOL_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112"
const RAYDIUM_POOL_V4_PROGRAM_ID_5Q = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"

const PUBLIC_KEY = new PublicKey(process.env.PUBLIC_KEY)



//const poolKeys: PoolKeys = new PoolKeys(connection)
//const raydiumSwapBuy = new RaydiumSwap(buyConnection, PRIVATE_KEY)
//const raydiumSwapSell = new RaydiumSwap(buyConnection, PRIVATE_KEY)

let swapTx: Transaction | VersionedTransaction
let allPoolKeys: any
let targetPoolKeys: any

//configs
const targetMint = "ArqnmwuaU6bBBpBErYYyVgmeunYZRB94zNUmC7MJEtpR"
const buy = true
const SOL_PRICE = 147.71
const ONE_TRADE = 0.01
const salePart = 1.0

const trumpMint = "4bPCnkZeNCHwoMHSeaAmrpfrQfjPYNzoCQayVnh7Ay2F"

const trackAddresses = [
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
    
    
]

async function track() {
    console.log(`Program started working at ${(new Date()).toLocaleString()}`)
    trackAddresses.forEach((async (addr) => {
        connection.onLogs(new PublicKey(addr), async ({signature, err, logs}) => {
            if(err) return
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
            const volume = await getVolume(tx)
            //if(!volume) return
            const solanaBalance = (await connection.getBalance(new PublicKey(addr)))/LAMPORTS_PER_SOL
            console.log(`New transaction on ${addr} ${volume > 0 ? "bought" : "sold"} tokens for ${Math.abs(volume)} SOL at ${new Date(tx.blockTime*1000).toLocaleString()}`)
        })

        const account = await connection.getTokenAccountsByOwner(new PublicKey(addr), {mint: new PublicKey(trumpMint)}, "confirmed")
        if(!account.value[0]) return
        const amount = await connection.getTokenAccountBalance(account.value[0].pubkey, "confirmed")
        console.log(addr)
        if(amount.value.uiAmount != 0) {
            console.log(addr)
        }
    }))
}

async function getTransaction(signature: string) {
    let parsedTransaction: ParsedTransactionWithMeta
    try{
        parsedTransaction = await txConnection.getParsedTransaction(signature, {maxSupportedTransactionVersion: 0, commitment: 'confirmed'})
    } catch (err) {
        return
    }
    return parsedTransaction
}

async function getVolume(tx: ParsedTransactionWithMeta) {
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

    const volumeRaw = postSolBalance - preSolBalance

    return volumeRaw
}

track()