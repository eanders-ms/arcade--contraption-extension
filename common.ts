namespace contraption.Common {

    let _nextId = 0;

    export function nextId(): number {
        return ++_nextId;
    }

    export function hashCode(s: string) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            const chr = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    }

    export function now(): number {
        return control.millis() / 1000;
    }
}
