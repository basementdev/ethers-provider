import { AlchemyProvider } from "@ethersproject/providers";
import { Logger } from "@ethersproject/logger";
import { BasementProvider } from "../src";

describe("getEnhancedLogs", () => {
  const provider = new AlchemyProvider("homestead");

  const baseFilterOpts = {
    fromBlock: 16426225,
    toBlock: 16426226,
  };
  const ADDRESS = "0x000000000000ad05ccc4f10045630fb830b95127";
  const enhancedProvider = BasementProvider.enhance(provider);
  it("fetches up to the logs limit when given a block range", async () => {
    const logs = await enhancedProvider.getEnhancedLogs(
      {
        ...baseFilterOpts,
        addresses: [ADDRESS],
      },
      { transaction: { from: true, to: true, events: true } }
    );

    const txLog = logs[0];
    expect(logs.length).toBe(1);
    expect(txLog.blockNumber).toBe(baseFilterOpts.fromBlock);
    expect(txLog.address.address.toLowerCase()).toBe(ADDRESS);

    expect(txLog.transaction?.from?.address).toBe(
      "0xD1a8DfBD03E944080F7F136D966Fb62226B603f7"
    );

    expect(txLog.transaction?.to?.address).toBeDefined();
    expect(txLog.transaction?.events).toBeDefined();
  });

  it("fetches when filtering by blockhash", async () => {
    const blockHash =
      "0xc77e675ed79e784cb94673f883769e3fd1650e2978e06c8386b2dcc9a555ed1d";
    const logs = await enhancedProvider.getEnhancedLogs({
      blockHash,
      address: ADDRESS,
    });

    const txLog = logs[0];
    expect(logs.length).toBe(2);
    expect(txLog.blockHash).toBe(blockHash);
    expect(txLog.address.address.toLowerCase()).toBe(ADDRESS);
  });

  it("fetches when filtering by block numbers", async () => {
    const blockNumbers = [16426225, 16426226];
    const logs = await enhancedProvider.getEnhancedLogs({
      blockNumbers,
      address: ADDRESS,
    });

    const txLog = logs[0];
    expect(logs.length).toBe(1);
    expect(blockNumbers.includes(txLog.blockNumber)).toBe(true);
  });

  it("throws when given blockhashes and blockhash", async () => {
    const blockHash =
      "0x6880c81d8d694454342813defa86b3782043f2134f1c00d37b927861bae75ea5";
    await expect(
      enhancedProvider.getEnhancedLogs({
        blockHash,
        blockHashes: [blockHash, blockHash],
      })
    ).rejects.toThrow(Logger.errors.UNEXPECTED_ARGUMENT);
  });

  it("throws when given addresses and address", async () => {
    await expect(
      enhancedProvider.getEnhancedLogs({
        address: ADDRESS,
        addresses: [ADDRESS],
      })
    ).rejects.toThrow(Logger.errors.UNEXPECTED_ARGUMENT);
  });
});
