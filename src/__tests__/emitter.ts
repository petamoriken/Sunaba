import { emit } from "../emitter";

describe.only("exec WebAssembly bytecodes", () => {
  test("simple add function", async () => {
    const bytecode = emit();
    const { instance: { exports } } = await WebAssembly.instantiate(bytecode);
    const run = exports.run as (a: number, b: number) => number;
    expect(run(5, 6)).toEqual(11);
  });
});
