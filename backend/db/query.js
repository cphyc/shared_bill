var models = require('./models');
var objectId = require('mongoose').Types.ObjectId;
var Q = require('q');
var _ = require('lodash');
var moment = require('moment');

function findById(model, id) {
  return model.findById(id)
  .count()
  .then(function(e) {
    if (e === 1) {
      return true;
    } else {
      throw new Error('Not found');
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
  getTasksDone: function() {
    return models.TaskDone.find({})
    .populate('by', 'name')
    .populate('task')
    .sort('date');
  },
  editTransaction: function(body) {
    var _from = body.transaction.from,
        _to = body.transaction.to,
        _amount,
        _date = body.transaction.date,
        _id = body.transaction._id,
        _note = body.transaction.note,
        _frequency = body.transaction.frequency,
        _endDate = body.transaction.endDate;

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
      _amount = parseFloat(body.transaction.amount);
    }).then(function() {
      // to and from exists, now saving
      var tmp = {
        from: _from,
        to: _to,
        amount: _amount,
        date: _date,
        note: _note,
        frequency: _frequency,
        endDate: _endDate
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
  },
  editUser: function(req) {
    var user = {
      name: req.user.name,
      pwd: req.user.pwd
    };

    if (req.edit) {
      return models.User
        .findByIdAndUpdate(req.user._id, user);
    } else {
      return new models.User(user)
        .save();
    }
  },
  deleteUser: function(user) {
    return models.User
      .findByIdAndRemove(user._id)
      .exec();
  },
  getTasks: function(task) {
    var defered = Q.defer();
    models.Task
    .find({})
    .then(function(tasks) {
      var ret = {};
      // For each task, get the last time it was done and return true if the task
      // need to be redone
      var promises = tasks.map(function(task) {
        return models.TaskDone
        .find({task: task})
        .sort({date: -1})
        .limit(1)
        .then(function(tasksDone) {
          var taskDone = tasksDone[0];

          // decorate the task with the date of the last time it has been done
          var now = moment();
          if (taskDone) {
            var lastTime = moment(taskDone.date);

            var nextTime = moment(lastTime).add(1/task.frequency, 'week');
            var doSoon = moment(nextTime).subtract(2, 'days');
            var doLater = moment(nextTime).subtract(1, 'week');

            var doNextTime = nextTime.toDate();
          } else {
            var lastTime = undefined;
            var doNextTime = moment().toDate();
          }

          taskAsObject = {
            name: task.name,
            frequency: task.frequency,
            nextTime: doNextTime,
            description: task.description,
            lastTime: lastTime,
            _id: task._id,
            points: task.points
          };

          if (!taskDone || doSoon.isBefore(now)){
            return {
              task: taskAsObject,
              doIt: 'soon'
            };
          } else if (doLater.isBefore(now)) {
            return {
              task: taskAsObject,
              doIt: 'later'
            };
          } else {
            return {
              task: taskAsObject,
              doIt: 'nope'
            };
          }
        });
      });

      Q.all(promises).then(function(infos) {
        var soon = [], later = [], nope = [];

        infos.forEach(function(info) {
          if (info.doIt === 'soon') {
            soon.push(info.task);
          } else if (info.doIt === 'later') {
            later.push(info.task);
          } else {
            nope.push(info.task);
          }
        });

        defered.resolve({
          soon: soon,
          later: later,
          nope: nope
        });
      });

    });
    return defered.promise;
  },
  editTask: function(req) {
    var task = {
      name: req.task.name,
      description: req.task.description,
      frequency: req.task.frequency,
      points: req.task.points
    };

    if (req.edit) {
      return models.Task
        .findByIdAndUpdate(req.task._id, task);
    } else {
      return new models.Task(task)
        .save();
    }
  },
  markTaskAsDone: function(req) {
    var defered = Q.defer();
    var taskId = req.task._id;
    var userId = req.by._id;

    models.Task
    .findById(taskId)
    .then(function(task) {
      if (!task) {
        return new Error('task not found');
      } else {
        models.User
        .findById(userId)
        .then(function(user) {
          if (!user) {
            return new Error('user not found');
          } else {
            var taskDone = new models.TaskDone({
              by: user,
              task: task
            }).save()
            .then(defered.resolve, defered.reject);
          }
        });
      }
    });

    return defered.promise;
  }
};
