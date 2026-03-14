const { normalizeOpeningHours } = require("./opening-hours");

describe("normalizeOpeningHours", () => {
  test("normalizes legacy string ranges into object windows", () => {
    expect(
      normalizeOpeningHours({
        sunday: ["08:00 - 18:00"],
        monday: ["08:00 - 18:00"],
        tuesday: ["08:00 - 18:00"],
        wednesday: ["08:00 - 18:00"],
        thursday: ["08:00 - 18:00"],
        friday: ["08:00 - 18:00"],
        saturday: ["08:00 - 18:00"],
      })
    ).toEqual({
      sunday: [{ open: "08:00", close: "18:00" }],
      monday: [{ open: "08:00", close: "18:00" }],
      tuesday: [{ open: "08:00", close: "18:00" }],
      wednesday: [{ open: "08:00", close: "18:00" }],
      thursday: [{ open: "08:00", close: "18:00" }],
      friday: [{ open: "08:00", close: "18:00" }],
      saturday: [{ open: "08:00", close: "18:00" }],
    });
  });

  test("returns stable weekday keys and filters invalid windows", () => {
    expect(
      normalizeOpeningHours({
        monday: [{ open: "10:00", close: "20:00" }, { open: "20:00", close: "20:00" }],
        thursday: ["invalid"],
      })
    ).toEqual({
      sunday: [],
      monday: [{ open: "10:00", close: "20:00" }],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    });
  });
});
