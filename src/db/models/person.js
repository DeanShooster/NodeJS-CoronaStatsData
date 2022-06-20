const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
    tested: { type: String },
    personID: { type: Number , unique: true},
    fullName: { type: String },
    isMale: { type: Boolean },
    city: { type: String },
    vaccinated: { isVaccinated: { type: Boolean }, dose: { type: Number } },
    sickness: { isSick: { type: Boolean }, state: { type: String } },
    isIsolated: { type: Boolean },
    isAlive: { type: Boolean }
});

const Person = mongoose.model('Person',personSchema);
module.exports = Person;