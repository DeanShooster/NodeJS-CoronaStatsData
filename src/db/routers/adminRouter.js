require('../mongoose');
const express = require('express');
const adminAuth = require('../../middleware/authentication');
const Admin = require('../models/admin');
const Person = require('../models/person');
const Stats = require('../models/stats');

const router = express.Router();

/**
 * Creates an admin user.
 */
// router.post('/admin/create', async (req,res) => {
//     try{
//         const admin = await new Admin( req.body );
//         await admin.save();
//         res.send( {Message: "Admin created."} );
//     }
//     catch(e){
//         res.status(500).send( {Message: 'Server Error'} );
//     }
// });

/**
 * Creates fictional DB.
 */
router.get('/db/random', async( req,res) => {
    try{
        const people = [];
        const cities = ['תל אביב','ראשון לציון','חיפה','באר שבע','חולון','אשדוד','נהריה','רמת גן','אשקלון','בת ים','רמלה'];
        for(let i = 300; i < 1300; i++){
            const person = { personID: i, fullName: 'Dummy', isMale: Math.floor( Math.random() * 2 ) === 0,city: cities[ Math.floor( Math.random() * cities.length ) ] };

            const date = new Date(2022,4, Math.floor(Math.random() * 11 ) + 1 );
            person.tested = date.toDateString();

            const isAlive = true;
            // const isAlive = Math.floor( Math.random() * 2 ) === 0;
            if( isAlive )  person.isAlive = true;
            else { person.isAlive = false; people.push( person ); continue; }

            const isVaccinated = Math.floor( Math.random() * 2 ) === 0;
            if( isVaccinated )
                person.vaccinated = { isVaccinated, dose: Math.floor( Math.random() * 4 )+1 };
            else
                person.vaccinated = { isVaccinated, dose: null };
            
            const isSick = Math.floor( Math.random() * 2 ) === 0;
            const states = ['Mild','Moderately','Ventilated','ECMO','Critical'];
            if( isSick )
                person.sickness = { isSick, state: states[ Math.floor( Math.random() * states.length )] };
            else
                person.sickness = { isSick, state: null };
            person.isIsolated = Math.floor( Math.random() * 2 ) === 0;

            people.push( person );
        }
        res.send(people);
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error.'} );
    }
});

/**
 * Checks if an admin user is already logged in.
 */
router.get('/admin/login',adminAuth, async(req,res)=>{
    try{
        res.send( true );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error.'} );
    }
});


/**
 * Admin login. ( Creates token and adds to tokens array ).
 */
router.post('/admin/login', async(req,res) => {
    try{
        const admin = await Admin.findOne( req.body );
        if( !admin )
            return res.status(404).send( {Message: 'Invalid Credentials.'} );
        const token = await admin.generateToken();
        return res.send( { token } );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error.'} );
    }
});

/**
 * Admin logout. ( authentication and deletes existing token from array ).
 */
router.post('/admin/logout',adminAuth, async(req,res)=>{
    try{
        const admin = await Admin.findOne( { adminID: req.admin.ID } );
        if( !admin )
            return res.status(404).send( {Message: 'Admin not found.'} );
        for(let i = 0; i < admin.tokens.length; i++ )
            if( admin.tokens[i].token === req.headers.token ){
                admin.tokens.splice(i,1); break;
            }
        await admin.save();
        res.send( {Logout: true} );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error.'} );
    }
});

/**
 * Adds a person to the data base and updates the stats DB according to date.
 */
router.post('/admin/person/add',adminAuth, async(req,res)=>{
    try{
        const person = await new Person( req.body );  await person.save();
        let stats = await Stats.findOne( {date: person.tested} );
        if( !stats )
            stats = await new Stats( {date: person.tested, sick: { seriously: {critical: 0, ECMO: 0, ventilated: 0}, moderately:0,mild:0},
                    vaccinated: {firstDose: 0,secondDose:0,thirdDose:0,fourthDose:0},healthy:0,dead:0,isolated:0, people: [] } );
        stats.people.push( person );
        if( !person.isAlive ) stats.dead ++;
        if( person.isIsolated ) stats.isolated ++;
        if( person.sickness.isSick === false ) stats.healthy ++;
        else{
            switch( person.sickness.state){
                case 'Mild': stats.sick.mild ++; break;
                case 'Moderately': stats.sick.moderately ++; break;
                case 'ECMO': stats.sick.seriously.ECMO ++; break;
                case 'Critical': stats.sick.seriously.critical ++; break;
                case 'Ventilated': stats.sick.seriously.ventilated ++; break;
            }
        }
        if( person.vaccinated.isVaccinated ){
            switch( person.vaccinated.dose ){
                case 1: stats.vaccinated.firstDose ++; break;
                case 2: stats.vaccinated.secondDose ++; break;
                case 3: stats.vaccinated.thirdDose ++; break;
                case 4: stats.vaccinated.fourthDose ++; break;
            }
        }
        await stats.save();
        res.send( person );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error.'});
    }
});

module.exports = router;