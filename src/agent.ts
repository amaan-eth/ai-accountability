import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { OpenAI } from "langchain/llms/openai";
import { DynamicTool } from "langchain/tools";
import dotenv from "dotenv";
import { USDC_CONTRACT, USDC_ADDRESS, USDC_INTERFACE, mainSigner } from "./config";

dotenv.config();

export const agent = async (gptInput: string) => {
  // Initialize modal
  const model = new OpenAI({ temperature: 0, openAIApiKey: process.env.OPENAI_API_KEY! });

  // Initialize tools (transfer wallet tool & balance checker tool)
  const tools = [
    new DynamicTool({
      name: "Executor",
      description:
        "Call this when the user has not achieved their goals. The input should be an empty string",
      func: async () => {
        // Encodes data into calldata for tx
        const transferCalldata = await USDC_INTERFACE.encodeFunctionData("transfer", [
          process.env.RECIPIENT_ADDRESS, // Wallet to transfer money to
          1n * 10n ** 6n, // 1 USDC
        ]);
        const transferTx = {
          to: USDC_ADDRESS,
          data: transferCalldata,
        };

        let txReceipt = "";

        // Sends tx & returns tx receipt
        try {
          const swapRes = await mainSigner.sendTransaction(transferTx);
          txReceipt = `https://arbiscan.io/tx/${swapRes.hash}`;
        } catch (err) {
          console.log(err);
        }
        return `Transaction submitted. Tx Receipt: ${txReceipt}`;
      },
    }),
    new DynamicTool({
      name: "Wallet Balance Checker",
      description:
        "Call this when you need to check the balance of a user's wallet. The input should be an empty string",
      func: async () => {
        const balance = await USDC_CONTRACT.balanceOf(process.env.MAIN_ADDRESS);
        return `Your wallet balance is ${Number(balance) / 10 ** 6} USDC`;
      },
    }),
  ];

  // Initialize agent executor. Prompt is messy but will fix later
  const executor = await initializeAgentExecutorWithOptions(tools, model, {
    agentType: "zero-shot-react-description",
    returnIntermediateSteps: true,
    agentArgs: {
      prefix: `Your goal is to use the user's input and based on that, execute the necessary tools. If the user was successful in achieving their goals, you do NOT use the "Executor" Tool. You only need to call the "Wallet Balance Checker" Tool in that case. If the user was NOT successful in achieving their goals, you DO use the "Executor" Tool. After you call the "Executor" Tool, you need to call the "Wallet Balance Checker" Tool. So the flow is: Successfully achieved goals -> Wallet Balance Checker. Unsuccessfully achieved goals -> Executor -> Wallet Balance Checker. You should return the Transaction Receipt from the Executor Tool (if it was called) and the wallet balance from the Wallet Balance Checker. If the Executor tool was called, the output should be "You were not successful in achieving your goals. I transferred $1 out of your wallet. Here's the receipt: <Tx Receipt>. Your wallet balance is now <Balance>. If the Executor tool was NOT called, the output should be "You were successful in achieving your goals. Your wallet balance is <Balance>."`,
    },
  });

  console.log(`Executing with input "${gptInput}"...`);
  const result = await executor.call({ input: gptInput });
  //   console.log(result);

  return result.output;
};
