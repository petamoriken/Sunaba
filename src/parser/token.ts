import { ParseError } from "./error";

const lineRegExp = /(.*)((?:\r?\n)|$)/gu;

function* iterateLine(source: string): IterableIterator<{ column: number; space: number; text: string }> {
  let column = 0;
  for (const matches of source.matchAll(lineRegExp)) {
    const raw = matches[1];
    if (raw !== "") {
      let space = 0;
      for (const char of raw.match(/^\s*/)![0]) {
        if (char === "\t") {
          space += 8;
        } else {
          ++space;
        }
      }
      const text = raw.trim();
      yield { column, space, text };
    }
    ++column;
  }
}

function* iterateCodePoint(text: string): IterableIterator<{ row: number; codePoint: string }> {
  let row = 0;
  for (const codePoint of text) {
    yield { row, codePoint };
    row += codePoint.length;
  }
  yield { row, codePoint: "EOL" };
}

export type Operator = "+" | "-" | "*" | "/" | "=" | "!=" | ">" | ">=" | "<" | "<=";

function isNumberCodePoint(codePoint: string): boolean {
  if (codePoint === "EOL") {
    return false;
  }
  const code = codePoint.charCodeAt(0);
  return code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0);
}

function isIdentifierCodePoint(codePoint: string): boolean {
  if (codePoint === "EOL") {
    return false;
  }
  if (codePoint === "@" || codePoint === "$" || codePoint === "?" || codePoint === "_" || codePoint === "'") {
    return true;
  }
  const code = codePoint.charCodeAt(0);
  return (
    code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0) ||
    code >= "A".charCodeAt(0) && code <= "Z".charCodeAt(0) ||
    code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0) ||
    code >= 0x100
  );
}

interface IdentifierToken {
  type: "IdentifierToken";
  value: string;
}

interface MemoryToken {
  type: "MemoryToken";
}

interface IfToken {
  type: "IfToken";
}

interface WhileToken {
  type: "WhileToken";
}

interface DefToken {
  type: "DefToken";
}

interface ConstToken {
  type: "ConstToken";
}

interface NumericLiteralToken {
  type: "NumericLiteralToken";
  value: string;
}

interface OperatorToken {
  type: "OperatorToken";
  value: Operator;
}

interface SeparatorToken {
  type: "SeparatorToken";
}

interface AssignmentToken {
  type: "AssignmentToken";
}

interface ParentheseStartToken {
  type: "ParentheseStartToken";
}

interface ParentheseEndToken {
  type: "ParentheseEndToken";
}

interface BracketStartToken {
  type: "BracketStartToken";
}

interface BracketEndToken {
  type: "BracketEndToken";
}

export type Token = | IdentifierToken
                    | MemoryToken
                    | IfToken
                    | WhileToken
                    | DefToken
                    | ConstToken
                    | NumericLiteralToken
                    | OperatorToken
                    | SeparatorToken
                    | AssignmentToken
                    | ParentheseStartToken
                    | ParentheseEndToken
                    | BracketStartToken
                    | BracketEndToken;

export interface LineToken {
  column: number;
  indent: number;
  tokens: (Token & { row: number })[];
}

export function parseToTokens(source: string): LineToken[] {
  const lineTokens: LineToken[] = [];
  const indents: number[] = [0];

  let multiLineCommentCount = 0;
  for (const { column, space, text } of iterateLine(source)) {
    const tokens: (Token & { row: number })[] = [];

    let state: "identifier" | "literal" | "minus" | "angle_or_exclamation" | "slash" | null = null;
    let startRow = 0;
    loop: for(const { row, codePoint } of iterateCodePoint(text)) {
      if (multiLineCommentCount > 0) {
        const operator = text.slice(row - 1, row + 1);
        if (operator === "/*") {
          ++multiLineCommentCount;
        } else if (operator === "*/") {
          --multiLineCommentCount;
        }
        continue loop;
      }

      switch (state) {
        case "identifier":
          if (isIdentifierCodePoint(codePoint)) {
            continue loop;
          } else {
            const word = text.slice(startRow, row);
            if (word === "memory") {
              tokens.push({
                type: "MemoryToken",
                row: startRow + 1,
              });
            } else if (word === "if") {
              tokens.push({
                type: "IfToken",
                row: startRow + 1,
              });
            } else if (word === "while") {
              tokens.push({
                type: "WhileToken",
                row: startRow + 1,
              });
            } else if (word === "def") {
              tokens.push({
                type: "DefToken",
                row: startRow + 1,
              });
            } else if (word === "const") {
              tokens.push({
                type: "ConstToken",
                row: startRow + 1,
              });
            } else {
              tokens.push({
                type: "IdentifierToken",
                value: word,
                row: startRow + 1,
              });
            }
            state = null;
          }
          break;

        case "literal":
          if (isNumberCodePoint(codePoint)) {
            continue loop;
          } else {
            const number = text.slice(startRow, row);
            tokens.push({
              type: "NumericLiteralToken",
              value: number,
              row: startRow + 1,
            });
            state = null;
          }
          break;

        case "minus":
          if (codePoint === ">") {
            tokens.push({
              type: "AssignmentToken",
              row: startRow + 1,
            });
            state = null;
            continue loop;
          } else {
            tokens.push({
              type: "OperatorToken",
              value: "-",
              row: startRow + 1,
            });
            state = null;
          }
          break;

        case "angle_or_exclamation":
          if (codePoint === "=") {
            tokens.push({
              type: "OperatorToken",
              value: text.slice(startRow, row + 1) as ">=" | "<=" | "!=",
              row: startRow + 1,
            });
            state = null;
            continue loop;
          } else {
            const operator = text.slice(startRow, row) as ">" | "<" | "!";
            if (operator === "!") {
              throw new ParseError(`${column + 1} ${startRow + 1}: There should be only '=' after the '!'`);
            }
            tokens.push({
              type: "OperatorToken",
              value: operator,
              row: startRow + 1,
            });
            state = null;
          }
          break;

        case "slash":
          if (codePoint === "*") {
            // multi-line comment
            multiLineCommentCount = 1;
            state = null;
            continue loop;
          } else {
            tokens.push({
              type: "OperatorToken",
              value: "/",
              row: startRow + 1,
            });
            state = null;
          }
      }

      if (state !== null) {
        continue loop;
      }

      if (codePoint === "#") {
        // line comment
        break loop;
      } else if (codePoint === "-") {
        state = "minus";
        startRow = row;
      } else if (codePoint === "<" || codePoint === ">" || codePoint === "!") {
        state = "angle_or_exclamation";
        startRow = row;
      } else if (codePoint === "/") {
        state = "slash";
        startRow = row;
      } else if (codePoint === "+" || codePoint === "=" || codePoint === "*") {
        tokens.push({
          type: "OperatorToken",
          value: codePoint,
          row: row + 1,
        });
      } else if (codePoint === ",") {
        tokens.push({
          type: "SeparatorToken",
          row: row + 1,
        });
      } else if (codePoint === "(") {
        tokens.push({
          type: "ParentheseStartToken",
          row: row + 1,
        });
      } else if (codePoint === ")") {
        tokens.push({
          type: "ParentheseEndToken",
          row: row + 1,
        });
      } else if (codePoint === "[") {
        tokens.push({
          type: "BracketStartToken",
          row: row + 1,
        });
      } else if (codePoint === "]") {
        tokens.push({
          type: "BracketEndToken",
          row: row + 1,
        });
      } else if (isNumberCodePoint(codePoint)) {
        state = "literal";
        startRow = row;
      } else if (isIdentifierCodePoint(codePoint)) {
        state = "identifier";
        startRow = row;
      }
    }

    const indentIndex = indents.indexOf(space);
    if (indentIndex === -1) {
      if (indents[indents.length - 1] > space) {
        throw new ParseError(`${column + 1}: Invalid indent space`);
      } else {
        indents.push(space);
      }
    } else {
      indents.length = indentIndex + 1;
    }

    if (tokens.length !== 0) {
      lineTokens.push({
        column: column + 1,
        indent: indents.length - 1,
        tokens,
      });
    }
  }

  if (multiLineCommentCount !== 0) {
    throw new ParseError(`${lineTokens[lineTokens.length - 1].column}: The multi-line comment is not closed`);
  }

  return lineTokens;
}
