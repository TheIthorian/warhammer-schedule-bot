export function assertResource<T>(value: T | null | undefined): T {
    if (value === undefined) {
        throw new TypeError('resource is not defined');
    }

    if (value === null) {
        throw new TypeError('resource is null');
    }

    return value as T;
}
