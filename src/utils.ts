
export type Reducer<T, U> = (previous: U, current: T, index: number, array: T[]) => U;

export function group<T, G>(picker: (item: T) => G): Reducer<T, Map<G, T[]>> {
    return (map, current) => {
        if(!map) {
            map = new Map();
        }
        const key = picker(current);
        const group = map.get(key) ?? [];
        group.push(current);
        map.set(key, group);
        return map;
    };
}
