const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
    date: { type: String },
    sick: { 
        seriously: {
            critical: { type: Number },
            ECMO: { type: Number },
            ventilated: { type: Number }
        },
        moderately: { type: Number },
        mild: { type: Number }
    },
    vaccinated: { 
        firstDose: { type: Number },
        secondDose: { type: Number },
        thirdDose: { type: Number },
        fourthDose: { type: Number }
    },
    healthy: { type: Number },
    dead: { type: Number },
    isolated: { type: Number},
    people: [{
        person: { type: mongoose.Schema.Types.ObjectId }
    }]
});

const Stats = mongoose.model('Stats',statsSchema);
module.exports = Stats;