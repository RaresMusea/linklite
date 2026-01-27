import { describe, it, expect } from 'vitest';
import { asRdapEvents } from '@/lib/rdap/rdap.types';

describe('asRdapEvents tests', () => {
    describe('valid inputs', () => {
        it('should return events array when events exists and is array of objects', () => {
            const json = {
                events: [
                    { eventAction: 'registration', eventDate: '2023-01-15' },
                    { eventAction: 'expiration', eventDate: '2024-01-15' },
                ],
                otherField: 'value',
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([
                { eventAction: 'registration', eventDate: '2023-01-15' },
                { eventAction: 'expiration', eventDate: '2024-01-15' },
            ]);
        });

        it('should return empty array when events is empty array', () => {
            const json = {
                events: [],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([]);
        });

        it('should handle events array with various object structures', () => {
            const json = {
                events: [{ eventAction: 'registration' }, { eventDate: '2023-01-15' }, { customField: 'value' }, {}],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([
                { eventAction: 'registration' },
                { eventDate: '2023-01-15' },
                { customField: 'value' },
                {},
            ]);
        });

        it('should work with complex nested objects in events', () => {
            const json = {
                events: [
                    {
                        eventAction: 'registration',
                        eventDate: '2023-01-15',
                        actor: { name: 'John', id: '123' },
                        links: [{ value: 'link1' }, { value: 'link2' }],
                    },
                ],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([
                {
                    eventAction: 'registration',
                    eventDate: '2023-01-15',
                    actor: { name: 'John', id: '123' },
                    links: [{ value: 'link1' }, { value: 'link2' }],
                },
            ]);
        });
    });

    describe('invalid inputs - non-object or missing events', () => {
        it('should return null for null input', () => {
            expect(asRdapEvents(null)).toBeNull();
        });

        it('should return null for undefined input', () => {
            expect(asRdapEvents(undefined)).toBeNull();
        });

        it('should return null for primitive values', () => {
            expect(asRdapEvents('string')).toBeNull();
            expect(asRdapEvents(123)).toBeNull();
            expect(asRdapEvents(true)).toBeNull();
            expect(asRdapEvents(false)).toBeNull();
        });

        it('should return null for array input', () => {
            expect(asRdapEvents([])).toBeNull();
            expect(asRdapEvents([1, 2, 3])).toBeNull();
            expect(asRdapEvents([{ events: [] }])).toBeNull();
        });

        it('should return null when events property is missing', () => {
            const json = {
                otherField: 'value',
                anotherField: 123,
            };

            expect(asRdapEvents(json)).toBeNull();
        });

        it('should return null when events is not an array', () => {
            const testCases = [
                { events: 'not an array' },
                { events: 123 },
                { events: true },
                { events: null },
                { events: undefined },
                { events: {} },
                { events: () => {} },
            ];

            testCases.forEach((json) => {
                expect(asRdapEvents(json)).toBeNull();
            });
        });
    });

    describe('array element filtering', () => {
        it('should convert non-object array elements to empty objects', () => {
            const json = {
                events: ['string', 123, true, null, undefined, [], { eventAction: 'valid' }],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([{}, {}, {}, {}, {}, {}, { eventAction: 'valid' }]);
        });

        it('should preserve objects and convert everything else to empty objects', () => {
            const json = {
                events: [{ valid: true }, 42, 'text', null, [1, 2, 3], { event: 'registration' }, undefined],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([{ valid: true }, {}, {}, {}, {}, { event: 'registration' }, {}]);
        });

        it('should handle Date objects (objects but not plain objects)', () => {
            const date = new Date();
            const json = {
                events: [date, { eventAction: 'registration' }],
            };

            // Date este typeof 'object' dar nu e plain object
            const result = asRdapEvents(json);
            expect(result).toEqual([
                {},
                { eventAction: 'registration' },
            ]);
        });

        it('should handle functions in array (functions are objects)', () => {
            const func = () => {};
            const json = {
                events: [func, { eventAction: 'registration' }],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([
                {},
                { eventAction: 'registration' },
            ]);
        });
    });

    describe('edge cases', () => {
        it('should handle object with only events property', () => {
            const json = {
                events: [{ eventAction: 'registration' }],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([{ eventAction: 'registration' }]);
        });

        it('should handle events array with mixed valid/invalid objects', () => {
            const json = {
                events: [
                    null,
                    { eventAction: 'registration', eventDate: '2023-01-15' },
                    undefined,
                    { custom: 'data' },
                    'invalid',
                    123,
                ],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([
                {},
                { eventAction: 'registration', eventDate: '2023-01-15' },
                {},
                { custom: 'data' },
                {},
                {},
            ]);
        });

        it('should handle large arrays', () => {
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                eventAction: `action${i}`,
                eventDate: `2023-01-${(i % 30) + 1}`,
            }));

            const json = { events: largeArray };
            const result = asRdapEvents(json);

            expect(result).toHaveLength(1000);
            expect(result![0]).toEqual({ eventAction: 'action0', eventDate: '2023-01-1' });
            expect(result![999]).toEqual({ eventAction: 'action999', eventDate: '2023-01-10' });
        });

        it('should handle inherited properties', () => {
            const parent = { events: [{ eventAction: 'parent' }] };
            const child = Object.create(parent);
            child.custom = 'value';

            const result = asRdapEvents(child);

            expect(result).toBeNull();
        });

        it('should handle events property with getter', () => {
            const json = {
                get events() {
                    return [{ eventAction: 'dynamic' }];
                },
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([{ eventAction: 'dynamic' }]);
        });
    });

    describe('type safety and return type', () => {
        it('should return RdapEvent[] when successful', () => {
            const json = {
                events: [{ eventAction: 'registration' }],
            };

            const result = asRdapEvents(json);

            if (result) {
                const events: Array<{ eventAction?: unknown; eventDate?: unknown }> = result;
                expect(events[0].eventAction).toBe('registration');
            }
        });

        it('should ensure all returned objects are plain objects', () => {
            const json = {
                events: [{ a: 1 }, null, 'string'],
            };

            const result = asRdapEvents(json);
            expect(result).toEqual([{ a: 1 }, {}, {}]);

            if (result) {
                result.forEach((item) => {
                    expect(typeof item).toBe('object');
                    expect(item).not.toBeNull();
                    expect(Array.isArray(item)).toBe(false);
                });
            }
        });
    });
});
