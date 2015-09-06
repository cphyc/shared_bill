var mongoose = require('mongoose');
var config = require('../config');

mongoose.connect('mongodb://' + config.db.host + '/' + config.db.collection);

models = {
  Transaction: mongoose.model('Transaction', mongoose.Schema({
    from: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    to: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    amount: {type: Number, min: 0},
    date: Date,
    note: String,
    frequency: {type: String, enum: ['yearly', 'monthly', 'weekly', 'dayly']},
    endDate: Date
  })),
  User: mongoose.model('User', mongoose.Schema({
    name: String,
    pwd: String
  })),
  Task: mongoose.model('Task', mongoose.Schema({
    name: String,
    frequency: Number,
    description: String
  })),
  TaskDone: mongoose.model('TaskDone', mongoose.Schema({
    by: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    task: {type: mongoose.Schema.Types.ObjectId, ref:'Task'},
    date: {type: Date, default: Date.now}
  }))
};

module.exports = models;
