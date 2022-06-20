require('../mongoose');
const express = require('express');
const Stats = require('../models/stats');
const Person = require('../models/person');

const router = express.Router();

/**
 * Creates a 'DUMMY' data object of general stats:
 * Yesterday sick,total sick, sick people and their category, dead, newly sick, isolated , dose.
 */
router.get('/stats/general', async(req,res)=>{
    try{
        const data = { // Data object for general stats.
            YesterdaySick: 0, totalSick: 0, YesterdayHospitalized: 0, 
            sick: { mild: 0, moderately: 0, ventilated:0 , ECMO:0 , critical: 0},
            vaccinated: {firstDose: 0, secondDose: 0, thirdDose: 0, fourthDose: 0},
             YesterdayTests: { sick: 0, healthy: 0, isolated: 0 },  dead: 0, healthy: 0,isolated: 0 
        };
        const allStats = await Stats.find();
        for(let i = 0; i < allStats.length; i++ ){
            data.dead += allStats[i].dead;
            data.vaccinated.firstDose += allStats[i].vaccinated.firstDose; data.vaccinated.secondDose += allStats[i].vaccinated.secondDose;
            data.vaccinated.thirdDose += allStats[i].vaccinated.thirdDose; data.vaccinated.fourthDose += allStats[i].vaccinated.fourthDose;
            data.sick.mild += allStats[i].sick.mild; data.sick.moderately += allStats[i].sick.moderately; data.sick.ventilated += allStats[i].sick.seriously.ventilated;
            data.sick.ECMO += allStats[i].sick.seriously.ECMO; data.sick.critical += allStats[i].sick.seriously.critical;
            data.totalSick += allStats[i].healthy; data.isolated += allStats[i].isolated;
        }
        data.totalSick = await Person.countDocuments() - data.totalSick;
        const yesterdayStats = await Stats.findOne( {date: (new Date(2022,4,10)).toDateString()} );
        data.YesterdaySick = yesterdayStats.sick.mild + yesterdayStats.sick.moderately + yesterdayStats.sick.seriously.critical + yesterdayStats.sick.seriously.ECMO + yesterdayStats.sick.seriously.ventilated;
        data.YesterdayHospitalized = yesterdayStats.sick.seriously.critical + yesterdayStats.sick.seriously.ECMO + yesterdayStats.sick.seriously.ventilated;

        data.YesterdayTests.sick = data.YesterdaySick; data.YesterdayTests.healthy = yesterdayStats.healthy;
        data.YesterdayTests.isolated = yesterdayStats.isolated;
        res.send( data );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
});

/**
 * Creates a 'DUMMY' data object of last week stats.
 * totalSick, seriouslySick, totalDead and totalTested.
 */
router.get('/stats/last_week', async(req,res)=>{
    try{
        const data = { sick: 0, seriouslySick: 0, dead: 0, tested: 0 };

        for(let i = 0; i < 7; i++){
            const day = new Date(2022,4, 11 - i );  // 2022,4,11 - DUMMY Today date;
            const dailyStat = await Stats.findOne( {date: day.toDateString()} );
            if( !dailyStat )
                return res.status(404).send( {Message: 'Could not find Data.'} );
            const seriousSick = dailyStat.sick.seriously.ECMO + dailyStat.sick.seriously.critical + dailyStat.sick.seriously.ventilated;
            data.sick += dailyStat.sick.mild + dailyStat.sick.moderately + seriousSick;
            data.seriouslySick += seriousSick;
            data.dead += dailyStat.dead; data.tested += dailyStat.people.length;
        }
        res.send( data );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
});

/**
 * Creates a data object of all city stats with vaccination percentage.
 * for each city % of dose 1-4 , active sick people , daily score.
 */
router.get('/stats/city_vaccination', async(req,res)=>{
    try{
        let data = [];
        const cities = ['תל אביב','ראשון לציון','חיפה','באר שבע','חולון','אשדוד','נהריה','רמת גן','אשקלון','בת ים','רמלה'];
        for(let i = 0; i < cities.length; i++ ){
            const cityData = {
                city: cities[i],
                firstDose: (((await Person.find(  {city: cities[i], vaccinated:  { isVaccinated: true, dose: 1} }  )).length / (await Person.find( {city: cities[i]})).length ) * 100).toFixed(2),
                secondDose: (((await Person.find(  {city: cities[i], vaccinated:  { isVaccinated: true, dose: 2} }  )).length / (await Person.find( {city: cities[i]})).length ) * 100).toFixed(2),
                thirdDose:(((await Person.find(  {city: cities[i], vaccinated:  { isVaccinated: true, dose: 3} }  )).length / (await Person.find( {city: cities[i]})).length ) * 100).toFixed(2),
                sick: (await Person.find( { city: cities[i], isAlive: true, "sickness.isSick": true } )).length,
                score: ((await Person.find( { city: cities[i], isAlive: true, "sickness.isSick": true } )).length*10 / (await Person.find( {city: cities[i]})).length).toFixed(1)
            };
            data.push( cityData );
        }
        res.send( data );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
});

/**
 * Creates an array of total sick(mild,moderately, critical) each day in total.
 */
router.get('/stats/sick', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        res.send( stats );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of total daily sick each day in total.
 */
router.get('/stats/daily_sick', async(req,res) => {
    try{
        const stats= await Stats.find().select( ['date','healthy','people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const dailySick = [];
        for(let i = 0; i < stats.length; i++){
            const current = { date: stats[i].date, sick: stats[i].people.length - stats[i].healthy, avg: (stats[i].people.length - stats[i].healthy)*0.85}
            dailySick.push(current);
        }
        res.send( dailySick );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
});

/**
 * Creates an array of weekly avg every few days.
 */
router.get('/stats/weekly_verified_avg', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const weeklyAvg = [];
        for(let i = 0; i < stats.length; i++){
            const current = { sick: stats[i].sick.mild+stats[i].sick.moderately+stats[i].sick.seriously.ECMO
            +stats[i].sick.seriously.ventilated+stats[i].sick.seriously.critical, date: new Date(stats[i].date) }
            weeklyAvg.push(current); }
        res.send( weeklyAvg );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of total dead and daily percent.
 */
router.get('/stats/dead_avg', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','dead','people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const deadAvg = [];
        stats.forEach( stat => { deadAvg.push( { date: stat.date ,dead: stat.dead, percent: parseInt((stat.dead/stat.people.length)*100*.75) } ) } )
        res.send( deadAvg );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of epidemic status and R status.
 */
router.get('/stats/epidemic', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','healthy','people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const epidemic = [];
        stats.forEach( stat => { epidemic.push( {date: stat.date, status: (stat.healthy*2.35 / stat.people.length).toFixed(2)*1 } ) } );
        res.send( epidemic );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of bed hospitalized people and avg.
 */
router.get('/stats/bed_hospitalized', async(req,res) => {
    try{
        const stats = await Stats.find().select( ['date','sick','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const bedHospitalized = [];
        stats.forEach( stat => { bedHospitalized.push( {date:stat.date, bed: stat.sick.seriously.critical + stat.sick.seriously.ECMO+
                        stat.sick.seriously.ventilated, totalBed: 50 } ) } );
        res.send( bedHospitalized );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of verified children by age. 
 */
router.get('/stats/child_verified', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const verifiedChildren = [];
        stats.forEach( stat=> verifiedChildren.push( {date:stat.date,
                        infant: parseInt((stat.sick.seriously.critical + stat.sick.seriously.ECMO+stat.sick.seriously.ventilated
                                + stat.sick.mild + stat.sick.moderately) * 0.1),
                        child: parseInt( (stat.sick.seriously.critical + stat.sick.seriously.ECMO+stat.sick.seriously.ventilated) * 0.07 + 2),
                        kid: parseInt((stat.sick.seriously.critical + stat.sick.seriously.ECMO+stat.sick.seriously.ventilated+ stat.sick.mild ) * 0.15 ),
                        teenager: parseInt((stat.sick.seriously.ventilated + stat.sick.mild + stat.sick.moderately) * 0.06 + 1)
        } ))
        res.send( verifiedChildren );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of isolated children by age. 
 */
router.get('/stats/child_isolated', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','isolated','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const isolatedChildren = [];
        stats.forEach( stat=> { isolatedChildren.push( {date: stat.date, infant: stat.isolated*2, child: parseInt(stat.isolated*0.25)+4,
                    kid: parseInt( stat.isolated*0.45 - 3 ), teenager: parseInt((stat.isolated*3 - 5) / 2) } ) } );
        res.send( isolatedChildren );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of hospitalized children by age. 
 */
 router.get('/stats/child_hospitalized', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick.seriously','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const isolatedChildren = [];
        stats.forEach( stat=> { isolatedChildren.push( { date: stat.date, 
                    infant: ( stat.sick.seriously.ECMO + stat.sick.seriously.critical)*2,
                    child: stat.sick.seriously.ventilated * 3,
                    kid: stat.sick.seriously.critical*2 + 4,
                    teenager: stat.sick.seriously.critical  } )  } );
        res.send( isolatedChildren );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of sick children percent per a city.
 */
router.get('/stats/child_city_percent', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const childPercentCity = [ {city: 'תל אביב',percent: 13 }, {city: 'ראשון לציון',percent: 15},{city: 'חיפה',percent: 20},
        {city: 'באר שבע',percent: 43},{city: 'חולון',percent: 33},{city: 'אשדוד',percent: 18},{city: 'נהריה',percent: 11},
        {city: 'רמת גן',percent: 17},{city: 'אשקלון',percent: 3},{city: 'בת ים',percent: 62}, {city: 'רמלה',percent: 6} ];
        res.send( childPercentCity );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of sick and vaccinated people of senior and others.
 */
router.get('/stats/vaccinated_verified',async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','vaccinated','people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const vaccinatedNVerified = [];
        stats.forEach( (stat) => { vaccinatedNVerified.push( {
            date: stat.date, completelyVaccinated: stat.vaccinated.firstDose +stat.vaccinated.secondDose + stat.vaccinated.thirdDose + stat.vaccinated.fourthDose,
            outdatedVaccinated: stat.vaccinated.firstDose +stat.vaccinated.secondDose + stat.vaccinated.thirdDose,
            notVaccinated: stat.people.length - stat.vaccinated.firstDose +stat.vaccinated.secondDose + stat.vaccinated.thirdDose + stat.vaccinated.fourthDose
        } ) } )
        res.send( vaccinatedNVerified );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of seriously sick of all catagories senior people.
 */
router.get('/stats/senior_seriously_sick', async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick','vaccinated','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const seniorSeriouslySick = [];
        stats.forEach( (stat)=>{ seniorSeriouslySick.push( {
            date: stat.date, vaccinated: parseInt((stat.sick.seriously.ECMO +stat.sick.seriously.ventilated +stat.sick.seriously.critical)*0.54),
            outdatedVaccinated: parseInt((stat.sick.seriously.ECMO +stat.sick.seriously.ventilated)*0.25),
            notVaccinated: parseInt((stat.sick.seriously.ECMO + stat.sick.seriously.ventilated))
        } ) } )
        res.send( seniorSeriouslySick );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of sick people by age.
 */
router.get('/stats/sick_by_age',async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['people','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const sickByAge = [];

        const ages = ['5-11','12-19','20-29','30-39','40-49','50-59','60-69','70-79'];

        const randomPercent = [];
        for(let i = 0; i < 100; i++ )
            randomPercent.push( Math.random() );
        for(let i = 0; i < 8; i++ ){
            sickByAge.push( {
                total: 150,
                age: ages[i],
                vaccinated: parseInt(stats[i].people.length*randomPercent[ parseInt(Math.random()*100) ]),
                outdatedVaccinated:  parseInt(stats[i].people.length*randomPercent[ parseInt(Math.random()*100) ]),
                notVaccinated: parseInt(stats[i].people.length*randomPercent[ parseInt(Math.random()*100) ])
            } )
        }
        res.send( sickByAge );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of daily hospitalized.
 */
router.get('/stats/daily_hospitalized',async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','sick','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const dailyHospitalized = [];
        stats.forEach( (stat)=> {dailyHospitalized.push({
            date: stat.date,
            critical: stat.sick.seriously.critical + stat.sick.seriously.ventilated,
            moderately: stat.sick.seriously.ECMO,
            mild: stat.sick.moderately
        })} )
        res.send( dailyHospitalized );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of daily dead and vaccinated.
 */
router.get('/stats/daily_dead_vaccinated',async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','dead','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const dailyDeadVaccinated = [];
        stats.forEach( (stat)=> {dailyDeadVaccinated.push({
            date: stat.date, vaccinated: parseInt(stat.dead * 0.25 ), outdatedVaccinated: parseInt(stat.dead/2),
            notVaccinated: parseInt(stat.dead)
        })} )
        res.send( dailyDeadVaccinated );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of corona tests.
 */
router.get('/stats/corona_tests',async(req,res)=>{
    try{
        const tests = [ {PCR: 573, Ant: 426} ];
        res.send( tests );
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of isolation reasons.
 */
router.get('/stats/isolation_reasons',async(req,res)=>{
    try{
        const reasons = [ { reason: 'other', value: 53}, {reason: 'touch',value:12},{reason: 'trip', value: 35} ];
        res.send( reasons);
    }
    catch(e){
        res.status(500).send( {Message: 'Server Error'} );
    }
})

/**
 * Creates an array of sick and vaccinated people.
 */
router.get('/stats/sick_vaccinated',async(req,res)=>{
    try{
        const stats = await Stats.find().select( ['date','people','vaccinated','healthy','-_id'] ).lean();
        if( !stats )
            return res.status(404).send( {Message: 'There are no Stats in the DB.' } );
        const sickVaccinatedStats = [];
        stats.forEach( (stat)=> {sickVaccinatedStats.push({
            date: stat.date, sick: (stat.people.length - stat.healthy), 
            vaccinatedPercent: parseInt(((stat.vaccinated.firstDose + stat.vaccinated.secondDose + stat.vaccinated.thirdDose + stat.vaccinated.fourthDose ) / stat.people.length)*100)
        })} )
        res.send( sickVaccinatedStats );
    }
    catch(e){
        console.log(e);
        res.status(500).send( {Message: 'Server Error'} );
    }
})


module.exports = router;