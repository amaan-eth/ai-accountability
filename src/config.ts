import dotenv from "dotenv";
import { Interface, JsonRpcProvider, Wallet, Contract } from "ethers";
import { ERC20_ABI } from "./abi";

dotenv.config();

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // Hot Wallet PK

export const baseProvider = new JsonRpcProvider(RPC_URL); // Ethers provider
export const mainSigner = new Wallet(PRIVATE_KEY, baseProvider); // Main Hot Wallet

export const USDC_ADDRESS = "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8";

export const USDC_INTERFACE = new Interface(ERC20_ABI);
export const USDC_CONTRACT = new Contract(USDC_ADDRESS, ERC20_ABI, baseProvider);
