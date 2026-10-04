import { register, type ExtensionHost } from "../src/extension.ts";

export default function ompNeon(host: ExtensionHost): void {
  register(host, { kind: "omp" });
}
