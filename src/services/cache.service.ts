export class CacheService {
  private cache: Map<string, string> = new Map();

  get(key: string): string | undefined {
    return this.cache.get(key);
  }
  set(key: string, value: string): void {
    this.cache.set(key, value);
  }
  size(): number {
    return this.cache.size;
  }
  entries(): IterableIterator<[string, string]> {
    return this.cache.entries();
  }
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  clear(): void {
    this.cache.clear();
  }
}
