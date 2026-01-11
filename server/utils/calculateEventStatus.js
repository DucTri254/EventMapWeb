const calculateEventStatus = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) {
    return 'UPCOMING';
  } else if (now >= start && now <= end) {
    return 'ONGOING';
  } else {
    return 'ENDED';
  }
};

module.exports = { calculateEventStatus };
