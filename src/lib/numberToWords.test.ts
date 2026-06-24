import { describe, it, expect } from "vitest";
import { numberToWords, amountInWords } from "@/lib/numberToWords";

describe("numberToWords", () => {
  it("zero / negatives", () => {
    expect(numberToWords(0)).toBe("Zero");
    expect(numberToWords(-5)).toBe("Zero");
  });
  it("ones, teens, tens", () => {
    expect(numberToWords(7)).toBe("Seven");
    expect(numberToWords(13)).toBe("Thirteen");
    expect(numberToWords(20)).toBe("Twenty");
    expect(numberToWords(80)).toBe("Eighty");
    expect(numberToWords(99)).toBe("Ninety Nine");
  });
  it("hundreds", () => {
    expect(numberToWords(100)).toBe("One Hundred");
    expect(numberToWords(780)).toBe("Seven Hundred Eighty");
    expect(numberToWords(305)).toBe("Three Hundred Five");
  });
  it("thousands", () => {
    expect(numberToWords(1000)).toBe("One Thousand");
    expect(numberToWords(1250)).toBe("One Thousand Two Hundred Fifty");
    expect(numberToWords(12500)).toBe("Twelve Thousand Five Hundred");
  });
  it("lakh / crore (Indian system)", () => {
    expect(numberToWords(100000)).toBe("One Lakh");
    expect(numberToWords(150000)).toBe("One Lakh Fifty Thousand");
    expect(numberToWords(10000000)).toBe("One Crore");
  });
});

describe("amountInWords", () => {
  it("wraps with Rupees … Only and rounds paise", () => {
    expect(amountInWords(780)).toBe("Rupees Seven Hundred Eighty Only");
    expect(amountInWords(200.4)).toBe("Rupees Two Hundred Only");
    expect(amountInWords(199.5)).toBe("Rupees Two Hundred Only");
    expect(amountInWords(0)).toBe("Rupees Zero Only");
  });
});
