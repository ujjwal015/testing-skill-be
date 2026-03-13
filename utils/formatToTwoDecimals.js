const formatToTwoDecimals = (value) => {
    if(value !== 0 && (!value || value === "" || Number.isNaN(Number(value)))) {
        return value;
    }
    
    value = Number(value);
    if (!Number.isInteger(value)) {
        return value.toFixed(2);
    }
    return value;
}

module.exports = {formatToTwoDecimals};
