export class ParseError extends Error {
  public name = "ParseError";

  public constructor(message: string) {
    super(message);
    Error.captureStackTrace?.(this, ParseError);
  }
}
