/** Only fresh setup boundaries translate an automatic name. Typed names are explicit. */
export class SetupDisplayName {
  private automatic = true;
  private fallback = 'Survivor';
  value = 'Survivor';

  start(defaultName: string) {
    this.fallback = defaultName;
    if (this.automatic) this.value = defaultName;
    return this.value;
  }
  edit(value: string) {
    this.value = value;
    this.automatic = !value.trim();
  }
  commit(value: string) {
    if (value !== this.value) this.edit(value);
    this.value = value.trim() || this.fallback;
    return this.value;
  }
}
