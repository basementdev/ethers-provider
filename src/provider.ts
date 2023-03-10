import {
  BasementSDK,
  TransactionLogFilter,
  TransactionLogsQuery,
  TransactionLogsQueryIncludeOptions,
} from "@basementdev/sdk";
import type { FilterByBlockHash } from "@ethersproject/abstract-provider";
import { Logger } from "@ethersproject/logger";
import { resolveProperties } from "@ethersproject/properties";
import { Filter, Network, UrlJsonRpcProvider } from "@ethersproject/providers";
import type { ConnectionInfo } from "@ethersproject/web";
import { fetchLogsFromPaginatedQuery, transformFilters } from "./utils";

const logger = new Logger(process.env.npm_package_version as string);

export default class BasementProvider extends UrlJsonRpcProvider {
  static originalProvider: UrlJsonRpcProvider;

  private readonly sdk: BasementSDK;

  private constructor(provider: UrlJsonRpcProvider, basementApiKey?: string) {
    super(provider.network, provider.apiKey);

    this.sdk = new BasementSDK({ apiKey: basementApiKey });
  }

  async getEnhancedLogs(
    filter:
      | Filter
      | FilterByBlockHash
      | Promise<Filter | FilterByBlockHash>
      | Partial<
          Pick<
            TransactionLogFilter,
            | "addresses"
            | "transaction"
            | "includeRemoved"
            | "blockHashes"
            | "blockNumbers"
          >
        >,
    include?: TransactionLogsQueryIncludeOptions
  ): Promise<
    NonNullable<TransactionLogsQuery["transactionLogs"]>["transactionLogs"]
  > {
    const network = await this.getNetwork();

    if (network.name !== "homestead") {
      logger.throwError(
        "We currently only support the Ethereum mainnet.",
        Logger.errors.NOT_IMPLEMENTED
      );
    }

    const {
      addresses,
      blockNumbers,
      blockHashes,
      transaction,
      includeRemoved,
      ...ethersFilters
    } = <any>filter || {};

    const params = await resolveProperties({
      filter: this._getFilter(ethersFilters as any),
    });

    const { filter: resolvedFilter } = params;

    if (ethersFilters.blockHash && blockHashes) {
      logger.throwArgumentError(
        "`blockHash` and `blockHashes` cannot be both set",
        Logger.errors.UNEXPECTED_ARGUMENT,
        filter
      );
    }

    if (ethersFilters.address && addresses) {
      logger.throwArgumentError(
        "`address` and `addresses` cannot be both set",
        Logger.errors.UNEXPECTED_ARGUMENT,
        filter
      );
    }

    const transformedFilters = transformFilters(resolvedFilter);

    const logs = fetchLogsFromPaginatedQuery(
      this.sdk,
      {
        ...transformedFilters,
        includeRemoved,
        addresses: addresses || transformedFilters.addresses,
        blockHashes: blockHashes || transformedFilters.blockHashes,
        blockNumbers,
        transaction,
      },
      include
    );
    return logs;
  }

  static enhance(provider: UrlJsonRpcProvider, basementApiKey?: string) {
    BasementProvider.originalProvider = provider;
    return new BasementProvider(provider, basementApiKey);
  }

  static getUrl(network: Network, apiKey: any): string | ConnectionInfo {
    return (
      BasementProvider.originalProvider.constructor as typeof UrlJsonRpcProvider
    ).getUrl(network, apiKey);
  }
}
