"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.group = group;
function group(picker) {
    return (map, current) => {
        if (!map) {
            map = new Map();
        }
        const key = picker(current);
        const group = map.get(key) ?? [];
        group.push(current);
        map.set(key, group);
        return map;
    };
}
