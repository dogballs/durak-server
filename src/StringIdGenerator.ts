const CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class StringIdGenerator {
  // https://stackoverflow.com/a/1349426/1573638
  static generate(length: number): string {
    let result = '';
    const charactersLength = CHARACTERS.length;
    for (let i = 0; i < length; i++) {
      result += CHARACTERS.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static generateUnique(length: number, except: string[] = []): string {
    let id;
    do {
      id = this.generate(length);
    } while (except.includes(id));
    return id;
  }

  static validate(id: string, length: number): boolean {
    if (id.length !== length) {
      return false;
    }

    return id.split('').every((char) => CHARACTERS.includes(char));
  }
}
