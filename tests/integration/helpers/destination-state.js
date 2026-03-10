require("./test-env");

const { db } = require("./db");
const { loadSeedData } = require("./seed-data");

const touchedDestinationStates = new Map();

const setDestinationActiveState = async (slug, isActive) => {
  const destination = await db.Destination.findOne({
    where: { slug },
  });

  if (!destination) {
    throw new Error(`Destination ${slug} not found.`);
  }

  if (!touchedDestinationStates.has(destination.id)) {
    touchedDestinationStates.set(destination.id, destination.isActive);
  }

  await destination.update({ isActive });

  return loadSeedData();
};

const restoreDestinationStates = async () => {
  if (!touchedDestinationStates.size) {
    return loadSeedData();
  }

  for (const [destinationId, isActive] of touchedDestinationStates.entries()) {
    await db.Destination.update({ isActive }, { where: { id: destinationId } });
  }

  touchedDestinationStates.clear();

  return loadSeedData();
};

module.exports = {
  restoreDestinationStates,
  setDestinationActiveState,
};
