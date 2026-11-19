import { describe, expect, it } from "vitest";
import { assertCan, can, resolveRole, type AccessSubject } from "@/lib/access";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

const doc: AccessSubject = {
  ownerId: "alice",
  shares: [
    { userId: "bob", role: "EDITOR" },
    { userId: "carol", role: "VIEWER" },
  ],
};

describe("resolveRole", () => {
  it("maps owner, editor, viewer and strangers", () => {
    expect(resolveRole(doc, "alice")).toBe("owner");
    expect(resolveRole(doc, "bob")).toBe("editor");
    expect(resolveRole(doc, "carol")).toBe("viewer");
    expect(resolveRole(doc, "mallory")).toBeNull();
  });
});

describe("permission matrix", () => {
  it.each([
    ["owner", "edit", true],
    ["owner", "share", true],
    ["owner", "delete", true],
    ["editor", "edit", true],
    ["editor", "share", false],
    ["editor", "delete", false],
    ["viewer", "read", true],
    ["viewer", "export", true],
    ["viewer", "edit", false],
  ] as const)("%s can %s → %s", (role, action, expected) => {
    expect(can(role, action)).toBe(expected);
  });

  it("denies everything when there is no role", () => {
    expect(can(null, "read")).toBe(false);
  });
});

describe("assertCan", () => {
  it("hides documents from users without access (404, not 403)", () => {
    expect(() => assertCan(null, "read")).toThrow(NotFoundError);
  });
  it("rejects viewers who try to edit with 403", () => {
    expect(() => assertCan("viewer", "edit")).toThrow(ForbiddenError);
  });
  it("lets editors edit", () => {
    expect(() => assertCan("editor", "edit")).not.toThrow();
  });
});
