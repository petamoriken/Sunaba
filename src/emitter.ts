import { encodeULEB128 } from "@thi.ng/leb128";

const MAGIC_MODULE_HEADER = Object.freeze([0x00, 0x61, 0x73, 0x6d]);
const MODULE_VERSION = Object.freeze([0x01, 0x00, 0x00, 0x00]);

type SectionId = Branded<number, "__section_id">;

// https://webassembly.github.io/spec/core/binary/modules.html#sections
const SECTION_TYPE_ID = 1 as SectionId;
const SECTION_FUNCTION_ID = 3 as SectionId;
const SECTION_EXPORT_ID = 7 as SectionId;
const SECTION_CODE_ID = 10 as SectionId;

// https://webassembly.github.io/spec/core/binary/types.html
const TYPE_FUNCTION = 0x60 as Branded<number, "__type_function">;
const TYPE_VALUE_f32 = 0x7d;

type FunctionType = [typeof TYPE_FUNCTION, ...number[]];

// http://webassembly.github.io/spec/core/binary/modules.html#export-section
const EXPORT_DESCRIPTION_FUNCTION = 0x00;

// https://webassembly.github.io/spec/core/binary/instructions.html
const OPCODE_END = 0x0B;
const OPCODE_GET_LOCAL = 0x20;
const OPCODE_f32_ADD = 0x92;

type Vector = Branded<number[], "__vector">;

function encodeVector<T extends number[] | number[][]>(data: T): Vector {
  return [
    ...encodeULEB128(data.length),
    ...data.flat(),
  ] as Vector;
}

const textEncoder = new TextEncoder();
function encodeString(str: string): number[] {
  const array = textEncoder.encode(str);
  return [
    array.length,
    ...array,
  ];
}

function createSection(type: SectionId, vector: Vector): number[] {
  return [
    type,
    ...encodeVector(vector),
  ];
}

export function emit(): ArrayBuffer {
  const functionType: FunctionType = [
    TYPE_FUNCTION,
    ...encodeVector([TYPE_VALUE_f32, TYPE_VALUE_f32]), // args
    ...encodeVector([TYPE_VALUE_f32]), // returns
  ];

  const typeSection = createSection(
    SECTION_TYPE_ID,
    encodeVector([functionType]),
  );

  const functionSection = createSection(
    SECTION_FUNCTION_ID,
    encodeVector([0x00]), // type index
  );

  const exportSection = createSection(
    SECTION_EXPORT_ID,
    encodeVector([
      [...encodeString("run"), EXPORT_DESCRIPTION_FUNCTION, /* function index */ 0x00],
    ]),
  );

  const code = [
    OPCODE_GET_LOCAL,
    ...encodeULEB128(0),
    OPCODE_GET_LOCAL,
    ...encodeULEB128(1),
    OPCODE_f32_ADD,
    OPCODE_END,
  ];

  const functionBody = encodeVector([
    0x00, // locals
    ...code,
  ]);

  const codeSection = createSection(
    SECTION_CODE_ID,
    encodeVector([functionBody]),
  );

  return new Uint8Array([
    ...MAGIC_MODULE_HEADER,
    ...MODULE_VERSION,
    ...typeSection,
    ...functionSection,
    ...exportSection,
    ...codeSection,
  ]).buffer;
}
