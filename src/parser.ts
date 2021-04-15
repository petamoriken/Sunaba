import { ParseError } from "./error";
import type { LineToken, Operator, Token } from "./tokeniser";

export interface Program {
  type: "Program";
  body: RootStatement[];
}

interface AssignmentStatement {
  type: "AssignmentStatement";
  left: MemberExpression | Identifier;
  right: Expression;
}

interface ExpressionStatement {
  type: "ExpressionStatement";
  expression: CallExpression;
}

interface IfStatement {
  type: "IfStatement";
  test: Expression;
  body: Statement[];
}

interface WhileStatement {
  type: "WhileStatement";
  test: Expression;
  body: Statement[];
}

interface ConstantStatement {
  type: "ConstantStatement";
  left: Identifier;
  right: Expression;
}

interface FunctionDeclaration {
  type: "FunctionDeclaration";
  id: Identifier;
  params: Identifier[];
  body: Statement[];
}

type RootStatement = | AssignmentStatement
                     | ExpressionStatement
                     | IfStatement
                     | WhileStatement
                     | ConstantStatement
                     | FunctionDeclaration;

type Statement = | AssignmentStatement
                 | ExpressionStatement
                 | IfStatement
                 | WhileStatement;

interface UnaryExpression {
  type: "UnaryExpression";
  operator: "+" | "-";
  argument: Expression;
}

interface BinaryExpression {
  type: "BinaryExpression";
  operator: Operator;
  left: Expression;
  right: Expression;
}

interface MemberExpression {
  type: "MemberExpression";
  target: Identifier;
  property: Expression;
}

interface CallExpression {
  type: "CallExpression";
  callee: Identifier;
  arguments: Expression[];
}

interface Identifier {
  type: "Identifier";
  name: string;
}

interface NumericLiteral {
  type: "NumericLiteral";
  value: number;
}

type Expression = | UnaryExpression
                  | BinaryExpression
                  | MemberExpression
                  | CallExpression
                  | Identifier
                  | NumericLiteral;

type ExpressionState = {
  type: "binary",
  left: Expression,
} | {
  type: "unary",
  operator: "+" | "-",
} | null;

function parseExpression(column: number, tokens: (Token & { row: number })[], state: ExpressionState = null): Expression {
  if (tokens.length === 0) {
    throw new ParseError(`${column}: Syntax Error`);
  }

  const token = tokens[0];
  if (token.type === "IfToken" || token.type === "WhileToken" || token.type === "DefToken" || token.type === "ConstToken" || token.type === "AssignmentToken") {
    throw new ParseError(`${column} ${token.row}: It contains words that must not be included in the expression`);
  }

  if (state === null || state.type === "unary") {
    switch (token.type) {
      case "BracketStartToken":
      case "BracketEndToken":
      case "ParentheseEndToken":
      case "SeparatorToken":
        throw new ParseError(`${column} ${token.row}: Syntax Error`);

      case "IdentifierToken": {
        const identifier: Identifier = {
          type: "Identifier",
          name: token.value,
        };

        if (tokens.length === 1) {
          return state?.type === "unary" ? {
            type: "UnaryExpression",
            operator: state.operator,
            argument: identifier,
          } : identifier;
        } else if (tokens[1].type === "BracketStartToken") {
          let bracketEndIndex = -1;

          {
            let count = 0;
            for (const [index, token] of tokens.slice(1).entries()) {
              if (token.type === "BracketStartToken") {
                ++count;
              } else if (token.type === "BracketEndToken") {
                --count;
                if (count === 0) {
                  bracketEndIndex = index + 1;
                  break;
                }
              }
            }
          }

          if (bracketEndIndex === -1) {
            throw new ParseError(`${column} ${tokens[1].row}: The bracket is not closed`);
          }

          const propertyTokens = tokens.slice(2, bracketEndIndex);
          if (propertyTokens.length === 0) {
            throw new ParseError(`${column} ${tokens[1].row}: The contents of the bracket are empty`);
          }

          const member: MemberExpression = {
            type: "MemberExpression",
            target: identifier,
            property: parseExpression(column, propertyTokens),
          };

          const expression: UnaryExpression | MemberExpression = state?.type === "unary" ? {
            type: "UnaryExpression",
            operator: state.operator,
            argument: member,
          } : member;

          const remains = tokens.slice(bracketEndIndex + 1);
          if (remains.length === 0) {
            return expression;
          } else {
            return parseExpression(column, remains, { type: "binary", left: expression });
          }
        } else if (tokens[1].type === "ParentheseStartToken") {
          const argumentTokens: (Token & { row: number })[][] = [];

          let parentheseEndIndex = -1;

          {
            let count = 0, start = 0;
            for (const [index, token] of tokens.slice(1).entries()) {
              if (token.type === "ParentheseStartToken") {
                ++count;
              } else if (token.type === "ParentheseEndToken") {
                --count;
                if (count === 0) {
                  if (start + 2 !== index + 1) {
                    argumentTokens.push(tokens.slice(start + 2, index + 1));
                  }
                  parentheseEndIndex = index + 1;
                  break;
                }
              } else if (token.type === "SeparatorToken" && count === 1) {
                argumentTokens.push(tokens.slice(start + 2, index + 1));
                start = index;
              }
            }
          }

          if (parentheseEndIndex === -1) {
            throw new ParseError(`${column} ${tokens[1].row}: The parenthese is not closed`);
          }

          const call: CallExpression = {
            type: "CallExpression",
            callee: identifier,
            arguments: argumentTokens.map((tokens) => {
              return parseExpression(column, tokens);
            }),
          };

          const expression: UnaryExpression | CallExpression = state?.type === "unary" ? {
            type: "UnaryExpression",
            operator: state.operator,
            argument: call,
          } : call;

          const remains = tokens.slice(parentheseEndIndex + 1);
          if (remains.length === 0) {
            return expression;
          } else {
            return parseExpression(column, remains, { type: "binary", left: expression });
          }
        } else {
          const remains = tokens.slice(1);
          return parseExpression(column, remains, {
            type: "binary",
            left: state?.type === "unary" ? {
              type: "UnaryExpression",
              operator: state.operator,
              argument: identifier,
            } : identifier,
          });
        }
      }

      case "MemoryToken": {
        if (tokens[1] === undefined || tokens[1].type !== "BracketStartToken") {
          throw new ParseError(`${column} ${tokens[1]?.row ?? token.row + 6}: It must be a bracket after \`memory\` keyword`);
        }

        let bracketEndIndex = -1;

        {
          let count = 0;
          for (const [index, token] of tokens.slice(1).entries()) {
            if (token.type === "BracketStartToken") {
              ++count;
            } else if (token.type === "BracketEndToken") {
              --count;
              if (count === 0) {
                bracketEndIndex = index + 1;
                break;
              }
            }
          }
        }

        if (bracketEndIndex === -1) {
          throw new ParseError(`${column} ${tokens[1].row}: The bracket is not closed`);
        }

        const propertyTokens = tokens.slice(2, bracketEndIndex);
        if (propertyTokens.length === 0) {
          throw new ParseError(`${column} ${tokens[1].row}: The contents of the bracket are empty`);
        }

        const member: MemberExpression = {
          type: "MemberExpression",
          target: {
            type: "Identifier",
            name: "memory",
          },
          property: parseExpression(column, propertyTokens),
        };

        const expression: UnaryExpression | MemberExpression = state?.type === "unary" ? {
          type: "UnaryExpression",
          operator: state.operator,
          argument: member,
        } : member;

        const remains = tokens.slice(bracketEndIndex + 1);
        if (remains.length === 0) {
          return expression;
        } else {
          return parseExpression(column, remains, { type: "binary", left: expression });
        }
      }

      case "NumericLiteralToken": {
        const raw = Number.parseInt(token.value, 10);
        const value = (state?.type === "unary" && state.operator === "-") ? -raw : raw;
        if (value !== (value | 0)) {
          throw new ParseError(`${column} ${token.row}: Out of range integer value`);
        }

        const literal: NumericLiteral = {
          type: "NumericLiteral",
          value,
        };

        if (tokens.length === 1) {
          return literal;
        } else {
          const remains = tokens.slice(1);
          return parseExpression(column, remains, { type: "binary", left: literal });
        }
      }

      case "OperatorToken": {
        const operator = token.value;
        if (operator !== "+" && operator !== "-") {
          throw new ParseError(`${column} ${token.row}: Invalid operator`);
        }

        const remains = tokens.slice(1);
        return parseExpression(column, remains, { type: "unary", operator });
      }

      case "ParentheseStartToken": {
        let parentheseEndIndex = -1;

        {
          let count = 0;
          for (const [index, token] of tokens.entries()) {
            if (token.type === "ParentheseStartToken") {
              ++count;
            } else if (token.type === "ParentheseEndToken") {
              --count;
              if (count === 0) {
                parentheseEndIndex = index;
                break;
              }
            }
          }
        }

        if (parentheseEndIndex === -1) {
          throw new ParseError(`${column} ${token.row}: The parenthese is not closed`);
        }

        const parentheseTokens = tokens.slice(1, parentheseEndIndex);
        if (parentheseTokens.length === 0) {
          throw new ParseError(`${column} ${token.row}: The parenthese of the bracket are empty`);
        }

        const parentheseExpression = parseExpression(column, parentheseTokens);
        const expression: Expression = state?.type === "unary" ? {
          type: "UnaryExpression",
          operator: state.operator,
          argument: parentheseExpression,
        } : parentheseExpression;

        if (parentheseEndIndex === tokens.length - 1) {
          return expression;
        } else {
          const remains = tokens.slice(parentheseEndIndex + 1);
          return parseExpression(column, remains, { type: "binary", left: expression });
        }
      }

      default:
        // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
        const _exhaustiveCheck: never = token;
        throw new Error(`Unexpected token type: ${(_exhaustiveCheck as Token).type}`);
    }
  } else {
    if (token.type !== "OperatorToken") {
      throw new ParseError(`${column} ${token.row}: Syntax Error`);
    }

    const remains = tokens.slice(1);
    let root: BinaryExpression = {
      type: "BinaryExpression",
      operator: token.value,
      left: state.left,
      right: parseExpression(column, remains),
    };

    // left rotate
    while (root.right.type === "BinaryExpression") {
      const newRoot = root.right;
      root.right = newRoot.left;
      newRoot.left = root;
      root = newRoot;
    }

    return root;
  }
}

export function parse(lineTokens: Iterable<LineToken>): Program {
  const body: RootStatement[] = [];

  let lastLineToken: LineToken | null = null;

  /** statement indent stack */
  const statements: [RootStatement[], ...Statement[][]] = [body];

  /** min value allowed for indent on next line */
  let minIndent: number | null = null;
  /** max value allowed for indent on next line */
  let maxIndent: number | null = null;

  for (const lineToken of lineTokens) {
    const { column, indent, tokens } = lineToken;

    // check indent
    if ((minIndent !== null && minIndent > indent) || (maxIndent !== null && maxIndent < indent)) {
      throw new ParseError(`${column}: Invalid indent space`);
    } else {
      minIndent = null;
      maxIndent = null;
    }

    // pop statements from indent stack
    statements.length = indent + 1;

    const token = tokens[0];
    switch (token.type) {
      case "NumericLiteralToken":
      case "OperatorToken":
      case "AssignmentToken":
      case "ParentheseStartToken":
      case "ParentheseEndToken":
      case "BracketStartToken":
      case "BracketEndToken":
      case "SeparatorToken":
        throw new ParseError(`${column}: Syntax Error`);

      case "IdentifierToken":
      case "MemoryToken": {
        const index = tokens.findIndex(({ type }) => {
          return type === "AssignmentToken";
        });

        if (index !== -1) {
          const leftTokens = tokens.slice(0, index);
          if (leftTokens.length === 0) {
            throw new ParseError(`${column} ${tokens[index].row}: The left side of the assignment operator is empty`);
          }

          const left = parseExpression(column, leftTokens);
          if (left.type !== "MemberExpression" && left.type !== "Identifier") {
            throw new ParseError(`${column} ${leftTokens[0].row}: The left side of the assignment operator is not assignable`);
          }

          const rightTokens = tokens.slice(index + 1);
          if (rightTokens.length === 0) {
            throw new ParseError(`${column} ${tokens[index].row}: The right side of the assignment operator is empty`);
          }

          const right = parseExpression(column, rightTokens);

          statements[statements.length - 1].push({
            type: "AssignmentStatement",
            left,
            right,
          });
        } else {
          const expression = parseExpression(column, tokens);
          if (expression.type !== "CallExpression") {
            throw new ParseError(`${column}: This expression has no effect`);
          }

          statements[statements.length - 1].push({
            type: "ExpressionStatement",
            expression
          });
        }

        maxIndent = indent;
        break;
      }

      case "IfToken": {
        const testTokens = tokens.slice(1);
        if (testTokens.length === 0) {
          throw new ParseError(`${column} ${token.row + 2}: There is no condition in the \`if\` statement`);
        }

        const test = parseExpression(column, testTokens);

        const body: Statement[] = [];
        statements[statements.length - 1].push({
          type: "IfStatement",
          test,
          body,
        });

        statements.push(body);
        minIndent = indent + 1;
        break;
      }

      case "WhileToken": {
        const testTokens = tokens.slice(1);
        if (testTokens.length === 0) {
          throw new ParseError(`${column} ${token.row + 2}: There is no condition in the \`while\` statement`);
        }

        const test = parseExpression(column, testTokens);

        const body: Statement[] = [];
        statements[statements.length - 1].push({
          type: "WhileStatement",
          test,
          body,
        });

        statements.push(body);
        minIndent = indent + 1;
        break;
      }

      case "ConstToken": {
        if (indent !== 0) {
          throw new ParseError(`${column} ${token.row}: \`const\` keyword must be in the root scope (no indent)`);
        }

        const identifierToken = tokens[1];
        if (identifierToken?.type !== "IdentifierToken") {
          throw new ParseError(`${column} ${identifierToken.row}: \`const\` keyword must be followed by an identifier`);
        }
        const identifier = parseExpression(column, [identifierToken]) as Identifier;

        const assignmentToken = tokens[2];
        if (assignmentToken.type !== "AssignmentToken") {
          throw new ParseError(`${column} ${assignmentToken.row}: Invalid \`const\` statement`);
        }

        const rightTokens = tokens.slice(3);
        if (rightTokens.length === 0) {
          throw new ParseError(`${column} ${assignmentToken.row}: The right side of the assignment operator is empty`);
        }

        const right = parseExpression(column, rightTokens);

        statements[0].push({
          type: "ConstantStatement",
          left: identifier,
          right,
        });

        maxIndent = indent;
        break;
      }

      case "DefToken": {
        if (indent !== 0) {
          throw new ParseError(`${column} ${token.row}: \`def\` keyword must be in the root scope (no indent)`);
        }

        const identifierToken = tokens[1];
        if (identifierToken?.type !== "IdentifierToken") {
          throw new ParseError(`${column} ${identifierToken.row}: \`def\` keyword must be followed by an identifier`);
        }
        const identifier = parseExpression(column, [identifierToken]) as Identifier;

        const parentheseStartToken = tokens[2];
        if (parentheseStartToken.type !== "ParentheseStartToken") {
          throw new ParseError(`${column} ${parentheseStartToken.row}: Invalid \`def\` statement`);
        }

        const paramtokens: (Token & { row: number })[][] = [];

        let parentheseEndIndex = -1;

        {
          let count = 0, start = 0;
          for (const [index, token] of tokens.slice(2).entries()) {
            if (token.type === "ParentheseStartToken") {
              ++count;
            } else if (token.type === "ParentheseEndToken") {
              --count;
              if (count === 0) {
                if (start + 3 !== index + 2) {
                  paramtokens.push(tokens.slice(start + 3, index + 2));
                }
                parentheseEndIndex = index + 2;
                break;
              }
            } else if (token.type === "SeparatorToken" && count === 1) {
              paramtokens.push(tokens.slice(start + 3, index + 2));
              start = index;
            }
          }
        }

        if (parentheseEndIndex === -1) {
          throw new ParseError(`${column} ${tokens[1].row}: The parenthese is not closed`);
        }

        const params = paramtokens.map((tokens) => {
          return parseExpression(column, tokens);
        });

        if (params.some((expression) => {return expression.type !== "Identifier";})) {
          throw new ParseError(`${column}: Invalid parameters`);
        }

        const body: Statement[] = [];
        statements[0].push({
          type: "FunctionDeclaration",
          id: identifier,
          params: params as Identifier[],
          body,
        });

        statements.push(body);
        minIndent = indent + 1;
        break;
      }

      default:
        // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
        const _exhaustiveCheck: never = token;
        throw new Error(`Unexpected token type: ${(_exhaustiveCheck as Token).type}`);
    }

    lastLineToken = lineToken;
  }

  if (minIndent !== null && lastLineToken !== null) {
    throw new ParseError(`${lastLineToken.column}: There is no body for the last \`if\` or \`while\` or \`def\` statement`);
  }

  return {
    type: "Program",
    body,
  };
}
