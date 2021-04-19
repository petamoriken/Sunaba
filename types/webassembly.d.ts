/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-empty-interface, @typescript-eslint/no-explicit-any */

type BufferSource = ArrayBufferView | ArrayBuffer;

declare namespace WebAssembly {
  interface CompileError {
  }

  const CompileError: {
      prototype: CompileError;
      new(): CompileError;
  };

  interface Global {
      value: any;
      valueOf(): any;
  }

  const Global: {
      prototype: Global;
      new(descriptor: GlobalDescriptor, v?: any): Global;
  };

  interface Instance {
      readonly exports: Exports;
  }

  const Instance: {
      prototype: Instance;
      new(module: Module, importObject?: Imports): Instance;
  };

  interface LinkError {
  }

  const LinkError: {
      prototype: LinkError;
      new(): LinkError;
  };

  interface Memory {
      readonly buffer: ArrayBuffer;
      grow(delta: number): number;
  }

  const Memory: {
      prototype: Memory;
      new(descriptor: MemoryDescriptor): Memory;
  };

  interface Module {
  }

  const Module: {
      prototype: Module;
      new(bytes: BufferSource): Module;
      customSections(moduleObject: Module, sectionName: string): ArrayBuffer[];
      exports(moduleObject: Module): ModuleExportDescriptor[];
      imports(moduleObject: Module): ModuleImportDescriptor[];
  };

  interface RuntimeError {
  }

  const RuntimeError: {
      prototype: RuntimeError;
      new(): RuntimeError;
  };

  interface Table {
      readonly length: number;
      get(index: number): Function | null;
      grow(delta: number): number;
      set(index: number, value: Function | null): void;
  }

  const Table: {
      prototype: Table;
      new(descriptor: TableDescriptor): Table;
  };

  interface GlobalDescriptor {
      mutable?: boolean;
      value: ValueType;
  }

  interface MemoryDescriptor {
      initial: number;
      maximum?: number;
  }

  interface ModuleExportDescriptor {
      kind: ImportExportKind;
      name: string;
  }

  interface ModuleImportDescriptor {
      kind: ImportExportKind;
      module: string;
      name: string;
  }

  interface TableDescriptor {
      element: TableKind;
      initial: number;
      maximum?: number;
  }

  interface WebAssemblyInstantiatedSource {
      instance: Instance;
      module: Module;
  }

  type ImportExportKind = "function" | "global" | "memory" | "table";
  type TableKind = "anyfunc";
  type ValueType = "f32" | "f64" | "i32" | "i64";
  type ExportValue = Function | Global | Memory | Table;
  type Exports = Record<string, ExportValue>;
  type ImportValue = ExportValue | number;
  type ModuleImports = Record<string, ImportValue>;
  type Imports = Record<string, ModuleImports>;
  function compile(bytes: BufferSource): Promise<Module>;
  function instantiate(bytes: BufferSource, importObject?: Imports): Promise<WebAssemblyInstantiatedSource>;
  function instantiate(moduleObject: Module, importObject?: Imports): Promise<Instance>;
  function validate(bytes: BufferSource): boolean;
}
