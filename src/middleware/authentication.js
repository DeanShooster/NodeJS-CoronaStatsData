const jwt = require('jsonwebtoken');
const Admin = require('../db/models/admin');

const adminAuth = async ( req, res , next ) => {
    try{
        const { token } = req.headers;
        const decoded = await Admin.verifyToken(token);
        req.admin = decoded;
        next();
    }
    catch(e){
        res.status(401).send( {Message: 'No Authentication.'} );
    }
}

module.exports = adminAuth;