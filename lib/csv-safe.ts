/**
 * Spreadsheet apps run a cell as a formula when it starts with = + - @ (or a
 * tab / carriage return). Names and class titles in exports are typed by
 * people, so prefix a single quote to keep them inert text.
 */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
