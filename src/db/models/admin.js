const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const adminSchema = new mongoose.Schema({
   adminID: { type: String, required: true },
   tokens: [ {
        token: { type: String, required: true }
    }]
});

/**
 * Generates a log in token.
 * @returns encrypted token
 */
adminSchema.methods.generateToken = async function () {
    const token = jwt.sign( { ID: this.adminID }, process.env.PORT, { expiresIn: "1d" } );
    this.tokens = this.tokens.concat( { token } );
    await this.save();
    return token;
};

/**
 * Verifies if token belongs to an admin.
 * @param {Admin Token} token 
 * @returns 
 */
adminSchema.statics.verifyToken = async ( token ) => {
    const decoded = jwt.verify( token, process.env.PORT );
    return decoded;
}

const Admin = mongoose.model('Admin',adminSchema);
module.exports = Admin;