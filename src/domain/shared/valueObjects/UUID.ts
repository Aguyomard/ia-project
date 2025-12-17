/**
 * Value Object représentant un UUID
 */
export class UUID {
  private constructor(private readonly value: string) {
    if (!UUID.isValid(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
  }

  static create(value: string): UUID {
    return new UUID(value);
  }

  static isValid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UUID): boolean {
    return this.value === other.value;
  }
}
