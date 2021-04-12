import type { Program } from "./parser/syntax";
import { parseToSyntaxTree } from "./parser/syntax";
import { parseToTokens } from "./parser/token";

export { ParseError } from "./parser/error";

/** @throws {ParseError} */
export function parse(source: string): Program {
  const lineTokens = parseToTokens(source);
  return parseToSyntaxTree(lineTokens);
}
