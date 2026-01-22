import { describe, it, expect } from 'vitest';
import { RdapStatus } from '@/lib/rdap/rdap.types';
import { WhoisStatus } from '@/lib/whois/whois.types';
import { DomainStatus } from '@/generated/prisma/enums';
import { mapStatusToDomainStatus } from '@/dal/domains/domains.mapper';

describe('Domain entity mapper tests', () => {
    describe('RdapStatus mapping', () => {
        it('should map RdapStatus.OK to DomainStatus.OK', () => {
            const result = mapStatusToDomainStatus(RdapStatus.OK);
            expect(result).toBe(DomainStatus.OK);
        });

        it('should map RdapStatus.MISSING to DomainStatus.MISSING', () => {
            const result = mapStatusToDomainStatus(RdapStatus.MISSING);
            expect(result).toBe(DomainStatus.MISSING);
        });

        it('should map RdapStatus.REDACTED to DomainStatus.REDACTED', () => {
            const result = mapStatusToDomainStatus(RdapStatus.REDACTED);
            expect(result).toBe(DomainStatus.REDACTED);
        });

        it('should map RdapStatus.UNSUPPORTED to DomainStatus.UNSUPPORTED', () => {
            const result = mapStatusToDomainStatus(RdapStatus.UNSUPPORTED);
            expect(result).toBe(DomainStatus.UNSUPPORTED);
        });

        it('should map RdapStatus.ERROR to DomainStatus.ERROR', () => {
            const result = mapStatusToDomainStatus(RdapStatus.ERROR);
            expect(result).toBe(DomainStatus.ERROR);
        });
    });

    describe('WhoisStatus mapping', () => {
        it('should map WhoisStatus.OK to DomainStatus.OK', () => {
            const result = mapStatusToDomainStatus(WhoisStatus.OK);
            expect(result).toBe(DomainStatus.OK);
        });

        it('should map WhoisStatus.MISSING to DomainStatus.MISSING', () => {
            const result = mapStatusToDomainStatus(WhoisStatus.MISSING);
            expect(result).toBe(DomainStatus.MISSING);
        });

        it('should map WhoisStatus.REDACTED to DomainStatus.REDACTED', () => {
            const result = mapStatusToDomainStatus(WhoisStatus.REDACTED);
            expect(result).toBe(DomainStatus.REDACTED);
        });

        it('should map WhoisStatus.UNSUPPORTED to DomainStatus.UNSUPPORTED', () => {
            const result = mapStatusToDomainStatus(WhoisStatus.UNSUPPORTED);
            expect(result).toBe(DomainStatus.UNSUPPORTED);
        });

        it('should map WhoisStatus.ERROR to DomainStatus.ERROR', () => {
            const result = mapStatusToDomainStatus(WhoisStatus.ERROR);
            expect(result).toBe(DomainStatus.ERROR);
        });
    });

    describe('Complete mapping coverage', () => {
        it('should map all RdapStatus values correctly', () => {
            const rdapStatuses = Object.values(RdapStatus) as RdapStatus[];

            rdapStatuses.forEach((status) => {
                const result = mapStatusToDomainStatus(status);

                expect(result).toBeDefined();

                const expectedDomainStatus = DomainStatus[status as keyof typeof DomainStatus];
                expect(result).toBe(expectedDomainStatus);
            });
        });

        it('should map all WhoisStatus values correctly', () => {
            const whoisStatuses = Object.values(WhoisStatus) as WhoisStatus[];

            whoisStatuses.forEach((status) => {
                const result = mapStatusToDomainStatus(status);

                expect(result).toBeDefined();

                const expectedDomainStatus = DomainStatus[status as keyof typeof DomainStatus];
                expect(result).toBe(expectedDomainStatus);
            });
        });
    });

    describe('Type safety and edge cases', () => {
        it('should handle all possible input values in switch statement', () => {
            const allStatuses = [...Object.values(RdapStatus), ...Object.values(WhoisStatus)] as (
                | RdapStatus
                | WhoisStatus
            )[];

            allStatuses.forEach((status) => {
                expect(() => mapStatusToDomainStatus(status)).not.toThrow();
            });
        });

        it('should have consistent mapping between RdapStatus and WhoisStatus', () => {
            const testCases: [string, RdapStatus, WhoisStatus][] = [
                ['OK', RdapStatus.OK, WhoisStatus.OK],
                ['MISSING', RdapStatus.MISSING, WhoisStatus.MISSING],
                ['REDACTED', RdapStatus.REDACTED, WhoisStatus.REDACTED],
                ['UNSUPPORTED', RdapStatus.UNSUPPORTED, WhoisStatus.UNSUPPORTED],
                ['ERROR', RdapStatus.ERROR, WhoisStatus.ERROR],
            ];

            testCases.forEach(([statusName, rdapStatus, whoisStatus]) => {
                const rdapResult = mapStatusToDomainStatus(rdapStatus);
                const whoisResult = mapStatusToDomainStatus(whoisStatus);

                expect(rdapResult).toBe(whoisResult);

                const expected = DomainStatus[statusName as keyof typeof DomainStatus];
                expect(rdapResult).toBe(expected);
                expect(whoisResult).toBe(expected);
            });
        });
    });

    describe('Runtime behavior', () => {
        it('should return DomainStatus enum values', () => {
            const result = mapStatusToDomainStatus(RdapStatus.OK);

            const validDomainStatusValues = Object.values(DomainStatus);
            expect(validDomainStatusValues).toContain(result);
        });

        it('should work with both enum types interchangeably', () => {
            const rdapInput: RdapStatus = RdapStatus.OK;
            const whoisInput: WhoisStatus = WhoisStatus.OK;

            const rdapResult = mapStatusToDomainStatus(rdapInput);
            const whoisResult = mapStatusToDomainStatus(whoisInput);

            expect(rdapResult).toBe(DomainStatus.OK);
            expect(whoisResult).toBe(DomainStatus.OK);
            expect(rdapResult).toBe(whoisResult);
        });
    });

    describe('String-based enum compatibility', () => {
        it('should handle string values correctly', () => {
            const stringStatus = 'OK' as RdapStatus;
            const result = mapStatusToDomainStatus(stringStatus);
            expect(result).toBe(DomainStatus.OK);
        });
    });
});
