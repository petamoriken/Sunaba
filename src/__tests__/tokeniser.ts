import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import { tokenise } from "../tokeniser";

describe("parse Sunaba sources to tokens", () => {
  const targets = fg.sync(__dirname + "/data/*.txt").map((target) => {
    const info = path.parse(target);
    return [info.name, info.dir] as readonly [filename: string, filedir: string];
  });

  test.each(targets)("%s", async (filename, filedir) => {
    const [input, expected] = await Promise.all([
      fs.readFile(path.resolve(filedir, `${filename}.txt`), "utf-8"),
      fs.readFile(path.resolve(filedir, `${filename}.token.json`), "utf-8"),
    ]);
    expect([...tokenise(input)]).toEqual(JSON.parse(expected));
  })
});
