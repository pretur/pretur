export type Conversion<U extends string> = [U, U, number];

export type ConversionMatrix<U extends string> = {
  [S in U]: {[D in U]: number; };
};

export interface GridMatrix<U extends string> {
  indices: U[];
  grid: number[][];
}

export interface Convertor {
  (value: number): number;
}

export default class Units<U extends string> {
  private units: U[] = [];
  private matrix: ConversionMatrix<U> = <any>{};

  constructor(units: U[], conversions?: (Conversion<U>)[]) {
    units.filter(unit => typeof unit === 'string').forEach(unit => {
      if (this.units.indexOf(unit) === -1) {
        this.units.push(unit);
        this.matrix[unit] = <any>{};
        this.matrix[unit][unit] = 1;
      }
    });

    if (Array.isArray(conversions)) {
      conversions.filter(Array.isArray).forEach(conversion => this.addConversion(conversion));
    }
  }

  private addConversion([source, destination, ratio]: Conversion<U>) {
    if (source === destination) {
      throw new Error(`source and destination cannot be same`);
    }
    if (this.units.indexOf(source) === -1) {
      throw new Error(`source unit "${source}" is not a valid unit`);
    }
    if (this.units.indexOf(destination) === -1) {
      throw new Error(`destination unit "${destination}" is not a valid unit`);
    }
    if (typeof ratio !== 'number') {
      throw new Error(`Ratio ${ratio} is not a number`);
    }
    if (ratio === 0 || Number.isNaN(ratio) || ratio === -Infinity) {
      throw new Error(`Ratio cannot be zero, NaN or negative infinity`);
    }

    this.matrix[source][destination] = ratio;
    this.matrix[destination][source] = ratio === Infinity ? ratio : Math.pow(ratio, -1);
  }

  private calculateCoefficient(source: U, destination: U): number {
    const stack: string[] = [];
    stack.push(source);

    // Faster than linear search
    const visited: { [unit: string]: boolean } = {};

    // DFS visit
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!visited[current]) {
        visited[current] = true;

        Object.keys(this.matrix[current]).forEach(next => {

          stack.push(next);

          // Populate the matrix if possible
          if (!this.matrix[source][next]) {
            if (this.matrix[source][current] && this.matrix[current][next]) {
              const ratio = this.matrix[source][current] * this.matrix[current][next];
              this.matrix[source][next] = ratio;
              this.matrix[next][source] = Math.pow(ratio, -1);
            }
          }

        });
      }
    }

    if (this.matrix[source][destination]) {
      return this.matrix[source][destination];
    }

    // Source has no path to destination.
    this.matrix[source][destination] = Infinity;
    this.matrix[destination][source] = Infinity;

    // None of the visited units can reach destination
    // if source has no path to destination.
    Object.keys(visited).forEach(key => {
      this.matrix[key][destination] = Infinity;
      this.matrix[destination][key] = Infinity;
    });

    return Infinity;
  }

  public getRatio(source: U, destination: U): number {
    if (this.units.indexOf(source) === -1) {
      throw new Error(`source unit "${source}" is not a valid unit`);
    }
    if (this.units.indexOf(destination) === -1) {
      throw new Error(`destination unit "${destination}" is not a valid unit`);
    }

    if (this.matrix[source][destination]) {
      return this.matrix[source][destination];
    }

    return this.calculateCoefficient(source, destination);
  }

  public convert(source: U, destination: U, value: number): number {
    const ratio = this.getRatio(source, destination);
    return ratio * value;
  }

  public createConverter(source: U, destination: U): Convertor | undefined {
    const ratio = this.getRatio(source, destination);
    if (ratio === Infinity) {
      return;
    }
    return value => ratio * value;
  }

  public getMatrix(type: 'nested'): ConversionMatrix<U>;
  public getMatrix(type: 'grid'): GridMatrix<U>;
  public getMatrix(type: 'array'): Conversion<U>[];
  public getMatrix(
    type: 'nested' | 'grid' | 'array',
  ): ConversionMatrix<U> | GridMatrix<U> | Conversion<U>[] {
    switch (type) {
      case 'nested':
        const nestedMatrix: ConversionMatrix<U> = <any>{};

        this.units.forEach(source => {
          nestedMatrix[source] = <any>{};

          this.units.forEach(destination => {
            nestedMatrix[source][destination] = this.matrix[source][destination]
              ? this.matrix[source][destination]
              : this.calculateCoefficient(source, destination);
          });

        });

        return nestedMatrix;
      case 'grid':
        const gridMatrix: GridMatrix<U> = { grid: [], indices: this.units.slice() };

        this.units.forEach((source, i) => {
          gridMatrix.grid[i] = [];

          this.units.forEach((destination, j) => {
            gridMatrix.grid[i][j] = this.matrix[source][destination]
              ? this.matrix[source][destination]
              : this.calculateCoefficient(source, destination);
          });

        });

        return gridMatrix;
      case 'array':
        const array: Conversion<U>[] = [];

        this.units.forEach(source => {
          this.units.forEach(destination => {
            const ratio = this.matrix[source][destination]
              ? this.matrix[source][destination]
              : this.calculateCoefficient(source, destination);
            array.push([source, destination, ratio]);
          });

        });

        return array;
    }
  }
}
