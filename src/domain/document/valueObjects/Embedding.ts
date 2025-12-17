/**
 * Value Object représentant un embedding vectoriel
 */
export class Embedding {
  private constructor(private readonly values: readonly number[]) {
    if (values.length === 0) {
      throw new Error('Embedding cannot be empty');
    }
  }

  static create(values: number[]): Embedding {
    return new Embedding(Object.freeze([...values]));
  }

  static fromArray(values: number[] | null): Embedding | null {
    if (!values || values.length === 0) {
      return null;
    }
    return Embedding.create(values);
  }

  toArray(): number[] {
    return [...this.values];
  }

  get dimension(): number {
    return this.values.length;
  }

  /**
   * Calcule la distance cosinus avec un autre embedding
   */
  cosineSimilarity(other: Embedding): number {
    if (this.dimension !== other.dimension) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this.dimension; i++) {
      dotProduct += this.values[i] * other.values[i];
      normA += this.values[i] ** 2;
      normB += other.values[i] ** 2;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

