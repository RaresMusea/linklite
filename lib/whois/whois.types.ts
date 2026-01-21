export enum WhoisStatus {
    OK = 'OK',
    MISSING = 'MISSING',
    REDACTED = 'REDACTED',
    UNSUPPORTED = 'UNSUPPORTED',
    ERROR = 'ERROR',
}

export type WhoisDomainParams = {
    registeredAt: Date | null;
    status: WhoisStatus;

    rdapRaw?: string;
    whoisFetchedAt?: Date;
    checkedAt?: Date;
    source?: 'WHOIS';
};

export type FetchWhoisInfoResponse =
    | {
          ok: true;
          text: string;
      }
    | {
          ok: false;
          error: string;
          code?: number;
      };
