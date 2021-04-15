import type { Program } from "./parser";
import { parse as _parse } from "./parser";
import { tokenise } from "./tokeniser";

export { ParseError } from "./error";

/** @throws {@link ParseError} */
export function parse(source: string): Program {
  const lineTokens = tokenise(source);
  return _parse(lineTokens);
}
