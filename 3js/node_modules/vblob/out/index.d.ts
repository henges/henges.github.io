export interface EventBeforeDispatch {
    [key: string]: any;
    type: string;
}
export interface Event {
    readonly cancelable: boolean;
    readonly defaultPrevented: boolean;
    readonly isTrusted: boolean;
    readonly target: EventTarget;
    readonly timeStamp: Date;
    preventDefault(): void;
    stopPropagation(): void;
    stopImmediatePropagation(): void;
}
export interface EventTarget {
    addEventListener(type: string, listener: (event: Event) => void): any;
    removeEventListener(type: string, listener: (event: Event) => void): any;
    dispatchEvent(event: EventBeforeDispatch): any;
}
export interface FileReaderEvent extends Event {
    readonly result: any;
}
export interface BlobPropertyBag {
    type?: string;
    ending?: "transparent" | "native";
}
export interface Blob {
    readonly size: number;
    readonly type: string;
    slice(start?: number, end?: number, contentType?: string): Blob;
}
export interface FileReader {
    readonly error: Error;
    readonly readyState: number;
    readonly result: any;
    onabort?(e: FileReaderEvent): void;
    onerror?(e: FileReaderEvent): void;
    onload?(e: FileReaderEvent): void;
    onloadstart?(e: FileReaderEvent): void;
    onloadend?(e: FileReaderEvent): void;
    onprogress?(e: FileReaderEvent): void;
    abort(): void;
    readAsArrayBuffer(blob: Blob): void;
    readAsBinaryString(blob: Blob): void;
    readAsDataURL(blob: Blob): void;
    readAsText(blob: Blob): void;
}
export interface BlobCtor {
    new (array?: any[], options?: BlobPropertyBag): Blob;
}
export interface FileReaderCtor {
    new (): FileReader;
}
export declare var Blob: BlobCtor;
export declare var FileReader: FileReaderCtor;
