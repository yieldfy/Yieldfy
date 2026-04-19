import { Buffer } from "buffer";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer ??= Buffer;
(globalThis as typeof globalThis & { global: typeof globalThis }).global ??= globalThis;
