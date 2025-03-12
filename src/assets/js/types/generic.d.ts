interface Ref<T> {
    key: string;
    value: T | null;
    _value: T | null;
}