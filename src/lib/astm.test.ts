import { describe, it, expect } from "vitest";
import { parseAnalyzer, normKey } from "./astm";

// Real capture from the lab's Dymind DH3x cell counter (HL7 v2.3.1 over TCP).
const DYMIND_HL7 = [
  "MSH|^~\\&|DH3x|Dymind|||20260615162237||ORU^R01|20260615_153944_347|P|2.3.1||||||UNICODE",
  "PID|1||51^^^^MR||^MRS NEHA|||Female",
  "PV1|1",
  "OBR|1||51|01001^Automated Count^99MRC||20260615153905|20260615153944|||||||20260615153905||||||||||HM||||||||admin",
  "OBX|1|IS|02001^Take Mode^99MRC||O||||||F",
  "OBX|3|IS|02003^Test Mode^99MRC||CBC+3DIFF||||||F",
  "OBX|4|NM|30525-0^Age^LN||29|yr|||||F",
  "OBX|7|NM|6690-2^WBC^LN||9.31|10*3/uL|3.50-9.50|~N|||F",
  "OBX|8|NM|736-9^LYM%^LN||21.6|%|20.0-50.0|~N|||F",
  "OBX|9|NM|20482-6^GRAN%^LN||74.8|%|50.0-70.0|H~A|||F",
  "OBX|14|NM|789-8^RBC^LN||3.64|10*6/uL|3.80-5.10|L~A|||F",
  "OBX|15|NM|718-7^HGB^LN||9.8|g/dL|11.5-15.0|L~A|||F",
  "OBX|22|NM|777-3^PLT^LN||200|10*3/uL|125-350|~N|||F",
].join("\r\n");

describe("parseAnalyzer — HL7 v2 (Dymind DH3x)", () => {
  const reading = parseAnalyzer(DYMIND_HL7);

  it("reads numeric results keyed by parameter label", () => {
    expect(reading.values[normKey("WBC")]?.value).toBe("9.31");
    expect(reading.values[normKey("HGB")]?.value).toBe("9.8");
    expect(reading.values[normKey("RBC")]?.value).toBe("3.64");
    expect(reading.values[normKey("PLT")]?.value).toBe("200");
  });

  it("keys the 3-part differential so the lab's CBC codes match (LYM%→LYMPCT, GRAN%→GRANPCT)", () => {
    expect(reading.values["LYMPCT"]?.value).toBe("21.6");
    expect(reading.values["GRANPCT"]?.value).toBe("74.8");
    // lab CBC test codes normalise to the same keys
    expect(normKey("LYM_PCT")).toBe("LYMPCT");
    expect(normKey("GRAN_PCT")).toBe("GRANPCT");
  });

  it("captures units and skips coded mode/remark lines", () => {
    expect(reading.values[normKey("WBC")]?.unit).toBe("10*3/uL");
    // 'Take Mode' / 'Test Mode' are IS-coded, non-numeric → not stored as results
    expect(reading.values[normKey("Take Mode")]).toBeUndefined();
    expect(reading.values[normKey("Test Mode")]).toBeUndefined();
  });
});
