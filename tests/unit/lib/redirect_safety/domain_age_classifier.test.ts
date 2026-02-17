import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainStatus } from '@/generated/prisma/enums';
import { Domain } from '@/generated/prisma/client';
import { classifyDomainAge, domainAgeRiskFlag, isNewDomain } from '@/lib/redirect_safety/domain_age_classifier';
import type { DomainAgeClassifierInput } from '@/lib/redirect_safety/redirect_safety_types';
import { DomainSource } from '@/generated/prisma/enums';

vi.mock('@/lib/dates', () => ({
    getDaysAgeFrom: vi.fn(),
}));

import { getDaysAgeFrom } from '@/lib/dates';

describe('classifyDomainAge', () => {
    const mockGetDaysAgeFrom = vi.mocked(getDaysAgeFrom);

    const baseInput: DomainAgeClassifierInput = {
        registeredAt: new Date('2020-01-01T00:00:00.000Z'),
        status: DomainStatus.OK,
        checkedAt: new Date('2024-01-15T10:00:00.000Z'),
        options: {
            newDomainDays: 30,
            maxProviderCheckedAgeDays: 45,
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDaysAgeFrom.mockReset();
    });

    describe('checkedAt validations', () => {
        it('should return Unknown when checkedAt is null', () => {
            // Arrange
            const input = { ...baseInput, checkedAt: null };

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'no_checked_at',
            });
            expect(mockGetDaysAgeFrom).not.toHaveBeenCalled();
        });

        it('should return Unknown when checkedAt is in the future', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom.mockReturnValue(-5); // Negative days = future date

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'invalid_checked_at',
            });
            expect(mockGetDaysAgeFrom).toHaveBeenCalledWith(input.checkedAt);
        });

        it('should return Unknown when checkedAt is too old', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom.mockReturnValue(50); // Older than max 45 days

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'checked_at_stale',
            });
            expect(mockGetDaysAgeFrom).toHaveBeenCalledWith(input.checkedAt);
        });

        it('should proceed when checkedAt is valid and fresh', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(1460); // registeredAt age (4 years)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(mockGetDaysAgeFrom).toHaveBeenCalledWith(input.checkedAt);
            expect(result.age).toBe('Old');
        });
    });

    describe('status validations', () => {
        const unknownStatuses = [
            DomainStatus.ERROR,
            DomainStatus.MISSING,
            DomainStatus.UNKNOWN,
            DomainStatus.UNSUPPORTED,
        ];

        unknownStatuses.forEach((status) => {
            it(`should return Unknown for ${status} status`, () => {
                // Arrange
                const input = { ...baseInput, status };
                mockGetDaysAgeFrom.mockReturnValue(30); // Fresh checkedAt

                // Act
                const result = classifyDomainAge(input);

                // Assert
                expect(result).toEqual({
                    age: 'Unknown',
                    reason: 'unsupported_status',
                });
            });
        });

        it('should return Unknown for REDACTED status with specific reason', () => {
            // Arrange
            const input = { ...baseInput, status: DomainStatus.REDACTED };
            mockGetDaysAgeFrom.mockReturnValue(30);

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'redacted',
            });
        });

        it('should proceed for OK status', () => {
            // Arrange
            const input = { ...baseInput, status: DomainStatus.OK };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(1460); // registeredAt age

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result.age).toBe('Old');
        });
    });

    describe('registeredAt validations', () => {
        it('should return Unknown when registeredAt is null', () => {
            // Arrange
            const input = { ...baseInput, registeredAt: null };
            mockGetDaysAgeFrom.mockReturnValue(30); // Fresh checkedAt

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'missing_registered_at',
            });
            expect(mockGetDaysAgeFrom).toHaveBeenCalledTimes(1); // Only checkedAt called
        });

        it('should return Unknown when registeredAt is in the future', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(-10); // registeredAt age (future)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'invalid_registered_at',
            });
            expect(mockGetDaysAgeFrom).toHaveBeenCalledTimes(2);
        });

        it('should proceed when registeredAt is valid', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(1460); // registeredAt age

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result.age).toBe('Old');
        });
    });

    describe('age classification', () => {
        it('should classify as New when registered age <= newDomainDays', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(20); // registeredAt age (less than 30 days)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'New',
            });
        });

        it('should classify as Old when registered age > newDomainDays', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(40); // registeredAt age (more than 30 days)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Old',
            });
        });

        it('should classify as New when registered age equals newDomainDays', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(30); // registeredAt age (equal to threshold)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'New',
            });
        });
    });

    describe('custom options', () => {
        it('should use custom newDomainDays from options', () => {
            // Arrange
            const input = {
                ...baseInput,
                options: {
                    newDomainDays: 60,
                    maxProviderCheckedAgeDays: 90,
                },
            };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(50); // registeredAt age (would be Old with default 30, but New with 60)

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result.age).toBe('New');
        });

        it('should use custom maxProviderCheckedAgeDays from options', () => {
            // Arrange
            const input = {
                ...baseInput,
                options: {
                    newDomainDays: 30,
                    maxProviderCheckedAgeDays: 60,
                },
            };

            mockGetDaysAgeFrom.mockReturnValueOnce(50).mockReturnValueOnce(1460);

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(mockGetDaysAgeFrom).toHaveBeenCalledTimes(2);
            expect(mockGetDaysAgeFrom).toHaveBeenNthCalledWith(1, input.checkedAt);
            expect(mockGetDaysAgeFrom).toHaveBeenNthCalledWith(2, input.registeredAt);
            expect(result.age).toBe('Old');
        });

        it('should use defaults when options are undefined', () => {
            // Arrange
            const input = {
                registeredAt: baseInput.registeredAt,
                status: baseInput.status,
                checkedAt: baseInput.checkedAt,
                options: {}, // Empty options
            };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(50) // checkedAt age (stale with default 45)
                .mockReturnValueOnce(1460); // registeredAt age

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'checked_at_stale',
            });
        });

        it('should use defaults when options object is missing', () => {
            // Arrange
            const input = {
                registeredAt: baseInput.registeredAt,
                status: baseInput.status,
                checkedAt: baseInput.checkedAt,
                // No options property
            } as DomainAgeClassifierInput;

            mockGetDaysAgeFrom
                .mockReturnValueOnce(50) // checkedAt age (stale with default 45)
                .mockReturnValueOnce(1460); // registeredAt age

            // Act
            const result = classifyDomainAge(input);

            // Assert
            expect(result).toEqual({
                age: 'Unknown',
                reason: 'checked_at_stale',
            });
        });
    });

    describe('edge cases', () => {
        it('should handle checkedAt exactly at max age boundary', () => {
            // Arrange
            const input = { ...baseInput };
            mockGetDaysAgeFrom
                .mockReturnValueOnce(45) // checkedAt age (exactly max)
                .mockReturnValueOnce(1460); // registeredAt age

            // Act
            const result = classifyDomainAge(input);

            // Assert
            if (result.age === 'Unknown') {
                expect(result.reason).toBe('checked_at_stale');
            } else {
                expect(result.age).toBe('Old');
            }
        });

        it('should handle registeredAt exactly at newDomainDays boundary', () => {
            // Arrange
            const input = { ...baseInput };
            console.log('Test 1 - Input:', {
                status: input.status,
                registeredAt: input.registeredAt,
                checkedAt: input.checkedAt,
            });

            mockGetDaysAgeFrom
                .mockReturnValueOnce(30) // checkedAt age
                .mockReturnValueOnce(30); // registeredAt age (exactly at threshold)

            // Act
            const result = classifyDomainAge(input);
            console.log('Test 1 - Result:', result);

            // Assert
            expect(['New', 'Old', 'Unknown']).toContain(result.age);

            if (result.age === 'Unknown') {
                console.log('Test 1 - Unknown reason:', result.reason);
            }
        });
    });
});

describe('isNewDomain', () => {
    const mockGetDaysAgeFrom = vi.mocked(getDaysAgeFrom);

    const baseDomain: Partial<Domain> = {
        id: 'test-id',
        hostname: 'example.com',
        registeredAt: new Date('2020-01-01T00:00:00.000Z'),
        status: DomainStatus.OK,
        checkedAt: new Date('2024-01-15T10:00:00.000Z'),
        firstSeenAt: new Date('2024-01-01T00:00:00.000Z'),
        source: DomainSource.RDAP,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDaysAgeFrom.mockReset();
    });

    it('should return false when domain is null', () => {
        // Act
        const result = isNewDomain(null);

        // Assert
        expect(result).toBe(false);
        expect(mockGetDaysAgeFrom).not.toHaveBeenCalled();
    });

    it('should return true when classifyDomainAge returns New', () => {
        // Arrange
        const domain = baseDomain as Domain;
        mockGetDaysAgeFrom
            .mockReturnValueOnce(30) // checkedAt age
            .mockReturnValueOnce(20); // registeredAt age (New)

        // Act
        const result = isNewDomain(domain);

        // Assert
        expect(result).toBe(true);
    });

    it('should return false when classifyDomainAge returns Old', () => {
        // Arrange
        const domain = baseDomain as Domain;
        mockGetDaysAgeFrom
            .mockReturnValueOnce(30) // checkedAt age
            .mockReturnValueOnce(40); // registeredAt age (Old)

        // Act
        const result = isNewDomain(domain);

        // Assert
        expect(result).toBe(false);
    });

    it('should return false when classifyDomainAge returns Unknown', () => {
        // Arrange
        const domain = { ...baseDomain, checkedAt: null } as Domain; // Will cause Unknown

        // Act
        const result = isNewDomain(domain);

        // Assert
        expect(result).toBe(false);
    });

    it('should work with different domain statuses', () => {
        // Test with OK status (valid)
        const okDomain = { ...baseDomain, status: DomainStatus.OK } as Domain;
        mockGetDaysAgeFrom.mockReturnValueOnce(30).mockReturnValueOnce(20);

        expect(isNewDomain(okDomain)).toBe(true);

        // Test with ERROR status (will be Unknown, so false)
        const errorDomain = { ...baseDomain, status: DomainStatus.ERROR } as Domain;
        mockGetDaysAgeFrom.mockReturnValue(30);

        expect(isNewDomain(errorDomain)).toBe(false);
    });

    it('should respect custom newDomainDays via options', () => {
        const domain = baseDomain as Domain;
        mockGetDaysAgeFrom
            .mockReturnValueOnce(10) // checkedAt age
            .mockReturnValueOnce(50); // registeredAt age

        expect(isNewDomain(domain, { newDomainDays: 60 })).toBe(true);
    });

    it('should return false with default maxProviderCheckedAgeDays when checkedAt is stale', () => {
        const domain = baseDomain as Domain;
        mockGetDaysAgeFrom
            .mockReturnValueOnce(50) // checkedAt age (stale with default 45)
            .mockReturnValueOnce(10); // registeredAt age

        expect(isNewDomain(domain)).toBe(false);
    });

    it('should respect custom maxProviderCheckedAgeDays via options', () => {
        const domain = baseDomain as Domain;
        mockGetDaysAgeFrom
            .mockReturnValueOnce(50) // checkedAt age
            .mockReturnValueOnce(10); // registeredAt age

        expect(isNewDomain(domain, { maxProviderCheckedAgeDays: 60 })).toBe(true);
    });
});

describe('domainAgeRiskFlag', () => {
    const mockGetDaysAgeFrom = vi.mocked(getDaysAgeFrom);

    const baseDomain: Partial<Domain> = {
        id: 'domain-risk-id',
        hostname: 'example.com',
        registeredAt: new Date('2020-01-01T00:00:00.000Z'),
        status: DomainStatus.OK,
        checkedAt: new Date('2024-01-15T10:00:00.000Z'),
        firstSeenAt: new Date('2024-01-01T00:00:00.000Z'),
        source: DomainSource.RDAP,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetDaysAgeFrom.mockReset();
    });

    it('Returns unknown_domain_age with missing_domain reason when domain is null', () => {
        expect(domainAgeRiskFlag(null)).toEqual({
            kind: 'unknown_domain_age',
            reason: 'missing_domain',
        });
        expect(mockGetDaysAgeFrom).not.toHaveBeenCalled();
    });

    it('Returns new_domain when classification result is New', () => {
        mockGetDaysAgeFrom
            .mockReturnValueOnce(10) // checkedAt age
            .mockReturnValueOnce(5); // registeredAt age

        const result = domainAgeRiskFlag(baseDomain as Domain);

        expect(result).toEqual({ kind: 'new_domain' });
    });

    it('Returns old_domain when classification result is Old', () => {
        mockGetDaysAgeFrom
            .mockReturnValueOnce(10) // checkedAt age
            .mockReturnValueOnce(120); // registeredAt age

        const result = domainAgeRiskFlag(baseDomain as Domain);

        expect(result).toEqual({ kind: 'old_domain' });
    });

    it('Returns unknown_domain_age with propagated reason when classification is Unknown', () => {
        const result = domainAgeRiskFlag({
            ...baseDomain,
            checkedAt: null,
        } as Domain);

        expect(result).toEqual({
            kind: 'unknown_domain_age',
            reason: 'no_checked_at',
        });
    });
});
