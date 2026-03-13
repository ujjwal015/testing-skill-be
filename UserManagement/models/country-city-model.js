const mongoose = require('mongoose');
const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const countrySchema = new mongoose.Schema({
    name: {
        type: String,
    },
    code: {
        type: String,
    },
    dialcode: {
        type: String,
    },
    currency: {
        code: {
            type: String
        },
        name: { type: String },
        symbol: { type: String },
        native: { type: String }
    },
    statesCount: { type: Number },
    states: [{
        name: { type: String },
        countryCode: { type: String },
        fipsCode: { type: String },
        iso: { type: String },
        latitude: { type: String },
        longitude: { type: String },
        citiesCount: { type: String },
        districtCount: { type: String },
        district: { type: Array, default: [] },
        cities: [{
            name: { type: String },
            latitude: { type: String },
            longitude: { type: String },
        }]

    }]
}, { timestamps: true });

const country = mongoose.model('countryDetails', countrySchema);
module.exports.CountryState = country;
