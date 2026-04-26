import { NWCClient } from "@getalby/sdk";

let cachedClient: NWCClient | null = null;

const getNwcUrl = () => {
  const url = process.env.ALBY_NWC_URL?.trim();
  if (!url) {
    throw new Error("ALBY_NWC_URL is not configured");
  }
  return url;
};

export const getAlbyNwcClient = () => {
  if (!cachedClient) {
    cachedClient = new NWCClient({
      nostrWalletConnectUrl: getNwcUrl()
    });
  }
  return cachedClient;
};
