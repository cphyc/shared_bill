'use strict';

var app = angular.module('transactions', ['ngRoute', 'ui.bootstrap', 'isteven-multi-select', 'angularMoment']);

app.run(function(amMoment) {
    amMoment.changeLocale('fr');
});

app.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/transactions.html',
      controller: 'transactionsController'
    })
    .when('/transactions', {
      templateUrl: 'partials/transactions.html',
      controller: 'transactionsController'
    })
    .when('/add', {
      templateUrl: 'partials/add.html',
      controller: 'addController'
    })
    .when('/users', {
      templateUrl: 'partials/users.html',
      controller: 'userController'
    })
    .when('/cleaningTasks', {
      templateUrl: 'partials/cleaning_tasks.html',
      controller: 'cleaningTasksController'
    })
});

app.controller('homeController', function($scope, $rootScope, $modal) {
   function editTransaction(transaction, action) {
    var newScope = $rootScope.$new();
    newScope.transaction = transaction;
    if (action === 'edit') {
      newScope.edit = true;
    } else if (action === 'create') {
      newScope.edit = false;
    } else {
      console.log('Unknown action', action);
    }
    newScope.modal = {
      title: newScope.edit ? 'Edit transaction' : 'New transaction'
    }

    $modal.open({
      templateUrl: 'partials/transaction_add.html',
      scope: newScope,
      controller: 'addTransactionController'
    });
  }

  $scope.editTransaction = function(transaction) {
    editTransaction(transaction, 'edit');
  };
  $scope.createTransaction = function(transaction) {
    editTransaction(transaction, 'create');
  }

  function editUser(user, action) {
    var newScope = $rootScope.$new();
    newScope.user = user;
    if (action === 'edit') {
      newScope.edit = true;
    } else if (action === 'create') {
      newScope.edit = false;
    } else {
      console.log('Unknown action', action);
    }

    newScope.modal = {
      title: newScope.edit ? 'Edit user' : 'New user'
    }

    $modal.open({
      templateUrl: 'partials/user_add.html',
      scope: newScope,
      controller: 'addUserController'
    });
  };

  $scope.editUser = function(user) {
    editUser(user, 'edit');
  };
  $scope.createUser = function(user) {
    editUser(user, 'create');
  };

  $scope.markTaskAsDone = function(task) {
    var newScope = $rootScope.$new();
    newScope.task = task;

    newScope.modal = {
      title: 'Marquer la tâche comme réalisée'
    };

    $modal.open({
      templateUrl: 'partials/cleaning_done.html',
      scope: newScope,
      controller: 'taskDoneController'
    });
  }
});

app.controller('transactionsController', function($scope, $http, $rootScope) {
  $scope.showAllTransactions = false;
  var transactions = [];
  var shortTransactionList = [];
  $scope.shownTransactions = transactions;

  $scope.showTransactions = function(what) {
    if (what === 'all') {
      $scope.showAllTransactions = true;
      $scope.shownTransactions = transactions;
    } else if (what === 'past'){
      $scope.showAllTransactions = false;
      $scope.shownTransactions = shortTransactionList;
    } else {
      console.log('error');
    }

  }

  function createIfAbsent(results, user) {
    if (!results[user._id]) {
      results[user._id] = {
        amount: 0,
        user: user
      }
    }
  }

  $scope.transactions = [];

  $scope.updateResults = function() {
    $http.get('/api/transactions')
    .then(function(response) {
      var now = moment();

      transactions = response.data;
      shortTransactionList = transactions.filter(function(t) {
        return now.isAfter(moment(t.date));
      });
      $scope.showTransactions('past');
      $scope.simplified = [];

      var results = {};
      transactions.forEach(function(transaction) {
        transaction.toAsString = transaction.to
          .map(function(to) { return to.name; })
          .join(', ');
        transaction.fromAsString = transaction.from.name;

        var rawAmount = parseFloat(transaction.amount);
        createIfAbsent(results, transaction.from);

        // Count the number of occurences
        var count;
        var start = moment(transaction.date), end = moment(transaction.endDate);

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
            break
          default:
            count = 1;
        }

        var amount = rawAmount * count;
        transaction.count = count;
        results[transaction.from._id].amount = (results[transaction.from._id].amount) + amount;
        transaction.to.forEach(function(to) {
          createIfAbsent(results, to);
          results[to._id].amount = results[to._id].amount - (amount/transaction.to.length);
        });
      });

      $scope.results = angular.copy(results);

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
        for (var key in results) {
          if (results[key].amount - max.value > 1e-14) {
            max.key = key;
            max.value = results[key].amount;
          } else if (results[key].amount - min.value < -1e-14) {
            min.key = key;
            min.value = results[key].amount;
          }
        }

        if (min.value === 0 && max.value === 0) {
          break;
        }

        if (Math.abs(min.value) < Math.abs(max.value)) {
          results[min.key].amount = 0;
          results[max.key].amount += min.value;
          $scope.simplified.push({
            to: results[max.key].user.name,
            from: results[min.key].user.name,
            raw: {
              from: results[min.key].user,
              to: [results[max.key].user],
              amount: -min.value,
              note: 'Remboursement',
              date: new Date()
            },
            amount: -min.value
          });
        } else {
          results[max.key].amount = 0;
          results[min.key].amount += max.value;
          $scope.simplified.push({
            from: results[min.key].user.name,
            to: results[max.key].user.name,
            raw: {
              from: results[min.key].user,
              to: [results[max.key].user],
              amount: max.value,
              note: 'Remboursement',
              date: new Date()
            },
            amount: max.value
          });
        }
      }
    });
  }

  $scope.updateResults();
  $rootScope.$on('updateResults', function() { $scope.updateResults(); });

  $scope.deleteTransaction = function(transaction) {
    $http.delete('/api/transactions', {
      data: transaction,
      headers: {"Content-Type": 'application/json'}
    }).then(function() {
      // Remove the transaction from the transaction list
      var index = transactions.indexOf(transaction);
      if (index > -1) {
        transactions.splice(index, 1);
        $scope.updateResults();
      }
    }, function() {
      console.log('Error while deleting');
    });

  }
});

app.controller('addTransactionController', function($scope, $http, $rootScope) {
  if (!$scope.transaction) {
    $scope.transaction = {
      date: new Date()
    }
  } else {
    // reformat string
    $scope.transaction.date = new Date($scope.transaction.date);
    $scope.isRecurrent = $scope.transaction.frequency;
  }

  $http.get('/api/users').then(function(response) {
    var people = response.data;
    // Select all of them by default
    var toIds = ($scope.transaction.to || []).map(function(to) {
      return to._id;
    });
    people.forEach(function(p) {
      if (toIds.length > 0) {
        p.ticked = toIds.indexOf(p._id) > -1;
      } else {
        p.ticked = true;
      }
    });
    $scope.people = people;
  });

  $scope.submit = function(transaction, edit, successCallback, errorCallback) {
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
      $rootScope.$broadcast('updateResults');
      (successCallback || function() {})();
    }, function(response) {
      alert('An error occured', response);
      console.log(response);
      (errorCallback || function() {})();
    });
  }
});

app.controller('userController', function($scope, $http, $rootScope) {
  function updateUsers() {
    $http.get('/api/users')
    .then(function(reply) {
      $scope.users = reply.data;
    });
  }

  $scope.deleteUser = function(user) {
    $http.delete('/api/users', {
      data: user,
      headers: {'Content-Type': 'application/json'}
    }).then(function() {
      updateUsers();
    }, function() {
      console.log('Error while deleting');
    });
  }

  updateUsers();

  $rootScope.$on('updateUsers', updateUsers);
});

app.controller('addUserController', function($scope, $http, $rootScope) {
  $scope.submit = function(user, edit, successCallback, errorCallback) {
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
      $rootScope.$broadcast('updateUsers');
      (successCallback || function() {})();
    }, function(error) {
      console.log(error);
      (errorCallback || function() {})();
    });
  }
});

app.filter('fraction', function() {
  return function(input) {
    input = parseFloat(input);
    if (input < 1) {
      return '1/' + Math.round(1/input);
    } else {
      return input;
    }
  };
});

app.controller('cleaningTasksController', function($scope, $http, $rootScope, $modal) {
  function updateTasks() {
    $http.get('/api/tasks').then(function(reply) {
      function mapFunction(task) {

        return task;
      }
      var tasks = {
        soon: reply.data.soon.map(mapFunction),
        later: reply.data.later.map(mapFunction),
        nope: reply.data.nope.map(mapFunction)
      };
      $scope.tasks = tasks;
    });
  }

  updateTasks();

  $rootScope.$on('updateCleaningTasks', function() {
    updateTasks();
  });

  var editTask = function(task, edit) {
    var newScope = $rootScope.$new();
    newScope.edit = edit;
    newScope.task = task;
    newScope.modal = {
      title: 'Créer nouvelle tâche'
    };

    $modal.open({
      scope: newScope,
      templateUrl: 'partials/new_task.html',
      controller: 'newTaskController'
    });
  }

  $scope.editTask = function(task) {
    editTask(task, true);
  };
  $scope.newTask = function() {
    editTask(null, false);
  }
});

var FREQUENCY_REGEXP = /^(\d+)$|^(1\/(\d+))$/; // matchs integers or fractions in the form 1/x

app.controller('newTaskController', function($scope, $http, $rootScope) {
  $scope.submit = function(task, edit, successCallback, errorCallback) {
    var matches = task.frequency.match(FREQUENCY_REGEXP);
    task.frequency = (matches[1] || 1) / (matches[3] || 1);
    var data = {
      task: task,
      edit: edit
    }
    $http.post('/api/tasks', data).then(function(reply) {
      $rootScope.$broadcast('updateCleaningTasks');
      (successCallback || function() {})();
    }, function(err) {
      console.log(err);
      (errorCallback || function() {})();
    });
  };
});

app.directive('frequency', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.frequency = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be invalid
          return false;
        }

        if (INTEGER_REGEXP.test(viewValue)) {
          // it is valid
          return true;
        }

        // it is invalid
        return false;
      };
    }
  };
});

app.controller('taskDoneController', function($scope, $http, $rootScope) {
  $http.get('/api/users')
  .then(function(reply) {
    $scope.people = reply.data;
  });

  $scope.submit = function(task, by, successCallback, errorCallback) {
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
  }
});
