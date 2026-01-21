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

    whoisRaw?: string;
    whoisFetchedAt?: Date;
    checkedAt?: Date;
    source?: 'WHOIS';
};

export type FetchWhoisInfoResponse =
    | {
          ok: true;
          status: number;
          text: string;
      }
    | {
          ok: false;
          status: number;
          error?: string;
      };
