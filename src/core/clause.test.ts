import { describe, it, expect } from "vitest";

import { buildClause, canCommitClause, defaultOp, keepsValueShape } from "./clause";
import { clauseLabel } from "./clause-label";
import { defaultGridMessages } from "./messages";
import type { GridColumn } from "./types";

const email: GridColumn = {
  key: "email",
  type: "string",
  title: "Email",
  sortable: true,
  defaultVisible: true,
  filter: {
    operators: [
      { op: "eq", label: "is" },
      { op: "contains", label: "contains" },
      { op: "isNull", label: "is empty" },
    ],
  },
};

const role: GridColumn = {
  key: "role",
  type: "enum",
  title: "Role",
  sortable: true,
  defaultVisible: true,
  filter: {
    operators: [{ op: "in", label: "in" }],
    enumValues: [{ value: "admin", label: "Admin" }],
  },
};

describe("defaultOp", () => {
  it("prefers contains on a string column", () => {
    expect(defaultOp(email)).toBe("contains");
  });

  it("falls back to the first operator", () => {
    expect(defaultOp(role)).toBe("in");
  });

  it("is empty when the column carries no operators", () => {
    expect(defaultOp({ ...email, filter: undefined })).toBe("");
  });
});

describe("keepsValueShape", () => {
  it("keeps the draft between operators of the same arity", () => {
    expect(keepsValueShape("containsAny", "containsAll")).toBe(true);
    expect(keepsValueShape("between", "notBetween")).toBe(true);
  });

  it("drops it across arities and from no operator", () => {
    expect(keepsValueShape("between", "eq")).toBe(false);
    expect(keepsValueShape("", "eq")).toBe(false);
  });
});

describe("commit guard", () => {
  it("needs a column, an operator and a draft", () => {
    expect(canCommitClause(undefined, "eq", "a")).toBe(false);
    expect(canCommitClause(email, "", "a")).toBe(false);
    expect(canCommitClause(email, "eq", undefined)).toBe(false);
    expect(canCommitClause(email, "eq", "a")).toBe(true);
  });

  it("commits a value-less operator with no draft, as null", () => {
    expect(canCommitClause(email, "isNull", undefined)).toBe(true);
    expect(buildClause(email, "isNull", undefined)).toEqual({
      field: "email",
      op: "isNull",
      value: null,
    });
  });

  it("builds nothing when the guard fails", () => {
    expect(buildClause(email, "eq", undefined)).toBeUndefined();
  });
});

describe("clauseLabel", () => {
  const messages = defaultGridMessages;

  it("resolves the column title and the operator label", () => {
    expect(clauseLabel({ field: "email", op: "contains", value: "a" }, [email], messages, "en-GB")).toBe(
      "Email contains a",
    );
  });

  it("prints a value-less operator without a value", () => {
    expect(clauseLabel({ field: "email", op: "isNull", value: null }, [email], messages, "en-GB")).toBe(
      "Email is empty",
    );
  });

  it("resolves enum labels and joins multi values", () => {
    expect(
      clauseLabel({ field: "role", op: "in", value: ["admin", "guest"] }, [role], messages, "en-GB"),
    ).toBe("Role in Admin, guest");
  });

  it("falls back to the raw field and op for an unknown column", () => {
    expect(clauseLabel({ field: "ghost", op: "eq", value: "x" }, [email], messages, "en-GB")).toBe(
      "ghost eq x",
    );
  });
});
