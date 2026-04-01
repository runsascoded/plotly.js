export default function sortObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj).sort();
}
