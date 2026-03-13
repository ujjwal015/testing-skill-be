const axios = require("axios");

const getAddressUsingLatLng = async (latitude, longitude) => {
  if (
    latitude === undefined ||
    longitude === undefined ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    throw new Error(
      "Both latitude and longitude must be provided and must be numbers."
    );
  }
  const result = await axios.get(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
  );

  if (!result.data?.display_name?.trim()) {
    return "Address not found!";
  }
  return result.data?.display_name;
};

module.exports = getAddressUsingLatLng;
