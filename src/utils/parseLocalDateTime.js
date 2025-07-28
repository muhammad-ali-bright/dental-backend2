// utils/parseLocalDateTime.js
exports.parseLocalDateTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number); // Expects 'YYYY-MM-DD'
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    // ⚠️ JS Date month is 0-based
    return new Date(year, month - 1, day, hours, minutes);
};
