function convertToLocalTime(date, offsetHours) {
  return new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
}

module.exports = { convertToLocalTime };
