type DataTypeTag = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'object' | 'array';

export function isPlainObject(x: unknown): x is Record<string, unknown> {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function hasString(x: Record<string, unknown>, key: string): x is Record<string, unknown> {
    return has(x, key, 'string');
}

export function hasBoolean(x: Record<string, unknown>, key: string): x is Record<string, unknown> {
    return has(x, key, 'boolean');
}

export function hasNullableString(x: Record<string, unknown>, key: string): boolean {
    return hasNullable(x, key, 'string');
}

export function hasNullableOrUndefinedString(x: Record<string, unknown>, key: string): boolean {
    return hasNullableOrUndefined(x, key, 'string');
}

function has(x: Record<string, unknown>, key: string, primitiveDataTypeStr: DataTypeTag) {
    return typeof x[key] === primitiveDataTypeStr;
}

function hasNullable(x: Record<string, unknown>, key: string, primitiveDataTypeStr: DataTypeTag) {
    return x[key] === null || typeof x[key] === primitiveDataTypeStr;
}

function hasNullableOrUndefined(x: Record<string, unknown>, key: string, primitiveDataTypeStr: DataTypeTag) {
    return hasNullable(x, key, primitiveDataTypeStr) || x[key] === undefined;
}
