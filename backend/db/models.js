var mongoose = require('mongoose');
var config = require('../config');

mongoose.connect('mongodb://' + config.db.host + '/' + config.db.collection);

module.exports = {
  Transaction: mongoose.model('Transaction', mongoose.Schema({
    from: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    to: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    amount: Number,
    date: Date,
    note: String,
    frequency: {type: String, enum: ['yearly', 'monthly', 'weekly', 'dayly']},
    endDate: Date
  })),
  User: mongoose.model('User', mongoose.Schema({
    name: String,
    pwd: String
  }))
};
