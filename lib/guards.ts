type DataTypeTag = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'array';

export function isPlainObject(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function hasString(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: string } {
    return has(x, key, 'string');
}

export function hasNumber(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: number } {
    return has(x, key, 'number');
}

export function hasBoolean(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: boolean } {
    return has(x, key, 'boolean');
}

export function hasObject(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: Record<string, unknown> } {
    return has(x, key, 'object');
}

export function hasNullableString(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: string | null } {
    return hasNullable(x, key, 'string');
}

export function hasNullableOrUndefinedString(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: string | null | undefined } {
    return hasNullableOrUndefined(x, key, 'string');
}

export function hasArray(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: unknown[] } {
    return has(x, key, 'array');
}

export function hasNullableArray(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: unknown[] | null } {
    return hasNullable(x, key, 'array');
}

export function hasNullableOrUndefinedArray(
    x: Record<string, unknown>,
    key: string
): x is Record<string, unknown> & { [K in typeof key]: unknown[] | null | undefined } {
    return hasNullableOrUndefined(x, key, 'array');
}

function has(x: Record<string, unknown>, key: string, dataType: DataTypeTag): boolean {
    switch (dataType) {
        case 'null':
            return x[key] === null;
        case 'undefined':
            return x[key] === undefined;
        case 'array':
            return Array.isArray(x[key]);
        case 'object':
            return typeof x[key] === 'object' && x[key] !== null && !Array.isArray(x[key]);
        default:
            return typeof x[key] === dataType;
    }
}

function hasNullable(x: Record<string, unknown>, key: string, dataType: DataTypeTag): boolean {
    return x[key] === null || has(x, key, dataType);
}

function hasNullableOrUndefined(x: Record<string, unknown>, key: string, dataType: DataTypeTag): boolean {
    return hasNullable(x, key, dataType) || x[key] === undefined;
}
