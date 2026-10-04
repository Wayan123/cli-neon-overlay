import { register, type ExtensionHost } from "../src/extension.ts";

export default function piNeon(host: ExtensionHost): void {
  register(host, { kind: "pi" });
}
