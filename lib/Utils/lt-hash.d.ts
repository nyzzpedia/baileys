declare class LTHash {
    constructor(salt: string);
    add(base: Uint8Array, items: Uint8Array[]): Uint8Array;
    subtract(base: Uint8Array, items: Uint8Array[]): Uint8Array;
    subtractThenAdd(base: Uint8Array, subtractItems: Uint8Array[], addItems: Uint8Array[]): Uint8Array;
}
export declare const LT_HASH_ANTI_TAMPERING: LTHash;
