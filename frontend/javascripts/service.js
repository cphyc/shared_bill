app.service('tasksService', function($http, $rootScope, FREQUENCY_REGEXP) {
  var tmp = {
    add: function(task, edit, successCallback, errorCallback) {
      var matches = task.frequency.toString().match(FREQUENCY_REGEXP);
      task.frequency = (matches[1] || 1) / (matches[3] || 1);
      var data = {
        task: task,
        edit: edit
      };

      $http.post('/api/tasks', data).then(function(reply) {
        $rootScope.$broadcast('updateCleaningTasks');
        (successCallback || function() {})();
      }, function(err) {
        console.log(err);
        (errorCallback || function() {})();
      });
    },
    remove: function() {},
    get: function() {},
    tasks: [],
    update: function() {
      $http.get('/api/tasks').then(function(reply) {
        var tasks = {
          soon:  reply.data.soon,
          later: reply.data.later,
          nope:  reply.data.nope
        };
        tmp.tasks = tasks;

        $rootScope.$broadcast('tasks:updated');
      });
    }
  };

  $rootScope.$on('tasks:update', tmp.update);

  return tmp;
});

app.service('taskDoneService', function($rootScope, $http, usersService, $q) {
  var tmp = {
    add: function(task, by, successCallback, errorCallback) {
      $http.post('/api/task_done', {
        task: task,
        by: by
      }).then(function(response) {
        $rootScope.$broadcast('updateCleaningTasks');
        (successCallback || function() {})();
      }, function(error) {
        console.log(error);
        (errorCallback || function() {})();
      });
    },
    remove: function() {},
    tasksDone: [],
    peopleSummary: [],
    update: function() {
      $http.get('/api/task_done').then(function(taskAnswer) {
        var deferred = $q.defer();

        var unregisterNow = $rootScope.$on('users:updated', function() {
          var users = usersService.users;
          tmp.tasksDone = taskAnswer.data;

          var people = {};
          users.forEach(function(user) {
            people[user._id] = user;
            people[user._id].points = 0;
          });

          tmp.tasksDone.forEach(function(taskDone) {
            if (!people[taskDone.by._id]) {
              console.log('Tâche effectuée par utilisateur absent.');
            } else {
              people[taskDone.by._id].points += taskDone.task.points || 0;
            }
          });

          peopleAsArray = [];
          for (var key in people) {
            peopleAsArray.push(people[key]);
          }

          tmp.peopleSummary = peopleAsArray;
          $rootScope.$broadcast('taskDone:updated');

          deferred.resolve();
        });

        usersService.update();
        
        deferred.promise.then(function() {
          unregisterNow();
        });

      });

    }
  };

  $rootScope.$on('taskDone:update', tmp.update);
  $rootScope.$on('tasks:updated', tmp.update);

  return tmp;
});

app.service('transactionsSimplifierService', function() {
  function createIfAbsent(results, user) {
    if (!results[user._id]) {
      results[user._id] = {
        amount: 0,
        user: user
      };
    }
  }

  return {
    total: function(transactions) {
      var unsimplified = {};
      transactions.forEach(function(transaction, id) {
        transaction.index = id;
        transaction.toAsString = transaction.to
          .map(function(to) { return to.name; })
          .join(', ');
        transaction.fromAsString = transaction.from.name;

        var rawAmount = parseFloat(transaction.amount);
        createIfAbsent(unsimplified, transaction.from);

        // Count the number of occurences
        var count;
        var start = moment(transaction.date),
            end = moment(transaction.endDate),
            now = moment();

        if (end.isAfter(now)) {
          end = now;
        }
        var duration = moment.duration(end - start);

        switch (transaction.frequency) {
          case 'yearly':
            count = Math.round(duration.asYears() + 1);
            break;
          case 'monthly':
            count = Math.round(duration.asMonths() + 1);
            break;
          case 'weekly':
            count = Math.round(duration.asWeeks() + 1);
            break;
          case 'daily':
            count = Math.round(duration.asDays() + 1);
            break;
          default:
            count = 1;
        }

        var amount = rawAmount * count;
        transaction.count = count;
        unsimplified[transaction.from._id].amount = (unsimplified[transaction.from._id].amount) + amount;
        transaction.to.forEach(function(to) {
          createIfAbsent(unsimplified, to);
          unsimplified[to._id].amount = unsimplified[to._id].amount - (amount/transaction.to.length);
        });
      });

      return unsimplified;
    },
    simplified: function(unsimplified) {
      var simplified = [];
      var max = {
        value: 0
      }, min = {
        value : 0
      };

      while (true) {
        max = {
          value: 0
        };
        min = {
          value : 0
        };
        // Find the extremas
        for (var key in unsimplified) {
          if (unsimplified[key].amount - max.value > 1e-14) {
            max.key = key;
            max.value = unsimplified[key].amount;
          } else if (unsimplified[key].amount - min.value < -1e-14) {
            min.key = key;
            min.value = unsimplified[key].amount;
          }
        }

        if (min.value === 0 && max.value === 0) {
          break;
        }

        if (Math.abs(min.value) < Math.abs(max.value)) {
          unsimplified[min.key].amount = 0;
          unsimplified[max.key].amount += min.value;
          simplified.push({
            to: unsimplified[max.key].user.name,
            from: unsimplified[min.key].user.name,
            raw: {
              from: unsimplified[min.key].user,
              to: [unsimplified[max.key].user],
              amount: -min.value,
              note: 'Remboursement',
              date: new Date()
            },
            amount: -min.value
          });
        } else {
          unsimplified[max.key].amount = 0;
          unsimplified[min.key].amount += max.value;
          simplified.push({
            from: unsimplified[min.key].user.name,
            to: unsimplified[max.key].user.name,
            raw: {
              from: unsimplified[min.key].user,
              to: [unsimplified[max.key].user],
              amount: max.value,
              note: 'Remboursement',
              date: new Date()
            },
            amount: max.value
          });
        }
      }

      return simplified;
    }
  };
});

app.service('transactionsService', function($rootScope, $http, transactionsSimplifierService) {
  tmp = {
    add: function(transaction, edit, successCallback, errorCallback) {
      var newTransaction = {
        from: transaction.from._id,
        to: transaction.to.map(function(to) { return to._id; }),
        amount: transaction.amount,
        date: transaction.date,
        note: transaction.note,
        endDate: transaction.endDate,
        frequency: transaction.frequency,
        _id: transaction._id
      };

      $http.post('/api/transactions', {
          edit: edit,
          transaction: newTransaction
        }, { headers: {"Content-Type": 'application/json'} })
      .then(function(response) {
        $rootScope.$broadcast('transactions:update');
        (successCallback || function() {})();
      }, function(response) {
        alert('An error occured', response);
        console.log(response);
        (errorCallback || function() {})();
      });
    },
    delete: function(transaction) {
      $http.delete('/api/transactions', {
        data: transaction,
        headers: {"Content-Type": 'application/json'}
      }).then(function() {
        // Remove the transaction from the transaction list
        $rootScope.$broadcast('transactions:update');
      }, function() {
        console.log('Error while deleting');
      });
    },
    get: function() {},
    transactions: [],
    unsimplified: [],
    simplified: [],
    update: function() {
      $http.get('/api/transactions')
      .then(function(response) {
        var now = moment();

        transactions = response.data;
        shortTransactionList = transactions.filter(function(t) {
          return now.isAfter(moment(t.date));
        });

        tmp.transactions = transactions;
        tmp.unsimplified = transactionsSimplifierService.total(tmp.transactions);
        tmp.simplified = transactionsSimplifierService.simplified(angular.copy(tmp.unsimplified));

        $rootScope.$broadcast('transactions:updated');
      });
    }
  };

  $rootScope.$on('transactions:update', tmp.update);

  return tmp;
});

app.service('usersService', function($http, $rootScope) {
  tmp = {
    users: [],
    update: function() {
      $http.get('/api/users')
      .then(function(reply) {
        tmp.users = reply.data;

        $rootScope.$broadcast('users:updated');
      });
    },
    delete: function(user) {
      $http.delete('/api/users', {
        data: user,
        headers: {'Content-Type': 'application/json'}
      }).then(function() {
        tmp.update();
      }, function() {
        console.log('Error while deleting');
      });
    },
    add: function(user, edit, successCallback, errorCallback) {
      var newUser = {
        name: user.name,
        pwd: user.password,
        _id: user._id
      };

      $http.post('/api/users', {
        edit: edit,
        user: newUser
      }, { headers: {'Content-Type': 'application/json'} })
      .then(function(response) {
        $rootScope.$broadcast('users:update');
        (successCallback || function() {})();
      }, function(error) {
        console.log(error);
        (errorCallback || function() {})();
      });
    }
  };

  $rootScope.$on('users:update', tmp.update);

  return tmp;
});
