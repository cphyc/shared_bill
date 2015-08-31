var models = require('./models');
var objectId = require('mongoose').Types.ObjectId;
var Q = require('q');
var _ = require('lodash');

function findById(model, id) {
  var objId = new objectId(id);

  return model.findOne({_id: objId})
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
    return models.User.find({}, 'name');
  },
  getTransactions: function() {
    return models.Transaction.find({})
    .populate('from', 'name')
    .populate('to', 'name');
  },
  saveTransaction: function(transaction) {
    var _from = transaction.from,
        _to = transaction.to,
        _amount,
        _date = transaction.date;

    var defered = Q.defer();

    // check that the receiver exists
    findById(models.User, _from)
    .then(function() {
      // Check that the debtors exist
      return Q.all(_to.map(function(to) {
        return findById(models.User, to);
      }))
    }).then(function() {
      // Convert the amount into an into
      _amount = parseInt(transaction.amount);
    }).then(function() {
      // to and from exists, now saving
      var tmp = {
        from: _from,
        to: _to,
        amount: _amount,
        date: _date
      };

      var transaction = new models.Transaction(tmp);
      transaction.save(function(err) {
        if (err) {
          throw new Error("Error while saving transaction", err);
        } else {
          defered.resolve();
        }
      });
    }).catch(function(errs) {
        defered.reject(errs)
    });
    return defered.promise;
  }
};
