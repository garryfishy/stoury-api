const openingHours = {
  daily0900to1700: {
    monday: [{ open: "09:00", close: "17:00" }],
    tuesday: [{ open: "09:00", close: "17:00" }],
    wednesday: [{ open: "09:00", close: "17:00" }],
    thursday: [{ open: "09:00", close: "17:00" }],
    friday: [{ open: "09:00", close: "17:00" }],
    saturday: [{ open: "09:00", close: "17:00" }],
    sunday: [{ open: "09:00", close: "17:00" }]
  },
  daily0800to1800: {
    monday: [{ open: "08:00", close: "18:00" }],
    tuesday: [{ open: "08:00", close: "18:00" }],
    wednesday: [{ open: "08:00", close: "18:00" }],
    thursday: [{ open: "08:00", close: "18:00" }],
    friday: [{ open: "08:00", close: "18:00" }],
    saturday: [{ open: "08:00", close: "18:00" }],
    sunday: [{ open: "08:00", close: "18:00" }]
  },
  daily1000to2200: {
    monday: [{ open: "10:00", close: "22:00" }],
    tuesday: [{ open: "10:00", close: "22:00" }],
    wednesday: [{ open: "10:00", close: "22:00" }],
    thursday: [{ open: "10:00", close: "22:00" }],
    friday: [{ open: "10:00", close: "22:00" }],
    saturday: [{ open: "10:00", close: "22:00" }],
    sunday: [{ open: "10:00", close: "22:00" }]
  },
  alwaysOpen: {
    monday: [{ open: "00:00", close: "23:59" }],
    tuesday: [{ open: "00:00", close: "23:59" }],
    wednesday: [{ open: "00:00", close: "23:59" }],
    thursday: [{ open: "00:00", close: "23:59" }],
    friday: [{ open: "00:00", close: "23:59" }],
    saturday: [{ open: "00:00", close: "23:59" }],
    sunday: [{ open: "00:00", close: "23:59" }]
  }
};

module.exports = {
  openingHours
};
