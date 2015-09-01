var models = require('./models');
var objectId = require('mongoose').Types.ObjectId;
var Q = require('q');
var _ = require('lodash');

function findById(model, id) {
  return model.findById(id)
  .then(function(result) {
    if (!result) {
      throw new Error('Not found');
    } else {
      return result[0];
    }
  });
}

module.exports = {
  getUsers: function() {
    return models.User
      .find({}, 'name')
      .sort('name');
  },
  getTransactions: function() {
    return models.Transaction.find({})
    .populate('from', 'name')
    .populate('to', 'name')
    .sort('date');
  },
  editTransaction: function(body) {
    var _from = body.transaction.from,
        _to = body.transaction.to,
        _amount,
        _date = body.transaction.date,
        _id = body.transaction._id;

    var defered = Q.defer();

    // check that the receiver exists
    findById(models.User, _from)
    .then(function() {
      // Check that the debtors exist
      return Q.all(_to.map(function(to) {
        return findById(models.User, to);
      }));
    }).then(function() {
      // Convert the amount into an into
      _amount = parseInt(body.transaction.amount);
    }).then(function() {
      // to and from exists, now saving
      var tmp = {
        from: _from,
        to: _to,
        amount: _amount,
        date: _date
      };
      var transaction;

      if (body.edit) {
        transaction = models.Transaction
          .findByIdAndUpdate(_id, tmp);
      } else {
        transaction = new models.Transaction(tmp)
          .save();
      }

      transaction.then(function() {
        defered.resolve();
      }, function(err) {
        defered.reject(err);
      });
    }).catch(function(errs) {
        defered.reject(errs)
    });
    return defered.promise;
  },
  deleteTransaction: function(transaction) {
    return models.Transaction
      .findByIdAndRemove(transaction._id)
      .exec();
  }
};
